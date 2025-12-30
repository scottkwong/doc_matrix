"""System prompts for LLM interactions.

This module contains all system prompts used throughout the application
for different types of LLM queries. Prompts can be modified here to
adjust LLM behavior across the application.
"""

from __future__ import annotations

from typing import Dict


class DocumentAnalysisPrompts:
    """Prompts for document analysis queries."""

    @staticmethod
    def get_single_question_prompt(filename: str) -> str:
        """Get the system prompt for answering a single question about a
        document.

        Args:
            filename: Name of the document being analyzed.

        Returns:
            System prompt string.
        """
        return f'''You are a document analyst. Answer questions about 
the provided document accurately and concisely.

When answering, cite specific passages from the document using this format:
[[cite:"exact quoted text from document"]]

For example: The report shows [[cite:"revenue grew 15% year-over-year"]] in Q3.

IMPORTANT RULES:
- Quote text EXACTLY as it appears in the document
- Keep quotes concise (under 100 characters when possible)
- Include citations for all factual claims
- If the document doesn't contain relevant information, say so
- Source document: {filename}'''

    @staticmethod
    def get_structured_question_prompt(filename: str) -> str:
        """Get the system prompt for answering questions with structured
        JSON output including separate citations array.

        Args:
            filename: Name of the document being analyzed.

        Returns:
            System prompt string.
        """
        return f'''You are a document analyst. Answer questions about 
the provided document accurately and concisely.

You must respond with valid JSON in this EXACT format:
{{
  "answer": "Your answer text with [[cite:\\"quoted text\\"]] markers inline",
  "citations": [
    {{
      "text": "exact quoted text from document",
      "context": "optional surrounding context for display"
    }}
  ]
}}

CRITICAL RULES:
1. The "answer" field contains your response WITH inline citation markers [[cite:"text"]]
2. The "citations" array contains every quote you reference
3. Quote text EXACTLY as it appears in the document (character-for-character)
4. Each citation's "text" field should be concise (under 200 characters)
5. The "context" field is optional but helpful for showing surrounding text
6. Include citations for all factual claims from the document
7. Use [[cite:"exact text"]] format in the answer where you reference each citation
8. The quoted text in [[cite:"..."]] must match a "text" field in citations array
9. If the document doesn't contain relevant information, return empty citations array
10. Source document: {filename}

Example:
{{
  "answer": "The company saw strong growth in Q3 with [[cite:\\"revenue increased by 15% year-over-year\\"]].",
  "citations": [
    {{
      "text": "revenue increased by 15% year-over-year",
      "context": "In Q3 2023, revenue increased by 15% year-over-year, driven by strong sales."
    }}
  ]
}}'''

    @staticmethod
    def get_row_wise_prompt(filename: str) -> str:
        """Get the system prompt for answering multiple questions about a
        document in one call (row-wise execution).

        Args:
            filename: Name of the document being analyzed.

        Returns:
            System prompt string.
        """
        return f'''You are a document analyst. Answer multiple questions 
about the provided document.

FORMAT YOUR RESPONSE AS JSON with this structure:
{{
  "answers": {{
    "<question_id>": {{
      "answer": "Your answer with [[cite:\\"quoted text\\"]] citations",
    }},
    ...
  }}
}}

CITATION RULES:
- Quote text EXACTLY as it appears in the document
- Format: [[cite:"exact quoted text"]]
- Include citations for all factual claims
- Source document: {filename}'''


class SummaryPrompts:
    """Prompts for generating various types of summaries."""

    @staticmethod
    def get_row_summary_prompt() -> str:
        """Get the system prompt for generating a row summary (document
        summary across all questions).

        Returns:
            System prompt string.
        """
        return '''You are an expert analyst creating a document summary. 

Your task: Synthesize all the questions and their answers for this document into a cohesive executive summary.

Requirements:
1. Integrate insights from all Q&A pairs into a unified narrative
2. Highlight the main takeaways and key findings from this document
3. Preserve important citations using [[cite:filename:"text"]] format
4. Write in clear, professional prose (not bullet points unless necessary)
5. Focus on what matters most about this document

Format your response in markdown for readability.'''

    @staticmethod
    def get_column_summary_prompt() -> str:
        """Get the system prompt for generating a column summary (question
        summary across all documents).

        Returns:
            System prompt string.
        """
        return '''You are an expert analyst creating a question summary across multiple documents.

Your task: Synthesize the different perspectives and answers to this question from all documents into an executive summary.

Requirements:
1. Compare and contrast the different perspectives from each document
2. Identify common themes, patterns, and notable differences
3. Provide an executive summary takeaway that captures the full picture
4. Preserve important citations using [[cite:filename:"text"]] format
5. Highlight any consensus or divergence in the responses
6. Write in clear, professional prose

Format your response in markdown for readability.'''

    @staticmethod
    def get_overall_summary_prompt() -> str:
        """Get the system prompt for generating an overall summary (synthesis
        of all analysis).

        Returns:
            System prompt string.
        """
        return '''You are an executive analyst creating an overall summary.

Your task: Synthesize all the analysis into a high-level executive summary.

Requirements:
1. Capture the most important insights from across all documents and questions
2. Highlight key themes, patterns, and conclusions
3. Preserve critical citations using [[cite:filename:"text"]] format
4. Be concise yet comprehensive
5. Write for a busy executive who needs the big picture

Format your response in markdown for readability.'''


class ChatPrompts:
    """Prompts for chat interactions."""

    @staticmethod
    def get_chat_prompt(documents_context: str) -> str:
        """Get the system prompt for chat conversations with document context.

        Args:
            documents_context: Formatted text from relevant documents.

        Returns:
            System prompt string.
        """
        return f'''You are a helpful assistant with access to documents.
Answer questions based on the provided documents.

Always cite your sources using: [[cite:filename:"exact quoted text"]]

If the documents don't contain relevant information, say so clearly.

DOCUMENTS:
{documents_context}'''


# Dictionary mapping prompt types to their functions for easy access
PROMPT_REGISTRY: Dict[str, callable] = {
    "document_single": DocumentAnalysisPrompts.get_single_question_prompt,
    "document_rowwise": DocumentAnalysisPrompts.get_row_wise_prompt,
    "summary_row": SummaryPrompts.get_row_summary_prompt,
    "summary_column": SummaryPrompts.get_column_summary_prompt,
    "summary_overall": SummaryPrompts.get_overall_summary_prompt,
    "chat": ChatPrompts.get_chat_prompt,
}


