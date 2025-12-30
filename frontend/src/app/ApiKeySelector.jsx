/**
 * ApiKeySelector Component
 * 
 * Allows toggling between environment and user-provided OpenRouter API keys.
 * Features key validation, obfuscation, and localStorage persistence.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApi } from '../shell/useApi'

const API_KEY_STORAGE_KEY = 'doc_matrix_user_api_key'

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  label: {
    fontSize: 'var(--text-xs)',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  toggle: {
    display: 'flex',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  toggleOption: {
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  toggleOptionActive: {
    color: 'var(--color-text-primary)',
    background: 'var(--color-accent-subtle)',
  },
  keyDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'monospace',
    background: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    minWidth: '200px',
  },
  keyDisplayGreen: {
    color: '#10b981',
  },
  keyDisplayRed: {
    color: '#ef4444',
  },
  keyDisplayWhite: {
    color: 'var(--color-text-primary)',
  },
  input: {
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'monospace',
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-md)',
    minWidth: '300px',
    outline: 'none',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputSuccess: {
    borderColor: '#10b981',
  },
  testButton: {
    padding: 'var(--space-1) var(--space-2)',
    fontSize: 'var(--text-xs)',
    fontWeight: '500',
    color: 'var(--color-accent)',
    background: 'transparent',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    whiteSpace: 'nowrap',
  },
  tooltip: {
    position: 'absolute',
    zIndex: 1000,
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-xs)',
    color: 'white',
    background: '#ef4444',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    maxWidth: '300px',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  },
}

/**
 * Obfuscate an API key for display (show first 4 and last 4 chars).
 * 
 * @param {string} key - The API key to obfuscate
 * @returns {string} Obfuscated key in format: xxxx*...*yyyy
 */
function obfuscateKey(key) {
  if (!key || key.length < 8) {
    return '*...*'
  }
  const first4 = key.slice(0, 4)
  const last4 = key.slice(-4)
  return `${first4}*...*${last4}`
}

