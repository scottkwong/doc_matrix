"""Examples of using the prompts and config system.

This file demonstrates how to use the new prompts and configuration
system in your code. It's meant as a reference for developers.
"""

from __future__ import annotations

# Example 1: Using default configurations
# ========================================

async def example_1_default_config():
    """Use default configuration for document analysis."""
    from app.services.llm import LLMService
    from app.llm_config import DOCUMENT_ANALYSIS_CONFIG
    from app.prompts import DocumentAnalysisPrompts
    
    llm = LLMService()
    
    # Get the prompt
    prompt = DocumentAnalysisPrompts.get_single_question_prompt(
        "annual_report.pdf"
    )
    
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "What was the revenue?"},
    ]
    
    # Use default config
    response = await llm.complete(messages, config=DOCUMENT_ANALYSIS_CONFIG)
    
    print(response.content)


# Example 2: Using configuration presets
# =======================================

async def example_2_with_preset():
    """Use a preset configuration for large documents."""
    from app.services.llm import LLMService
    from app.llm_config import ConfigPresets
    from app.prompts import DocumentAnalysisPrompts
    
    llm = LLMService()
    
    # Use preset for large documents
    config = ConfigPresets.get_config_for_large_documents()
    
    prompt = DocumentAnalysisPrompts.get_single_question_prompt("large_doc.pdf")
    
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "Summarize the key points."},
    ]
    
    response = await llm.complete(messages, config=config)
    
    print(response.content)


# Example 3: Creating custom configuration
# =========================================

async def example_3_custom_config():
    """Create a custom configuration for specific needs."""
    from app.services.llm import LLMService
    from app.llm_config import LLMRequestConfig
    from app.prompts import DocumentAnalysisPrompts
    
    llm = LLMService()
    
    # Create custom config
    custom_config = LLMRequestConfig(
        temperature=0.7,    # More creative
        max_tokens=10240,   # Very long responses
        retry_count=5,      # More retries
        retry_delay=2.0,    # Longer waits
        timeout=180.0,      # 3 minute timeout
    )
    
    prompt = DocumentAnalysisPrompts.get_single_question_prompt(
        "complex_analysis.pdf"
    )
    
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "Provide a detailed analysis."},
    ]
    
    response = await llm.complete(messages, config=custom_config)
    
    print(response.content)


# Example 4: Override individual parameters
# ==========================================

async def example_4_parameter_override():
    """Override specific parameters while using default config."""
    from app.services.llm import LLMService
    from app.llm_config import DOCUMENT_ANALYSIS_CONFIG
    from app.prompts import DocumentAnalysisPrompts
    
    llm = LLMService()
    
    prompt = DocumentAnalysisPrompts.get_single_question_prompt("report.pdf")
    
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "What are the conclusions?"},
    ]
    
    # Use config but override max_tokens
    response = await llm.complete(
        messages,
        config=DOCUMENT_ANALYSIS_CONFIG,
        max_tokens=8192,  # Override just this parameter
    )
    
    print(response.content)


# Example 5: Using different prompts
# ===================================

async def example_5_different_prompts():
    """Use different prompts for different scenarios."""
    from app.services.llm import LLMService
    from app.llm_config import SUMMARY_CONFIG
    from app.prompts import SummaryPrompts
    
    llm = LLMService()
    
    # For row summary (document summary)
    row_prompt = SummaryPrompts.get_row_summary_prompt()
    
    # For column summary (question summary)
    col_prompt = SummaryPrompts.get_column_summary_prompt()
    
    # For overall summary
    overall_prompt = SummaryPrompts.get_overall_summary_prompt()
    
    # Use the appropriate prompt
    messages = [
        {"role": "system", "content": row_prompt},
        {"role": "user", "content": "Here are the Q&As..."},
    ]
    
    response = await llm.complete(messages, config=SUMMARY_CONFIG)
    
    print(response.content)


# Example 6: Using context limits
# ================================

def example_6_context_limits():
    """Use context limits when building document context."""
    from app.llm_config import CONTEXT_LIMITS
    
    documents = [...]  # Your documents list
    
    # Use the context limits
    max_docs = CONTEXT_LIMITS.chat_max_documents
    max_text = CONTEXT_LIMITS.chat_max_text_per_doc
    
    doc_contexts = []
    for doc in documents[:max_docs]:
        doc_text = doc.get("text", "")[:max_text]
        doc_contexts.append(f"=== {doc['name']} ===\n{doc_text}")
    
    return "\n\n".join(doc_contexts)


# Example 7: Customizing prompts dynamically
# ===========================================

async def example_7_custom_prompt():
    """Create a custom prompt for a specific use case."""
    from app.services.llm import LLMService
    from app.llm_config import DOCUMENT_ANALYSIS_CONFIG
    
    llm = LLMService()
    
    # Create a custom prompt (not using the pre-defined ones)
    custom_prompt = '''You are a financial analyst specializing in 
earnings reports.

Analyze the provided document and focus on:
1. Revenue trends
2. Profit margins
3. Future guidance
4. Risk factors

Always cite your sources using [[cite:"text"]] format.'''
    
    messages = [
        {"role": "system", "content": custom_prompt},
        {"role": "user", "content": "Document: ...\n\nAnalyze this report."},
    ]
    
    response = await llm.complete(messages, config=DOCUMENT_ANALYSIS_CONFIG)
    
    print(response.content)


