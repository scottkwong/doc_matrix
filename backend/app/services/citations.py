"""Citation parsing and resolution service.

Handles extracting citation markers from LLM responses and resolving them
to specific locations in source documents. Citations are a first-class
citizen throughout the application.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from .documents import DocumentProcessor


@dataclass
class Citation:
    """Represents a citation to a source document.
    
    Attributes:
        id: Unique identifier for this citation.
        source_file: Name of the source document.
        text: The exact quoted text from the source.
        page: Page number (or sheet name for spreadsheets).
        char_start: Starting character position in the document.
        char_end: Ending character position in the document.
        context: Surrounding text for display.
        extraction_version: Version of extraction this citation references.
        extraction_method: Method used for extraction.
        pdf_mapping: Optional PDF coordinates for direct navigation.
    """
    
    id: str
    source_file: str
    text: str
    page: Any  # Can be int or str (for sheet names)
    char_start: int
    char_end: int
    context: str = ""
    extraction_version: str = "1.0"
    extraction_method: str = "pypdf2_basic"
    pdf_mapping: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert citation to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "source_file": self.source_file,
            "text": self.text,
            "page": self.page,
            "char_start": self.char_start,
            "char_end": self.char_end,
            "context": self.context,
            "extraction_version": self.extraction_version,
            "extraction_method": self.extraction_method,
            "pdf_mapping": self.pdf_mapping,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Citation":
        """Create citation from dictionary."""
        return cls(
            id=data.get("id", str(uuid.uuid4())[:8]),
            source_file=data["source_file"],
            text=data["text"],
            page=data.get("page", 1),
            char_start=data.get("char_start", 0),
            char_end=data.get("char_end", 0),
            context=data.get("context", ""),
            extraction_version=data.get("extraction_version", "1.0"),
            extraction_method=data.get("extraction_method", "pypdf2_basic"),
            pdf_mapping=data.get("pdf_mapping"),
        )


@dataclass
class ParsedResponse:
    """LLM response with extracted citations.
    
    Attributes:
        text: The response text with citation markers replaced by IDs.
        citations: List of extracted citations.
        raw_text: Original response text before processing.
    """
    
    text: str
    citations: List[Citation] = field(default_factory=list)
    raw_text: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "text": self.text,
            "citations": [c.to_dict() for c in self.citations],
        }


class CitationParser:
    """Parses and resolves citations from LLM responses.
    
    The LLM is prompted to include citations in a specific format:
    [[cite:"quoted text"]] or [[cite:start_char:end_char]]
    
    This parser extracts these markers, validates them against the source
    document, and returns a structured response with citation objects.
    
    Attributes:
        doc_processor: Document processor for text lookup.
    """
    
    # Pattern for quote-based citations: [[cite:"some quoted text"]]
    QUOTE_PATTERN = re.compile(
        r'\[\[cite:"([^"]+)"\]\]',
        re.IGNORECASE
    )
    
    # Pattern for position-based citations: [[cite:123:456]]
    POSITION_PATTERN = re.compile(
        r'\[\[cite:(\d+):(\d+)\]\]',
        re.IGNORECASE
    )
    
    # Pattern for inline superscript references: [1], [2], etc.
    SUPERSCRIPT_PATTERN = re.compile(r'\[(\d+)\]')
    
    def __init__(self, doc_processor: DocumentProcessor) -> None:
        """Initialize citation parser.
        
        Args:
            doc_processor: Document processor for resolving citations.
        """
        self.doc_processor = doc_processor
    
    def _get_extraction_metadata(
        self, 
        source_file: str
    ) -> Tuple[str, str]:
        """Get extraction method and version for a document.
        
        Args:
            source_file: Name of the source document.
            
        Returns:
            Tuple of (extraction_method, extraction_version).
        """
        try:
            doc_data = self.doc_processor.get_document_text(source_file)
            method = doc_data.get("extraction_method", "pypdf2_basic")
            version = doc_data.get("extraction_version", "1.0")
            return (method, version)
        except Exception:
            # Fallback to defaults
            return ("pypdf2_basic", "1.0")
    
    def get_citation_prompt(self, filename: str) -> str:
        """Get the prompt instructions for citation format.
        
        Args:
            filename: Name of the source document.
            
        Returns:
            Prompt text instructing the LLM on citation format.
        """
        return f'''When answering, cite specific passages from the document.
Use this exact format for citations: [[cite:"exact quoted text"]]

For example:
The report indicates growth [[cite:"revenue increased by 15%"]] in Q3.

IMPORTANT:
- Quote the EXACT text from the document, character-for-character
- Keep quotes concise (under 100 characters when possible)
- Include citations for all factual claims from the document
- Source document: {filename}'''
    
    def parse_response(
        self,
        response_text: str,
        source_file: str,
    ) -> ParsedResponse:
        """Parse LLM response and extract citations.
        
        Args:
            response_text: Raw response text from the LLM.
            source_file: Name of the source document.
            
        Returns:
            ParsedResponse with text and resolved citations.
        """
        citations: List[Citation] = []
        processed_text = response_text
        citation_counter = 1
        
        # Get extraction metadata for this document
        extraction_method, extraction_version = self._get_extraction_metadata(
            source_file
        )
        
        # First, extract quote-based citations
        for match in self.QUOTE_PATTERN.finditer(response_text):
            quoted_text = match.group(1)
            
            # Try to find this text in the document
            location = self.doc_processor.find_text_location(
                source_file, quoted_text
            )
            
            citation_id = f"cite_{citation_counter}"
            
            if location:
                context = self.doc_processor.get_context_around(
                    source_file,
                    location["char_start"],
                    location["char_end"],
                    context_chars=150
                )
                
                citation = Citation(
                    id=citation_id,
                    source_file=source_file,
                    text=quoted_text,
                    page=location["page"],
                    char_start=location["char_start"],
                    char_end=location["char_end"],
                    context=context,
                    extraction_version=extraction_version,
                    extraction_method=extraction_method,
                )
            else:
                # Citation text not found - still include but mark as unverified
                citation = Citation(
                    id=citation_id,
                    source_file=source_file,
                    text=quoted_text,
                    page=0,
                    char_start=0,
                    char_end=0,
                    context=f"[Unverified quote: {quoted_text[:50]}...]",
                    extraction_version=extraction_version,
                    extraction_method=extraction_method,
                )
            
            citations.append(citation)
            
            # Replace the citation marker with a reference number
            processed_text = processed_text.replace(
                match.group(0),
                f"[{citation_counter}]",
                1
            )
            citation_counter += 1
        
        # Handle position-based citations
        for match in self.POSITION_PATTERN.finditer(processed_text):
            start_char = int(match.group(1))
            end_char = int(match.group(2))
            
            citation_id = f"cite_{citation_counter}"
            
            try:
                doc_data = self.doc_processor.get_document_text(source_file)
                full_text = doc_data.get("text", "")
                quoted_text = full_text[start_char:end_char]
                
                # Find the page
                page = 1
                for page_info in doc_data.get("pages", []):
                    if page_info["char_start"] <= start_char < page_info["char_end"]:
                        page = page_info.get("page", 1)
                        break
                
                context = self.doc_processor.get_context_around(
                    source_file, start_char, end_char, context_chars=150
                )
                
                citation = Citation(
                    id=citation_id,
                    source_file=source_file,
                    text=quoted_text,
                    page=page,
                    char_start=start_char,
                    char_end=end_char,
                    context=context,
                )
            except Exception:
                citation = Citation(
                    id=citation_id,
                    source_file=source_file,
                    text=f"[Position {start_char}:{end_char}]",
                    page=0,
                    char_start=start_char,
                    char_end=end_char,
                    context="[Unable to resolve citation]",
                )
            
            citations.append(citation)
            
            processed_text = processed_text.replace(
                match.group(0),
                f"[{citation_counter}]",
                1
            )
            citation_counter += 1
        
        return ParsedResponse(
            text=processed_text,
            citations=citations,
            raw_text=response_text,
        )
    
    def parse_multi_document_response(
        self,
        response_text: str,
        source_files: List[str],
    ) -> ParsedResponse:
        """Parse response with citations from multiple documents.
        
        Args:
            response_text: Raw response text from the LLM.
            source_files: List of source document names.
            
        Returns:
            ParsedResponse with resolved citations.
        """
        # Extended pattern for multi-doc: [[cite:filename:"text"]]
        multi_doc_pattern = re.compile(
            r'\[\[cite:([^:]+):"([^"]+)"\]\]',
            re.IGNORECASE
        )
        
        citations: List[Citation] = []
        processed_text = response_text
        citation_counter = 1
        
        for match in multi_doc_pattern.finditer(response_text):
            filename = match.group(1).strip()
            quoted_text = match.group(2)
            
            # Find the closest matching filename
            matched_file = None
            for sf in source_files:
                if filename.lower() in sf.lower() or sf.lower() in filename.lower():
                    matched_file = sf
                    break
            
            if not matched_file:
                matched_file = source_files[0] if source_files else filename
            
            citation_id = f"cite_{citation_counter}"
            
            try:
                location = self.doc_processor.find_text_location(
                    matched_file, quoted_text
                )
                
                if location:
                    context = self.doc_processor.get_context_around(
                        matched_file,
                        location["char_start"],
                        location["char_end"],
                        context_chars=150
                    )
                    
                    citation = Citation(
                        id=citation_id,
                        source_file=matched_file,
                        text=quoted_text,
                        page=location["page"],
                        char_start=location["char_start"],
                        char_end=location["char_end"],
                        context=context,
                    )
                else:
                    citation = Citation(
                        id=citation_id,
                        source_file=matched_file,
                        text=quoted_text,
                        page=0,
                        char_start=0,
                        char_end=0,
                        context=f"[Unverified: {quoted_text[:50]}...]",
                    )
            except Exception:
                citation = Citation(
                    id=citation_id,
                    source_file=filename,
                    text=quoted_text,
                    page=0,
                    char_start=0,
                    char_end=0,
                    context="[Unable to resolve]",
                )
            
            citations.append(citation)
            processed_text = processed_text.replace(
                match.group(0),
                f"[{citation_counter}]",
                1
            )
            citation_counter += 1
        
        # Also process single-doc citations
        single_doc_result = self.parse_response(
            processed_text,
            source_files[0] if source_files else "unknown"
        )
        
        # Merge citations, renumbering as needed
        all_citations = citations + single_doc_result.citations
        
        return ParsedResponse(
            text=single_doc_result.text,
            citations=all_citations,
            raw_text=response_text,
        )
    
    def aggregate_citations(
        self,
        responses: List[ParsedResponse]
    ) -> Tuple[str, List[Citation]]:
        """Aggregate citations from multiple responses for summaries.
        
        Args:
            responses: List of parsed responses to aggregate.
            
        Returns:
            Tuple of (combined text, deduplicated citations).
        """
        all_citations: List[Citation] = []
        citation_map: Dict[str, int] = {}  # text -> new index
        
        for response in responses:
            for citation in response.citations:
                key = f"{citation.source_file}:{citation.text[:50]}"
                if key not in citation_map:
                    new_idx = len(all_citations) + 1
                    citation_map[key] = new_idx
                    # Create new citation with updated ID
                    new_citation = Citation(
                        id=f"cite_{new_idx}",
                        source_file=citation.source_file,
                        text=citation.text,
                        page=citation.page,
                        char_start=citation.char_start,
                        char_end=citation.char_end,
                        context=citation.context,
                    )
                    all_citations.append(new_citation)
        
        return all_citations

