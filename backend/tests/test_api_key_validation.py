"""Tests for API key validation functionality.

This module tests the API key validation endpoint and custom key handling.
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.llm import LLMService


class TestApiKeyValidation:
    """Test suite for API key validation."""

    @pytest.mark.asyncio
    async def test_validate_valid_key(self):
        """Test validation with a valid API key."""
        # Mock the HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 200
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_instance.get = AsyncMock(return_value=mock_response)
            mock_client.return_value = mock_instance
            
            # Test the actual LLMService method
            result = await LLMService.validate_api_key("sk-or-v1-test-key")
            assert result["valid"] is True
            assert "error" not in result

    @pytest.mark.asyncio
    async def test_validate_invalid_key(self):
        """Test validation with an invalid API key (401)."""
        mock_response = MagicMock()
        mock_response.status_code = 401
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_instance.get = AsyncMock(return_value=mock_response)
            mock_client.return_value = mock_instance
            
            # Test the actual LLMService method
            result = await LLMService.validate_api_key("invalid-key")
            assert result["valid"] is False
            assert result["error"] == "Invalid API key"
    
    @pytest.mark.asyncio
    async def test_validate_forbidden_key(self):
        """Test validation with a key that lacks permissions (403)."""
        mock_response = MagicMock()
        mock_response.status_code = 403
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_instance.get = AsyncMock(return_value=mock_response)
            mock_client.return_value = mock_instance
            
            # Test the actual LLMService method
            result = await LLMService.validate_api_key("sk-or-v1-no-perms")
            assert result["valid"] is False
            assert result["error"] == "API key does not have permission"
    
    @pytest.mark.asyncio
    async def test_validate_timeout(self):
        """Test validation when request times out."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_instance.get = AsyncMock(
                side_effect=__import__('httpx').TimeoutException("timeout")
            )
            mock_client.return_value = mock_instance
            
            # Test the actual LLMService method
            result = await LLMService.validate_api_key("sk-or-v1-test-key")
            assert result["valid"] is False
            assert "timed out" in result["error"].lower()

    def test_llm_service_custom_api_key(self):
        """Test that LLMService accepts custom API key."""
        custom_key = "sk-or-v1-custom-key"
        service = LLMService(api_key=custom_key)
        
        assert service.api_key == custom_key

    def test_llm_service_default_api_key(self):
        """Test that LLMService uses environment key by default."""
        service = LLMService()
        
        # Should use the config key
        from app.config import config
        assert service.api_key == config.openrouter_api_key


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

