# API Key Selection Feature

## Overview

This feature allows users to toggle between using an environment-configured OpenRouter API key and a custom API key provided through the UI. The custom key is validated, obfuscated for security, and persisted in localStorage.

## Components Added/Modified

### Backend Changes

#### 1. `backend/app/api.py`
- **Added**: `/api/validate-api-key` endpoint
  - Validates OpenRouter API keys by making a test request to OpenRouter's `/api/v1/key` endpoint
  - The `/api/v1/key` endpoint requires valid authentication (unlike `/api/v1/models` which is public)
  - Returns validation status and error messages
  - Handles various HTTP status codes (401, 403, etc.)

- **Modified**: `get_services()` function
  - Now checks for `X-OpenRouter-API-Key` header in requests
  - Creates LLMService with custom key if header is present
  - Falls back to environment key if header is not present

#### 2. `backend/app/services/llm.py`
- Already supported custom API keys via the `api_key` parameter in `__init__`
- No changes needed - existing implementation works perfectly

### Frontend Changes

#### 1. `frontend/src/app/ApiKeySelector.jsx` (NEW)
A complete React component that provides:
- **Toggle**: Switch between "Environment" and "Custom" API key sources
- **Environment Mode**:
  - Shows obfuscated environment key in green if one exists
  - Shows "None" in red if no environment key is configured
- **Custom Mode**:
  - Text input field for pasting API keys
  - White text while editing
  - Turns green when validation succeeds
  - Turns red when validation fails
  - Shows error tooltip on validation failure
  - Auto-validates on blur (when user clicks away)
  - Manual "Test" button for explicit validation
  - Persists key to localStorage on successful validation
  - Deletes from localStorage when key is cleared

**Key Features**:
- Obfuscation: Shows first 4 chars + `*...*` + last 4 chars (e.g., `sk-o*...*cdef`)
- Click obfuscated key to edit
- Press Enter to blur and trigger validation
- Tooltip appears near input field on validation errors
- Click outside to dismiss tooltip

#### 2. `frontend/src/app/Header.jsx`
- **Modified**: Added `ApiKeySelector` component to controls row
- **Location**: Positioned to the right of the Mode toggle, before the spacer
- **Props**: Receives `envKeyExists` and `onApiKeyChange` callback

#### 3. `frontend/src/App.jsx`
- **Added State**:
  - `envKeyExists`: Boolean indicating if environment key is configured
  - `customApiKey`: Stores the current custom API key
- **Added Handler**: `handleApiKeyChange()` updates state and global API context
- **Modified**: Loads `has_api_key` from settings endpoint on mount
- **Modified**: Passes props to Header component

#### 4. `frontend/src/shell/useApi.js`
- **Added**: Global `customApiKey` variable
- **Added**: `setCustomApiKey()` function to update the global key
- **Modified**: `apiCall()` now includes `X-OpenRouter-API-Key` header when custom key is set
- **Exported**: `setCustomApiKey` for use by App.jsx

### Configuration Changes

#### `backend/app/config.py`
- No changes needed
- Existing `openrouter_api_key` configuration works as expected

## API Flow

### Setting a Custom Key

1. User toggles to "Custom" mode
2. User pastes API key into text field
3. User clicks away (blur) or clicks "Test" button
4. Frontend calls `POST /api/validate-api-key` with the key
5. Backend validates key against OpenRouter
6. On success:
   - Key is saved to localStorage
   - Input turns green
   - Key is obfuscated when not editing
   - All subsequent API calls include `X-OpenRouter-API-Key` header
7. On failure:
   - Error tooltip appears
   - Input turns red
   - Key is not saved

### Using the Custom Key

1. Every API call from frontend checks for `customApiKey`
2. If set, includes `X-OpenRouter-API-Key` header
3. Backend's `get_services()` checks for this header
4. If present, creates `LLMService` with custom key
5. If not present, uses environment key

### Clearing the Custom Key

1. User toggles back to "Environment" or clears the text field
2. localStorage entry is removed
3. `customApiKey` is set to null
4. Future API calls use environment key

## Security Considerations

### Storage Security
- **localStorage**: Keys are stored in browser localStorage
  - Scoped to the app's origin (localhost for dev, app domain for production)
  - Not accessible to other websites
  - In a desktop app (webview), only accessible to the app itself
  - Can be accessed if someone has file system access to the user's machine

### Display Security
- **Obfuscation**: Keys are obfuscated as `sk-o*...*cdef`
  - First 4 and last 4 characters visible
  - Middle characters replaced with bullets (•)
  - Raw key only visible while actively editing

### Transmission Security
- **HTTPS**: All API calls should use HTTPS in production
- **Headers**: Custom key sent via HTTP header (standard practice)
- **No Logging**: Key is not logged by frontend or backend

### Best Practices
- User can delete key from localStorage by clearing the field
- Environment key preferred for production deployments
- Custom key useful for:
  - Testing with different accounts
  - Personal API keys vs. shared environment keys
  - Development/debugging

## Testing

### Unit Tests
File: `backend/tests/test_api_key_validation.py`

Tests include:
- LLMService accepts custom API key
- LLMService uses environment key by default
- Key obfuscation logic works correctly
- Validation endpoint logic (mocked)

Run tests:
```bash
pytest backend/tests/test_api_key_validation.py -v
```

### Manual Testing Checklist

#### Environment Key Display
- [ ] With environment key set: Shows obfuscated key in green
- [ ] Without environment key: Shows "None" in red

#### Custom Key Entry
- [ ] Toggle to "Custom" mode
- [ ] Paste valid key
- [ ] Input shows white text while editing
- [ ] Click away triggers validation
- [ ] Successful validation: Input turns green, key is obfuscated
- [ ] Failed validation: Input turns red, error tooltip appears
- [ ] "Test" button validates explicitly
- [ ] Press Enter to blur and validate

#### Persistence
- [ ] Custom key persists across page reloads
- [ ] Custom key starts in valid state (green) after reload
- [ ] Clearing field removes from localStorage
- [ ] Toggling to Environment removes custom key from use

#### API Integration
- [ ] API calls with custom key work correctly
- [ ] Backend logs show requests (optional: verify custom key is used)
- [ ] LLM requests succeed with custom key
- [ ] Toggling back to environment key works correctly

## Configuration Reference

### Environment Variables
```bash
# .env file
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### localStorage Key
```javascript
// Frontend localStorage key
const API_KEY_STORAGE_KEY = 'doc_matrix_user_api_key'
```

### HTTP Headers
```javascript
// Custom API key header
'X-OpenRouter-API-Key': 'sk-or-v1-your-custom-key'
```

## Troubleshooting

### Key Not Working
1. Check validation response in browser console
2. Verify key format starts with `sk-or-v1-`
3. Check OpenRouter account status
4. Try testing key directly at openrouter.ai

### Key Not Persisting
1. Check browser localStorage in DevTools
2. Look for `doc_matrix_user_api_key` entry
3. Verify no browser security restrictions
4. Check for localStorage quota issues

### Validation Errors
- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: Key doesn't have permission
- **Timeout**: Network issues or OpenRouter down
- **Other**: Check browser console and backend logs

## Future Enhancements

Potential improvements:
1. Encrypt keys in localStorage using Web Crypto API
2. Add key expiration/refresh logic
3. Support multiple saved keys with labels
4. Add usage tracking per key
5. Integrate with OpenRouter's key management API
6. Add warning when environment key is missing
7. Show key permissions/limits from OpenRouter

