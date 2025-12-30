"""LLM service for OpenRouter API integration.

Provides a unified interface to multiple LLM providers through OpenRouter,
supporting model selection and streaming responses.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx

from ..config import AVAILABLE_MODELS, DEFAULT_MODEL, config
from ..llm_config import (
    CHAT_CONFIG,
    CONTEXT_LIMITS,
    DOCUMENT_ANALYSIS_CONFIG,
    ROWWISE_ANALYSIS_CONFIG,
    SUMMARY_CONFIG,
    LLMRequestConfig,
)
from ..prompts import (
    ChatPrompts,
    DocumentAnalysisPrompts,
    SummaryPrompts,
)

logger = logging.getLogger(__name__)


@dataclass
class LLMResponse:
    """Response from an LLM query.
    
    Attributes:
        content: The response text content.
        model: The model that generated the response.
        usage: Token usage statistics.
        finish_reason: Why the generation stopped.
    """
    
    content: str
    model: str
    usage: Dict[str, int]
    finish_reason: str = "stop"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "content": self.content,
            "model": self.model,
            "usage": self.usage,
            "finish_reason": self.finish_reason,
        }


class LLMService:
    """Service for interacting with LLMs via OpenRouter.
    
    Supports multiple models including GPT-5.2, Claude variants, and Gemini.
    Includes retry logic and streaming support.
    
    Attributes:
        api_key: OpenRouter API key.
        base_url: OpenRouter API base URL.
        default_model: Default model to use.
    """
    
    BASE_URL = "https://openrouter.ai/api/v1"
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: str = DEFAULT_MODEL,
    ) -> None:
        """Initialize the LLM service.
        
        Args:
            api_key: OpenRouter API key. Defaults to config value.
            default_model: Default model to use.
        """
        self.api_key = api_key or config.openrouter_api_key
        self.default_model = default_model
        self._client: Optional[httpx.AsyncClient] = None
    
    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None or self._client.is_closed:
            timeout = DOCUMENT_ANALYSIS_CONFIG.timeout
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "HTTP-Referer": "https://docmatrix.local",
                    "X-Title": "Doc Matrix",
                    "Content-Type": "application/json",
                },
                timeout=timeout,
            )
        return self._client
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
    
    @staticmethod
    async def validate_api_key(api_key: str) -> Dict[str, Any]:
        """Validate an OpenRouter API key.
        
        Makes a test request to OpenRouter's /api/v1/key endpoint to verify
        the key is valid and has proper permissions.
        
        Args:
            api_key: The OpenRouter API key to validate.
            
        Returns:
            Dictionary with validation result:
                - valid (bool): True if key is valid
                - error (str, optional): Error message if validation failed
                
        Raises:
            No exceptions raised - errors are returned in the result dict.
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://openrouter.ai/api/v1/key",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )
                
                if response.status_code == 200:
                    return {"valid": True}
                elif response.status_code == 401:
                    return {
                        "valid": False,
                        "error": "Invalid API key"
                    }
                elif response.status_code == 403:
                    return {
                        "valid": False,
                        "error": "API key does not have permission"
                    }
                else:
                    return {
                        "valid": False,
                        "error": f"Validation failed: HTTP {response.status_code}"
                    }
        except httpx.TimeoutException:
            return {
                "valid": False,
                "error": "Request timed out"
            }
        except Exception as e:
            return {
                "valid": False,
                "error": f"Validation error: {str(e)}"
            }
    
    def get_model_id(self, model_name: str) -> str:
        """Get the OpenRouter model ID for a display name.
        
        Args:
            model_name: Display name of the model.
            
        Returns:
            OpenRouter model identifier.
        """
        return AVAILABLE_MODELS.get(model_name, AVAILABLE_MODELS[DEFAULT_MODEL])
    
    def list_models(self) -> List[Dict[str, str]]:
        """List available models.
        
        Returns:
            List of model info with name and id.
        """
        return [
            {"name": name, "id": model_id}
            for name, model_id in AVAILABLE_MODELS.items()
        ]
    
    async def complete(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        retry_count: Optional[int] = None,
        retry_delay: Optional[float] = None,
        config: Optional[LLMRequestConfig] = None,
    ) -> LLMResponse:
        """Send a completion request to the LLM.
        
        Args:
            messages: List of message dicts with role and content.
            model: Model name to use. Defaults to default_model.
            temperature: Sampling temperature (0-1). Uses config if None.
            max_tokens: Maximum tokens in response. Uses config if None.
            retry_count: Number of retry attempts. Uses config if None.
            retry_delay: Base delay between retries. Uses config if None.
            config: LLMRequestConfig object. If provided, individual params
                are ignored unless explicitly set.
            
        Returns:
            LLMResponse with the completion.
            
        Raises:
            Exception: If all retries fail.
        """
        # Use config object if provided, otherwise fall back to individual
        # params or defaults
        if config is not None:
            temperature = temperature if temperature is not None else (
                config.temperature
            )
            max_tokens = max_tokens if max_tokens is not None else (
                config.max_tokens
            )
            retry_count = retry_count if retry_count is not None else (
                config.retry_count
            )
            retry_delay = retry_delay if retry_delay is not None else (
                config.retry_delay
            )
        else:
            # Use default config values
            default_cfg = DOCUMENT_ANALYSIS_CONFIG
            temperature = temperature if temperature is not None else (
                default_cfg.temperature
            )
            max_tokens = max_tokens if max_tokens is not None else (
                default_cfg.max_tokens
            )
            retry_count = retry_count if retry_count is not None else (
                default_cfg.retry_count
            )
            retry_delay = retry_delay if retry_delay is not None else (
                default_cfg.retry_delay
            )
        
        model_name = model or self.default_model
        model_id = self.get_model_id(model_name)
        
        logger.info(
            f"🚀 Starting LLM request: model={model_name}, "
            f"max_tokens={max_tokens}, temp={temperature}"
        )
        start_time = time.time()
        
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        last_error = None
        
        for attempt in range(retry_count):
            try:
                logger.debug(
                    f"  📡 Attempt {attempt + 1}/{retry_count} - "
                    f"Sending request to OpenRouter..."
                )
                
                response = await self.client.post(
                    "/chat/completions",
                    json=payload,
                )
                
                if response.status_code == 429:
                    # Rate limited - wait and retry
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(
                        f"  ⏳ Rate limited! Waiting {wait_time:.1f}s "
                        f"before retry..."
                    )
                    await asyncio.sleep(wait_time)
                    continue
                
                response.raise_for_status()
                data = response.json()
                
                elapsed = time.time() - start_time
                content = data["choices"][0]["message"]["content"]
                usage = data.get("usage", {})
                finish_reason = data["choices"][0].get("finish_reason", "stop")
                
                logger.info(
                    f"✅ LLM response received: model={model_name}, "
                    f"tokens={usage.get('total_tokens', 0)}, "
                    f"time={elapsed:.2f}s"
                )
                
                return LLMResponse(
                    content=content,
                    model=model_name,
                    usage={
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "total_tokens": usage.get("total_tokens", 0),
                    },
                    finish_reason=finish_reason,
                )
                
            except httpx.HTTPStatusError as e:
                last_error = e
                logger.error(
                    f"  ❌ HTTP error {e.response.status_code}: "
                    f"{e.response.text[:200]}"
                )
                if e.response.status_code >= 500:
                    # Server error - retry
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(
                        f"  🔄 Server error, retrying in {wait_time:.1f}s..."
                    )
                    await asyncio.sleep(wait_time)
                    continue
                raise
            except httpx.RequestError as e:
                last_error = e
                wait_time = retry_delay * (2 ** attempt)
                logger.error(f"  ❌ Request error: {str(e)}")
                logger.warning(f"  🔄 Retrying in {wait_time:.1f}s...")
                await asyncio.sleep(wait_time)
                continue
        
        # All retries failed
        elapsed = time.time() - start_time
        logger.error(
            f"💥 All {retry_count} attempts failed after {elapsed:.2f}s: "
            f"{last_error}"
        )
        raise Exception(f"Failed after {retry_count} retries: {last_error}")
    
    async def complete_with_document(
        self,
        document_text: str,
        question: str,
        filename: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> LLMResponse:
        """Query an LLM about a specific document.
        
        Args:
            document_text: Full text of the document.
            question: Question to ask about the document.
            filename: Name of the source file (for citation context).
            model: Model to use.
            system_prompt: Custom system prompt. Uses default if None.
            
        Returns:
            LLMResponse with answer.
        """
        if system_prompt is None:
            system_prompt = (
                DocumentAnalysisPrompts.get_single_question_prompt(filename)
            )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Document:\n\n{document_text}\n\n---\n\nQuestion: {question}"},
        ]
        
        return await self.complete(
            messages, model=model, config=DOCUMENT_ANALYSIS_CONFIG
        )
    
    async def complete_row_wise(
        self,
        document_text: str,
        questions: List[Dict[str, str]],
        filename: str,
        model: Optional[str] = None,
    ) -> Dict[str, LLMResponse]:
        """Answer multiple questions about a document in one call.
        
        This is more efficient than individual calls as the document context
        is only processed once.
        
        Args:
            document_text: Full text of the document.
            questions: List of question dicts with 'id' and 'question'.
            filename: Name of the source file.
            model: Model to use.
            
        Returns:
            Dict mapping question IDs to LLMResponse objects.
        """
        questions_text = "\n".join(
            f"{i+1}. [{q['id']}] {q['question']}"
            for i, q in enumerate(questions)
        )
        
        system_prompt = DocumentAnalysisPrompts.get_row_wise_prompt(filename)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Document:\n\n{document_text}\n\n---\n\nQuestions:\n{questions_text}"},
        ]
        
        response = await self.complete(
            messages, model=model, config=ROWWISE_ANALYSIS_CONFIG
        )
        
        # Parse the JSON response
        results = {}
        try:
            # Try to extract JSON from the response
            content = response.content
            # Find JSON block
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                data = json.loads(json_str)
                answers = data.get("answers", {})
                
                for q in questions:
                    q_id = q["id"]
                    if q_id in answers:
                        answer_data = answers[q_id]
                        answer_text = answer_data.get("answer", "") if isinstance(answer_data, dict) else str(answer_data)
                        results[q_id] = LLMResponse(
                            content=answer_text,
                            model=response.model,
                            usage=response.usage,
                        )
                    else:
                        results[q_id] = LLMResponse(
                            content="[No answer provided]",
                            model=response.model,
                            usage=response.usage,
                        )
        except json.JSONDecodeError:
            # Fallback: return the full response for each question
            for q in questions:
                results[q["id"]] = LLMResponse(
                    content=response.content,
                    model=response.model,
                    usage=response.usage,
                )
        
        return results
    
    async def generate_summary(
        self,
        answers: List[Dict[str, Any]],
        summary_type: str,
        context: str,
        model: Optional[str] = None,
    ) -> LLMResponse:
        """Generate a summary from multiple answers.
        
        Args:
            answers: List of answer dicts with 'answer' and 'citations'.
            summary_type: Type of summary ('row', 'column', 'overall').
            context: Additional context (e.g., document name or question).
            model: Model to use.
            
        Returns:
            LLMResponse with summary.
        """
        if summary_type == "row":
            # Document summary: synthesize all Q&A for this document
            answers_text = "\n\n".join(
                f"Q: {a.get('question', 'Question')}\nA: {a.get('answer', '')}"
                for a in answers
            )
            prompt = f"Document: {context}\n\nQuestions and Answers:\n{answers_text}"
            system_prompt = SummaryPrompts.get_row_summary_prompt()
            
        elif summary_type == "column":
            # Question summary: executive summary across all documents
            answers_text = "\n\n".join(
                f"Document: {a.get('document', 'Unknown')}\nAnswer: {a.get('answer', '')}"
                for a in answers
            )
            prompt = f"Question: {context}\n\nAnswers from different documents:\n{answers_text}"
            system_prompt = SummaryPrompts.get_column_summary_prompt()
            
        else:
            # Overall summary
            answers_text = "\n\n".join(
                f"Summary {i+1}:\n{a.get('answer', '')}"
                for i, a in enumerate(answers)
            )
            prompt = f"Overall Analysis:\n\n{answers_text}"
            system_prompt = SummaryPrompts.get_overall_summary_prompt()
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"{prompt}\n\n{answers_text}"},
        ]
        
        return await self.complete(messages, model=model, config=SUMMARY_CONFIG)
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        documents_context: str,
        model: Optional[str] = None,
    ) -> LLMResponse:
        """Have a chat conversation with document context.
        
        Args:
            messages: Conversation history.
            documents_context: Text from relevant documents.
            model: Model to use.
            
        Returns:
            LLMResponse with chat reply.
        """
        system_prompt = ChatPrompts.get_chat_prompt(documents_context)
        
        full_messages = [
            {"role": "system", "content": system_prompt},
            *messages,
        ]
        
        return await self.complete(full_messages, model=model, config=CHAT_CONFIG)


# Synchronous wrapper for use in Flask routes
def run_async(coro):
    """Run an async coroutine synchronously.
    
    Args:
        coro: Coroutine to run.
        
    Returns:
        Result of the coroutine.
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(coro)

