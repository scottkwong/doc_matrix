"""Pydantic schemas for structured LLM responses.

Defines data models for validating and parsing LLM outputs, particularly
for structured citation extraction. Using Pydantic ensures consistent
citation format regardless of LLM variations.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class CitationRequest(BaseModel):
    """Citation data from LLM response.
    
    Attributes:
        text: The exact quoted text from the source document.
        context: Optional surrounding context for display.
    """
    
    text: str = Field(
        ...,
        description="Exact quoted text from the document",
        min_length=1,
        max_length=500
    )
    context: Optional[str] = Field(
        None,
        description="Optional surrounding context",
        max_length=500
    )
    
    @field_validator('text')
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        """Validate text is not just whitespace."""
        if not v.strip():
            raise ValueError("Citation text cannot be empty or whitespace")
        return v.strip()


class StructuredAnswer(BaseModel):
    """Structured answer from LLM with citations.
    
    Attributes:
        answer: The answer text without inline citation markers.
        citations: List of citations supporting the answer.
    """
    
    answer: str = Field(
        ...,
        description="Answer text without inline citation markers",
        min_length=1
    )
    citations: List[CitationRequest] = Field(
        default_factory=list,
        description="List of citations from the document"
    )
    
    @field_validator('answer')
    @classmethod
    def answer_not_empty(cls, v: str) -> str:
        """Validate answer is not just whitespace."""
        if not v.strip():
            raise ValueError("Answer cannot be empty or whitespace")
        return v.strip()
    
    @field_validator('citations')
    @classmethod
    def validate_citations(cls, v: List[CitationRequest]) -> List[CitationRequest]:
        """Validate citations list."""
        # Remove duplicates based on text
        seen = set()
        unique_citations = []
        for citation in v:
            if citation.text not in seen:
                seen.add(citation.text)
                unique_citations.append(citation)
        return unique_citations


class MultiDocumentAnswer(BaseModel):
    """Structured answer from LLM referencing multiple documents.
    
    Attributes:
        answer: The synthesized answer text.
        citations: List of citations with source file references.
    """
    
    answer: str = Field(
        ...,
        description="Synthesized answer across documents",
        min_length=1
    )
    citations: List[CitationRequest] = Field(
        default_factory=list,
        description="Citations from various source documents"
    )


class ChatResponse(BaseModel):
    """Response from chat/Q&A interface.
    
    Attributes:
        response: The response text.
        citations: Optional citations if answering from documents.
        sources: Optional list of source filenames referenced.
    """
    
    response: str = Field(
        ...,
        description="Response text",
        min_length=1
    )
    citations: List[CitationRequest] = Field(
        default_factory=list,
        description="Citations supporting the response"
    )
    sources: List[str] = Field(
        default_factory=list,
        description="List of source document filenames"
    )


class CitationVerificationResult(BaseModel):
    """Result of verifying a citation against source document.
    
    Attributes:
        verified: Whether the citation text was found in document.
        page: Page number if found.
        char_start: Starting character position if found.
        char_end: Ending character position if found.
        confidence: Confidence level (exact, fuzzy, not_found).
    """
    
    verified: bool = Field(
        ...,
        description="Whether citation was verified in document"
    )
    page: Optional[int] = Field(
        None,
        description="Page number where citation was found"
    )
    char_start: Optional[int] = Field(
        None,
        description="Starting character position"
    )
    char_end: Optional[int] = Field(
        None,
        description="Ending character position"
    )
    confidence: str = Field(
        default="exact",
        description="Confidence level: exact, fuzzy, or not_found"
    )