export default function ApiKeySelector({ envKeyExists, onKeyChange }) {
  const [useEnvironment, setUseEnvironment] = useState(true)
  const [userKey, setUserKey] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [validationState, setValidationState] = useState('idle') // 'idle', 'validating', 'valid', 'invalid'
  const [validationError, setValidationError] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const { post } = useApi()

  // Load user key from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY)
    if (stored) {
      setUserKey(stored)
      setUseEnvironment(false)
      setValidationState('valid') // Assume valid if stored
      // Notify parent
      if (onKeyChange) {
        onKeyChange(stored)
      }
    }
  }, [onKeyChange])

  // Notify parent when key source changes
  useEffect(() => {
    if (onKeyChange) {
      if (useEnvironment) {
        onKeyChange(null) // Use environment key
      } else if (userKey && validationState === 'valid') {
        onKeyChange(userKey)
      } else {
        onKeyChange(null)
      }
    }
  }, [useEnvironment, userKey, validationState, onKeyChange])

  const validateKey = useCallback(async (key) => {
    if (!key || key.trim().length === 0) {
      setValidationState('idle')
      setValidationError('')
      return
    }

    setValidationState('validating')
    setValidationError('')
    
    try {
      const response = await post('/validate-api-key', { api_key: key })
      
      if (response.valid) {
        setValidationState('valid')
        setValidationError('')
        // Save to localStorage
        localStorage.setItem(API_KEY_STORAGE_KEY, key)
        // Notify parent
        if (onKeyChange) {
          onKeyChange(key)
        }
      } else {
        setValidationState('invalid')
        setValidationError(response.error || 'Invalid API key')
        // Calculate tooltip position
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect()
          setTooltipPosition({
            top: rect.bottom + 8,
            left: rect.left,
          })
          setShowTooltip(true)
        }
      }
    } catch (error) {
      setValidationState('invalid')
      const errorMsg = error.message || 'Failed to validate API key'
      setValidationError(errorMsg)
      // Calculate tooltip position
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect()
        setTooltipPosition({
          top: rect.bottom + 8,
          left: rect.left,
        })
        setShowTooltip(true)
      }
    }
  }, [post, onKeyChange])

  const handleToggleSource = useCallback((toEnvironment) => {
    setUseEnvironment(toEnvironment)
    if (!toEnvironment && !userKey) {
      // Switching to user key but none exists - enter edit mode
      setIsEditing(true)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
    setShowTooltip(false)
  }, [userKey])

  const handleInputFocus = useCallback(() => {
    setIsEditing(true)
    setShowTooltip(false)
  }, [])

  const handleInputBlur = useCallback(() => {
    if (userKey && userKey.trim().length > 0) {
      setIsEditing(false)
      // Validate on blur if key has changed
      validateKey(userKey)
    } else if (!userKey || userKey.trim().length === 0) {
      // If empty, clear everything
      setIsEditing(false)
      setValidationState('idle')
      localStorage.removeItem(API_KEY_STORAGE_KEY)
      if (onKeyChange) {
        onKeyChange(null)
      }
    }
  }, [userKey, validateKey, onKeyChange])

  const handleInputChange = useCallback((e) => {
    const value = e.target.value
    setUserKey(value)
    setValidationState('idle')
    setValidationError('')
    setShowTooltip(false)
  }, [])

  const handleTestClick = useCallback(() => {
    if (userKey && userKey.trim().length > 0) {
      validateKey(userKey)
    }
  }, [userKey, validateKey])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    }
  }, [])

  // Hide tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowTooltip(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const renderKeyDisplay = () => {
    if (useEnvironment) {
      // Show environment key status
      if (envKeyExists) {
        return (
          <div style={{ ...styles.keyDisplay, ...styles.keyDisplayGreen }}>
            {obfuscateKey('sk-or-v1-0000000000000000000000000000000000000000')}
          </div>
        )
      } else {
        return (
          <div style={{ ...styles.keyDisplay, ...styles.keyDisplayRed }}>
            None
          </div>
        )
      }
    } else {
      // User-provided key
      if (isEditing) {
        // Show input field
        const inputStyle = {
          ...styles.input,
          ...(validationState === 'invalid' ? styles.inputError : {}),
          ...(validationState === 'valid' ? styles.inputSuccess : {}),
        }
        return (
          <>
            <input
              ref={inputRef}
              type="text"
              value={userKey}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              placeholder="Paste your OpenRouter API key"
              style={inputStyle}
            />
            <button
              style={styles.testButton}
              onClick={handleTestClick}
              disabled={validationState === 'validating'}
            >
              {validationState === 'validating' ? 'Testing...' : 'Test'}
            </button>
          </>
        )
      } else {
        // Show obfuscated key
        if (userKey && userKey.trim().length > 0) {
          const color = validationState === 'valid' 
            ? styles.keyDisplayGreen 
            : validationState === 'invalid'
            ? styles.keyDisplayRed
            : styles.keyDisplayWhite
          
          return (
            <div
              style={{ ...styles.keyDisplay, ...color, cursor: 'pointer' }}
              onClick={() => {
                setIsEditing(true)
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
              title="Click to edit"
            >
              {obfuscateKey(userKey)}
            </div>
          )
        } else {
          return (
            <div
              style={{ ...styles.keyDisplay, ...styles.keyDisplayRed, cursor: 'pointer' }}
              onClick={() => {
                setIsEditing(true)
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
            >
              Click to enter key
            </div>
          )
        }
      }
    }
  }

  return (
    <div ref={containerRef} style={styles.container}>
      <span style={styles.label}>API Key</span>
      
      <div style={styles.toggle}>
        <button
          style={{
            ...styles.toggleOption,
            ...(useEnvironment ? styles.toggleOptionActive : {}),
          }}
          onClick={() => handleToggleSource(true)}
        >
          Environment
        </button>
        <button
          style={{
            ...styles.toggleOption,
            ...(!useEnvironment ? styles.toggleOptionActive : {}),
          }}
          onClick={() => handleToggleSource(false)}
        >
          Custom
        </button>
      </div>
      
      {renderKeyDisplay()}
      
      {/* Error tooltip */}
      {showTooltip && validationError && (
        <div
          style={{
            ...styles.tooltip,
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {validationError}
        </div>
      )}
    </div>
  )
}