# Example 8: Configuration by document type
# ==========================================

async def example_8_config_by_doc_type():
    """Select configuration based on document type."""
    from app.services.llm import LLMService
    from app.llm_config import ConfigPresets
    from app.prompts import DocumentAnalysisPrompts
    
    llm = LLMService()
    
    def get_config_for_document(doc_type: str):
        """Get appropriate config based on document type."""
        configs = {
            "legal": ConfigPresets.get_config_for_technical_analysis(),
            "technical": ConfigPresets.get_config_for_technical_analysis(),
            "large": ConfigPresets.get_config_for_large_documents(),
            "quick": ConfigPresets.get_config_for_quick_analysis(),
            "creative": ConfigPresets.get_config_for_creative_summary(),
        }
        return configs.get(doc_type, ConfigPresets.get_config_for_quick_analysis())
    
    doc_type = "legal"  # Could be determined by file extension, size, etc.
    config = get_config_for_document(doc_type)
    
    prompt = DocumentAnalysisPrompts.get_single_question_prompt("contract.pdf")
    
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "What are the key terms?"},
    ]
    
    response = await llm.complete(messages, config=config)
    
    print(response.content)


# Example 9: Accessing config as dictionary
# ==========================================

def example_9_config_to_dict():
    """Convert configuration to dictionary for serialization."""
    from app.llm_config import DOCUMENT_ANALYSIS_CONFIG, ConfigPresets
    
    # Get config as dict (useful for APIs, logging, or UI)
    config_dict = DOCUMENT_ANALYSIS_CONFIG.to_dict()
    
    print(config_dict)
    # Output:
    # {
    #     'temperature': 0.3,
    #     'max_tokens': 4096,
    #     'retry_count': 3,
    #     'retry_delay': 1.0,
    #     'timeout': 120.0
    # }
    
    # Also works with presets
    large_doc_config = ConfigPresets.get_config_for_large_documents()
    print(large_doc_config.to_dict())


# Example 10: Using the prompt registry
# ======================================

def example_10_prompt_registry():
    """Access prompts through the registry."""
    from app.prompts import PROMPT_REGISTRY
    
    # Get a prompt function from the registry
    get_doc_prompt = PROMPT_REGISTRY["document_single"]
    prompt = get_doc_prompt("example.pdf")
    
    print(prompt)
    
    # Available registry keys:
    # - "document_single"
    # - "document_rowwise"
    # - "summary_row"
    # - "summary_column"
    # - "summary_overall"
    # - "chat"


# Example 11: Modifying context limits at runtime
# ================================================

def example_11_modify_context_limits():
    """Modify context limits for a specific operation."""
    from app.llm_config import CONTEXT_LIMITS
    
    # Save original values
    original_max_docs = CONTEXT_LIMITS.chat_max_documents
    original_max_text = CONTEXT_LIMITS.chat_max_text_per_doc
    
    try:
        # Temporarily increase limits for a large project
        CONTEXT_LIMITS.chat_max_documents = 50
        CONTEXT_LIMITS.chat_max_text_per_doc = 20000
        
        # ... do your operations ...
        
    finally:
        # Restore original values
        CONTEXT_LIMITS.chat_max_documents = original_max_docs
        CONTEXT_LIMITS.chat_max_text_per_doc = original_max_text


# Example 12: Complete workflow
# ==============================

async def example_12_complete_workflow():
    """Complete example showing typical usage pattern."""
    from app.services.llm import LLMService
    from app.llm_config import DOCUMENT_ANALYSIS_CONFIG, ConfigPresets
    from app.prompts import DocumentAnalysisPrompts
    
    llm = LLMService()
    
    # Step 1: Determine document characteristics
    document_size = 50000  # characters
    is_technical = True
    
    # Step 2: Select appropriate config
    if document_size > 30000:
        config = ConfigPresets.get_config_for_large_documents()
    elif is_technical:
        config = ConfigPresets.get_config_for_technical_analysis()
    else:
        config = DOCUMENT_ANALYSIS_CONFIG
    
    # Step 3: Get appropriate prompt
    filename = "technical_spec.pdf"
    prompt = DocumentAnalysisPrompts.get_single_question_prompt(filename)
    
    # Step 4: Prepare messages
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "What are the technical requirements?"},
    ]
    
    # Step 5: Make the request
    response = await llm.complete(messages, config=config)
    
    # Step 6: Process response
    print(f"Model: {response.model}")
    print(f"Tokens used: {response.usage['total_tokens']}")
    print(f"Content: {response.content}")
    
    return response


# Summary of Best Practices
# ==========================

"""
BEST PRACTICES:

1. Use pre-defined configs from llm_config.py for consistency
2. Use ConfigPresets for common scenarios
3. Create custom configs only when needed
4. Use appropriate prompts from prompts.py
5. Adjust CONTEXT_LIMITS for document context operations
6. Override individual parameters when you need small adjustments
7. Use .to_dict() for serialization/logging
8. Select configs based on document characteristics
9. Keep custom prompts DRY by adding them to prompts.py
10. Document any custom configurations you create

KEY FILES:
- backend/app/prompts.py - All system prompts
- backend/app/llm_config.py - All configurations
- backend/app/services/llm.py - LLM service implementation

MIGRATION:
All existing code continues to work. The new system is backward compatible.
You can gradually migrate to using the new configs and prompts.
"""


