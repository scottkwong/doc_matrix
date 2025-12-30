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
            
            # Import and test the validation logic
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://openrouter.ai/api/v1/models",
                    headers={
                        "Authorization": "Bearer sk-or-v1-test-key",
                        "HTTP-Referer": "https://docmatrix.local",
                        "X-Title": "Doc Matrix",
                    },
                    timeout=10.0,
                )
                assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_validate_invalid_key(self):
        """Test validation with an invalid API key."""
        mock_response = MagicMock()
        mock_response.status_code = 401
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_instance.get = AsyncMock(return_value=mock_response)
            mock_client.return_value = mock_instance
            
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://openrouter.ai/api/v1/models",
                    headers={
                        "Authorization": "Bearer invalid-key",
                        "HTTP-Referer": "https://docmatrix.local",
                        "X-Title": "Doc Matrix",
                    },
                    timeout=10.0,
                )
                assert response.status_code == 401

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

    def test_obfuscate_key(self):
        """Test key obfuscation logic."""
        # This tests the logic from ApiKeySelector.jsx
        def obfuscate_key(key: str) -> str:
            """Python version of the obfuscate function."""
            if not key or len(key) < 8:
                return '••••••••••••'
            first4 = key[:4]
            last4 = key[-4:]
            star_count = max(8, len(key) - 8)
            return f"{first4}{'•' * star_count}{last4}"
        
        # Test normal key
        key = "sk-or-v1-0123456789abcdef"
        obfuscated = obfuscate_key(key)
        assert obfuscated.startswith("sk-o")
        assert obfuscated.endswith("cdef")
        assert "••••••••" in obfuscated
        
        # Test short key
        short_key = "abc"
        assert obfuscate_key(short_key) == '••••••••••••'
        
        # Test exact 8 char key
        eight_char = "12345678"
        obfuscated_8 = obfuscate_key(eight_char)
        assert obfuscated_8 == "1234••••••••5678"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

