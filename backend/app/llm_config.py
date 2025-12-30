"""LLM configuration parameters.

This module contains configuration settings for LLM API calls including
temperature, max tokens, retry logic, and other parameters. These can be
adjusted to control LLM behavior across the application.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMRequestConfig:
    """Configuration for LLM API requests.

    These settings control how LLM requests are made and can be adjusted
    based on the use case (e.g., longer documents may need more tokens).

    Attributes:
        temperature: Controls randomness in generation (0.0-1.0).
            Lower values make output more deterministic.
        max_tokens: Maximum number of tokens in the response.
        retry_count: Number of retry attempts for failed requests.
        retry_delay: Base delay in seconds between retries (exponential
            backoff).
        timeout: Request timeout in seconds.
    """

    temperature: float = 0.3
    max_tokens: int = 4096
    retry_count: int = 3
    retry_delay: float = 1.0
    timeout: float = 120.0

    def to_dict(self) -> dict:
        """Convert config to dictionary.

        Returns:
            Dictionary representation of the config.
        """
        return {
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "retry_count": self.retry_count,
            "retry_delay": self.retry_delay,
            "timeout": self.timeout,
        }


@dataclass
class DocumentAnalysisConfig(LLMRequestConfig):
    """Configuration for document analysis queries.

    Inherits from LLMRequestConfig and can be customized for document
    analysis tasks.
    """

    temperature: float = 0.3  # Lower temp for factual analysis
    max_tokens: int = 4096


@dataclass
class RowWiseAnalysisConfig(LLMRequestConfig):
    """Configuration for row-wise analysis (multiple questions per document).

    May need higher token limits since we're asking multiple questions
    and expecting structured JSON responses.
    """

    temperature: float = 0.3
    max_tokens: int = 6144  # Higher limit for multiple answers


@dataclass
class SummaryConfig(LLMRequestConfig):
    """Configuration for summary generation.

    Summaries may benefit from slightly higher temperature for more
    natural prose.
    """

    temperature: float = 0.4  # Slightly higher for more fluid writing
    max_tokens: int = 4096


@dataclass
class ChatConfig(LLMRequestConfig):
    """Configuration for chat interactions.

    Chat may benefit from slightly higher temperature for more natural
    conversation.
    """

    temperature: float = 0.5  # Higher for conversational tone
    max_tokens: int = 3072  # Slightly lower since chat responses
    # are typically shorter


@dataclass
class ContextLimits:
    """Limits for document context in various operations.

    These control how much document text is included in prompts to avoid
    exceeding context windows.

    Attributes:
        chat_max_documents: Maximum number of documents to include in chat
            context.
        chat_max_text_per_doc: Maximum characters per document in chat
            context.
        summary_max_answers: Maximum number of answers to include in
            summaries.
    """

    chat_max_documents: int = 10
    chat_max_text_per_doc: int = 10000
    summary_max_answers: Optional[int] = None  # None = unlimited


# Default configuration instances
DEFAULT_REQUEST_CONFIG = LLMRequestConfig()
DOCUMENT_ANALYSIS_CONFIG = DocumentAnalysisConfig()
ROWWISE_ANALYSIS_CONFIG = RowWiseAnalysisConfig()
SUMMARY_CONFIG = SummaryConfig()
CHAT_CONFIG = ChatConfig()
CONTEXT_LIMITS = ContextLimits()


# Configuration presets for different document types/scenarios
class ConfigPresets:
    """Predefined configuration presets for common scenarios."""

    @staticmethod
    def get_config_for_large_documents() -> DocumentAnalysisConfig:
        """Get config optimized for large documents.

        Returns:
            Config with higher token limits.
        """
        return DocumentAnalysisConfig(
            temperature=0.3,
            max_tokens=8192,  # Increased for large documents
            retry_count=3,
            retry_delay=1.0,
        )

    @staticmethod
    def get_config_for_quick_analysis() -> DocumentAnalysisConfig:
        """Get config optimized for quick, concise analysis.

        Returns:
            Config with lower token limits for faster responses.
        """
        return DocumentAnalysisConfig(
            temperature=0.2,  # More deterministic
            max_tokens=2048,  # Lower for quicker responses
            retry_count=2,  # Fewer retries
            retry_delay=0.5,
        )

    @staticmethod
    def get_config_for_creative_summary() -> SummaryConfig:
        """Get config optimized for creative, engaging summaries.

        Returns:
            Config with higher temperature for more creative output.
        """
        return SummaryConfig(
            temperature=0.6,  # Higher for more creative prose
            max_tokens=5120,
            retry_count=3,
            retry_delay=1.0,
        )

    @staticmethod
    def get_config_for_technical_analysis() -> DocumentAnalysisConfig:
        """Get config optimized for technical/scientific documents.

        Returns:
            Config with lower temperature for precise technical analysis.
        """
        return DocumentAnalysisConfig(
            temperature=0.1,  # Very low for technical precision
            max_tokens=6144,  # Higher for detailed technical content
            retry_count=3,
            retry_delay=1.0,
        )


def get_config_by_name(config_name: str) -> LLMRequestConfig:
    """Get a configuration by name.

    Args:
        config_name: Name of the configuration preset
            ('default', 'document', 'rowwise', 'summary', 'chat',
            'large_documents', 'quick_analysis', 'creative_summary',
            'technical_analysis').

    Returns:
        The requested configuration.

    Raises:
        ValueError: If config_name is not recognized.
    """
    configs = {
        "default": DEFAULT_REQUEST_CONFIG,
        "document": DOCUMENT_ANALYSIS_CONFIG,
        "rowwise": ROWWISE_ANALYSIS_CONFIG,
        "summary": SUMMARY_CONFIG,
        "chat": CHAT_CONFIG,
        "large_documents": ConfigPresets.get_config_for_large_documents(),
        "quick_analysis": ConfigPresets.get_config_for_quick_analysis(),
        "creative_summary": ConfigPresets.get_config_for_creative_summary(),
        "technical_analysis": (
            ConfigPresets.get_config_for_technical_analysis()
        ),
    }

    if config_name not in configs:
        raise ValueError(
            f"Unknown config name: {config_name}. "
            f"Available: {', '.join(configs.keys())}"
        )

    return configs[config_name]

