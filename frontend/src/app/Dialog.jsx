/**
 * Custom Dialog Component
 * 
 * Provides modal dialog functionality to replace native browser dialogs
 * (prompt, confirm, alert) which don't work reliably in pywebview.
 * 
 * Supports:
 * - Prompt dialogs (text input)
 * - Confirmation dialogs (yes/no)
 * - Alert dialogs (info only)
 */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(4px)',
  },
  dialog: {
    background: 'var(--color-bg-elevated)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    minWidth: '400px',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '1px solid var(--color-surface-border)',
  },
  header: {
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--color-surface-border)',
  },
  title: {
    fontSize: 'var(--text-lg)',
    fontWeight: '600',
    color: 'var(--color-text-primary)',
    margin: 0,
  },
  body: {
    padding: 'var(--space-4)',
  },
  message: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-3)',
    lineHeight: '1.5',
  },
  input: {
    width: '100%',
    padding: 'var(--space-3)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '80px',
  },
  inputFocus: {
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 0 3px var(--color-accent-subtle)',
  },
  footer: {
    padding: 'var(--space-4)',
    borderTop: '1px solid var(--color-surface-border)',
    display: 'flex',
    gap: 'var(--space-2)',
    justifyContent: 'flex-end',
  },
  button: {
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    fontFamily: 'inherit',
  },
  buttonPrimary: {
    background: 'var(--color-accent)',
    color: 'white',
  },
  buttonPrimaryHover: {
    background: 'var(--color-accent-hover)',
    transform: 'translateY(-1px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  buttonSecondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-surface-border)',
  },
  buttonSecondaryHover: {
    background: 'var(--color-bg-secondary)',
    borderColor: 'var(--color-text-muted)',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}

/**
 * Dialog component that renders in a portal.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is visible
 * @param {function} props.onClose - Callback when dialog is closed
 * @param {function} props.onConfirm - Callback when confirmed/submitted
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message/prompt
 * @param {string} props.type - Dialog type: 'prompt', 'confirm', or 'alert'
 * @param {string} props.defaultValue - Default value for prompt input
 * @param {string} props.confirmText - Text for confirm button
 * @param {string} props.cancelText - Text for cancel button
 */
export default function Dialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Dialog',
  message = '',
  type = 'alert',
  defaultValue = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
}) {
  const [value, setValue] = useState(defaultValue)
  const [isFocused, setIsFocused] = useState(false)
  const [primaryHovered, setPrimaryHovered] = useState(false)
  const [secondaryHovered, setSecondaryHovered] = useState(false)
  const inputRef = useRef(null)

  // Reset value when dialog opens
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue)
      // Focus input after a brief delay to ensure it's rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, defaultValue])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // For prompts, allow shift+enter for new lines
        if (type === 'prompt' && e.target.tagName === 'TEXTAREA') {
          return
        }
        e.preventDefault()
        handleConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, type, value, onClose, onConfirm])

  const handleConfirm = () => {
    if (type === 'prompt') {
      onConfirm(value)
    } else {
      onConfirm()
    }
  }

  const handleOverlayClick = (e) => {
    // Close dialog if clicking directly on overlay (not on dialog content)
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  const canConfirm = type !== 'prompt' || value.trim().length > 0

  return createPortal(
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.dialog} role="dialog" aria-modal="true">
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
        </div>

        <div style={styles.body}>
          {message && <p style={styles.message}>{message}</p>}
          
          {type === 'prompt' && (
            <textarea
              ref={inputRef}
              style={{
                ...styles.input,
                ...(isFocused ? styles.inputFocus : {}),
              }}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Enter text..."
            />
          )}
        </div>

        <div style={styles.footer}>
          {type !== 'alert' && (
            <button
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
                ...(secondaryHovered ? styles.buttonSecondaryHover : {}),
              }}
              onClick={onClose}
              onMouseEnter={() => setSecondaryHovered(true)}
              onMouseLeave={() => setSecondaryHovered(false)}
            >
              {cancelText}
            </button>
          )}
          
          <button
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              ...(primaryHovered && canConfirm ? styles.buttonPrimaryHover : {}),
              ...(!canConfirm ? styles.buttonDisabled : {}),
            }}
            onClick={handleConfirm}
            onMouseEnter={() => setPrimaryHovered(true)}
            onMouseLeave={() => setPrimaryHovered(false)}
            disabled={!canConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}


