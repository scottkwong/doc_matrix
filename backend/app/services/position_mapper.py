"""Position mapping service for document citations.

Handles translating between extracted text positions and original document
visual coordinates. Critical for maintaining citation accuracy when extraction
methods evolve or improve over time.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from .storage import StorageManager


@dataclass
class PositionMapping:
    """Maps a position in extracted text to original document coordinates.
    
    Attributes:
        text_char: Character position in extracted text.
        pdf_page: Page number in PDF (1-indexed).
        pdf_bbox: Bounding box [x1, y1, x2, y2] if available.
        search_text: Nearby text for fallback search.
        line_number: Line number in extracted text if applicable.
    """
    
    text_char: int
    pdf_page: int
    pdf_bbox: Optional[List[float]] = None
    search_text: str = ""
    line_number: Optional[int] = None


@dataclass
class PDFLocation:
    """Result of translating text position to PDF coordinates.
    
    Attributes:
        page: PDF page number (1-indexed).
        bbox: Bounding box [x1, y1, x2, y2] if available.
        search_text: Text to search for in PDF if bbox unavailable.
        confidence: Confidence level (high, medium, low).
    """
    
    page: int
    bbox: Optional[List[float]] = None
    search_text: str = ""
    confidence: str = "medium"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "page": self.page,
            "bbox": self.bbox,
            "search_text": self.search_text,
            "confidence": self.confidence,
        }


class PositionMapper:
    """Service for translating text positions to document coordinates.
    
    Maintains mappings between extracted text and original document
    coordinates, enabling accurate citation display regardless of
    extraction method changes.
    
    Attributes:
        storage: Storage manager for cache operations.
    """
    
    def __init__(self, storage: StorageManager) -> None:
        """Initialize position mapper.
        
        Args:
            storage: Storage manager instance.
        """
        self.storage = storage
    
    def create_mapping_for_pdf(
        self,
        filename: str,
        pages: List[Dict[str, Any]],
        full_text: str
    ) -> List[PositionMapping]:
        """Create position mappings during PDF extraction.
        
        Generates sampling points throughout the document that map
        extracted text positions to PDF page coordinates.
        
        Args:
            filename: Name of the PDF file.
            pages: List of page dictionaries with text and char positions.
            full_text: Complete extracted text.
            
        Returns:
            List of position mappings.
        """
        mappings: List[PositionMapping] = []
        
        # Sample every N characters for efficient but accurate mapping
        sample_interval = 500  # Sample every 500 chars
        
        for page_info in pages:
            page_num = page_info.get("page", 1)
            page_text = page_info.get("text", "")
            char_start = page_info.get("char_start", 0)
            char_end = page_info.get("char_end", 0)
            
            # Create mappings at regular intervals within this page
            for char_pos in range(char_start, char_end, sample_interval):
                if char_pos >= len(full_text):
                    break
                
                # Extract context for fallback search
                context_start = max(0, char_pos - 50)
                context_end = min(len(full_text), char_pos + 50)
                search_text = full_text[context_start:context_end].strip()
                
                mapping = PositionMapping(
                    text_char=char_pos,
                    pdf_page=page_num,
                    pdf_bbox=None,  # Basic PyPDF2 doesn't provide bbox
                    search_text=search_text[:100],  # Limit length
                )
                mappings.append(mapping)
        
        # Always include start and end of each page
        for page_info in pages:
            page_num = page_info.get("page", 1)
            char_start = page_info.get("char_start", 0)
            char_end = page_info.get("char_end", 0)
            
            # Start of page
            if char_start < len(full_text):
                context_end = min(len(full_text), char_start + 100)
                search_text = full_text[char_start:context_end].strip()
                mappings.append(PositionMapping(
                    text_char=char_start,
                    pdf_page=page_num,
                    search_text=search_text[:100],
                ))
            
            # End of page
            if char_end > 0 and char_end <= len(full_text):
                context_start = max(0, char_end - 100)
                search_text = full_text[context_start:char_end].strip()
                mappings.append(PositionMapping(
                    text_char=char_end,
                    pdf_page=page_num,
                    search_text=search_text[:100],
                ))
        
        # Sort by character position
        mappings.sort(key=lambda m: m.text_char)
        
        return mappings
    
    def translate_to_pdf_coords(
        self,
        filename: str,
        char_start: int,
        char_end: int,
        extraction_version: str = "1.0",
        full_text: Optional[str] = None
    ) -> PDFLocation:
        """Translate extracted text positions to PDF coordinates.
        
        Uses cached position mappings to find the corresponding PDF
        page and bounding box for a given text range.
        
        Args:
            filename: Name of the PDF file.
            char_start: Starting character position in extracted text.
            char_end: Ending character position in extracted text.
            extraction_version: Version of extraction to use.
            full_text: Full extracted text (optional, loaded if needed).
            
        Returns:
            PDFLocation with page, bbox, and search text.
        """
        # Load cache for this extraction version
        cache_path = self.storage.get_cache_path(filename)
        if not cache_path.exists():
            # Fallback: just return page 1
            return PDFLocation(
                page=1,
                search_text="",
                confidence="low"
            )
        
        cached = self.storage.read_json(cache_path)
        if not cached:
            return PDFLocation(page=1, confidence="low")
        
        # Get position mappings
        mappings_data = cached.get("position_mappings", [])
        if not mappings_data:
            # No mappings available, use page boundaries
            return self._fallback_page_lookup(cached, char_start)
        
        # Convert to PositionMapping objects
        mappings = [
            PositionMapping(
                text_char=m.get("text_char", 0),
                pdf_page=m.get("pdf_page", 1),
                pdf_bbox=m.get("pdf_bbox"),
                search_text=m.get("search_text", ""),
            )
            for m in mappings_data
        ]
        
        # Find the closest mapping point before char_start
        best_mapping = self._find_closest_mapping(mappings, char_start)
        
        if not best_mapping:
            return self._fallback_page_lookup(cached, char_start)
        
        # Get search text from the actual citation range
        if not full_text:
            full_text = cached.get("text", "")
        
        citation_text = full_text[char_start:char_end] if full_text else ""
        
        # Create result with context
        return PDFLocation(
            page=best_mapping.pdf_page,
            bbox=best_mapping.pdf_bbox,
            search_text=citation_text[:200],  # Use citation text for search
            confidence="high" if best_mapping.pdf_bbox else "medium"
        )
    
    def _find_closest_mapping(
        self,
        mappings: List[PositionMapping],
        target_char: int
    ) -> Optional[PositionMapping]:
        """Find the closest mapping point before target position.
        
        Args:
            mappings: List of position mappings.
            target_char: Target character position.
            
        Returns:
            Closest mapping before target, or None.
        """
        if not mappings:
            return None
        
        # Find mapping with text_char <= target_char, closest to it
        valid_mappings = [m for m in mappings if m.text_char <= target_char]
        
        if not valid_mappings:
            # No mappings before target, use first mapping
            return mappings[0]
        
        # Return the closest one
        return max(valid_mappings, key=lambda m: m.text_char)
    
    def _fallback_page_lookup(
        self,
        cached: Dict[str, Any],
        char_pos: int
    ) -> PDFLocation:
        """Fallback method using page boundaries.
        
        Args:
            cached: Cached document data.
            char_pos: Character position to locate.
            
        Returns:
            PDFLocation with page estimate.
        """
        pages = cached.get("pages", [])
        
        for page_info in pages:
            if page_info["char_start"] <= char_pos < page_info["char_end"]:
                return PDFLocation(
                    page=page_info.get("page", 1),
                    bbox=None,
                    search_text="",
                    confidence="low"
                )
        
        # Default to page 1
        return PDFLocation(page=1, bbox=None, confidence="low")
    
    def find_in_pdf_by_text(
        self,
        filename: str,
        search_text: str
    ) -> Optional[PDFLocation]:
        """Fallback: Search for text in original PDF.
        
        Used when position mapping fails. Searches the PDF
        for the given text and returns approximate location.
        
        Args:
            filename: Name of the PDF file.
            search_text: Text to search for.
            
        Returns:
            PDFLocation if found, None otherwise.
        """
        # This is a fallback strategy that would use PyPDF2
        # to search through pages for the text
        # For now, return None (not implemented)
        return None


