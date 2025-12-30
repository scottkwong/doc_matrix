"""Quick test script for position mapping system.

Tests that position mappings are generated during PDF extraction
and can translate text positions to PDF coordinates.
"""

from pathlib import Path
from app.services import StorageManager, DocumentProcessor

def test_position_mapping():
    """Test position mapping on a PDF file."""
    
    # Initialize services
    root = Path.home()  # Adjust to your doc folder
    storage = StorageManager(root)
    doc_processor = DocumentProcessor(storage)
    
    # Find a PDF to test with
    print("Looking for PDF files...")
    pdf_files = list(root.glob("*.pdf"))
    
    if not pdf_files:
        print("❌ No PDF files found in root directory")
        print(f"   Root: {root}")
        return
    
    test_pdf = pdf_files[0].name
    print(f"\n✅ Testing with: {test_pdf}")
    
    # Extract text (should generate position mappings)
    print("\n1. Extracting PDF text...")
    doc_data = doc_processor.get_document_text(test_pdf, force_refresh=True)
    
    print(f"   - Extracted {doc_data['char_count']} characters")
    print(f"   - {doc_data['page_count']} pages")
    print(f"   - Extraction method: {doc_data.get('extraction_method')}")
    print(f"   - Extraction version: {doc_data.get('extraction_version')}")
    
    # Check position mappings
    mappings = doc_data.get("position_mappings", [])
    print(f"\n2. Position Mappings Generated:")
    print(f"   - {len(mappings)} mapping points")
    
    if mappings:
        print(f"\n   Sample mappings:")
        for i, m in enumerate(mappings[:5]):
            print(f"   [{i}] char_pos={m['text_char']}, "
                  f"page={m['pdf_page']}, "
                  f"search=\"{m['search_text'][:40]}...\"")
    
    # Test translation
    print(f"\n3. Testing Position Translation:")
    test_char_pos = doc_data['char_count'] // 2  # Middle of document
    
    pdf_location = doc_processor.position_mapper.translate_to_pdf_coords(
        test_pdf,
        test_char_pos,
        test_char_pos + 100,
        doc_data.get('extraction_version', '1.0'),
        doc_data.get('text', '')
    )
    
    print(f"   - Text position {test_char_pos} translates to:")
    print(f"   - PDF page: {pdf_location.page}")
    print(f"   - Confidence: {pdf_location.confidence}")
    print(f"   - Search text: \"{pdf_location.search_text[:60]}...\"")
    
    print("\n✅ Position mapping test complete!")
    print("\nTo test citations:")
    print("1. Run a query on this PDF through the app")
    print("2. Check that citations include extraction_version")
    print("3. Click citation to verify it opens correct page")

if __name__ == "__main__":
    test_position_mapping()

