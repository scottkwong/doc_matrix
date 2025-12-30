/**
 * Chat Panel Component
 * 
 * Right sidebar for Q&A chat with documents. Supports citations
 * in responses and conversation history.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { CitedText } from './citations/CitationIndicator'

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    width: '380px',
    minWidth: '320px',
    maxWidth: '480px',
    height: '100%',
    background: 'var(--color-bg-secondary)',
    borderLeft: '1px solid var(--color-surface-border)',
    transition: 'transform var(--transition-normal)',
    overflow: 'hidden',
    flexShrink: 0,
  },
  panelCollapsed: {
    width: '0',
    minWidth: '0',
    transform: 'translateX(100%)',
  },
  collapseToggle: {
    position: 'absolute',
    left: '-32px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '64px',
    padding: '0',
    color: 'var(--color-text-muted)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-surface-border)',
    borderRight: 'none',
    borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    zIndex: 1,
  },
  collapseToggleHover: {
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface-hover)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--color-surface-border)',
    flexShrink: 0,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--text-base)',
    fontWeight: '600',
    color: 'var(--color-text-primary)',
  },
  headerIcon: {
    width: '20px',
    height: '20px',
    color: 'var(--color-accent)',
  },
  clearBtn: {
    padding: 'var(--space-1) var(--space-2)',
    fontSize: 'var(--text-xs)',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    background: 'transparent',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  clearBtnHover: {
    color: 'var(--color-text-primary)',
    borderColor: 'var(--color-text-muted)',
  },
  messages: {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    minHeight: 0,
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-6)',
    textAlign: 'center',
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    color: 'var(--color-text-muted)',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-muted)',
  },
  message: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    animation: 'fadeInUp 0.2s ease',
  },
  messageUser: {
    alignItems: 'flex-end',
  },
  messageAssistant: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '90%',
    padding: 'var(--space-3)',
    fontSize: 'var(--text-sm)',
    lineHeight: '1.6',
    borderRadius: 'var(--radius-lg)',
  },
  bubbleUser: {
    color: 'white',
    background: 'var(--color-accent)',
    borderBottomRightRadius: 'var(--radius-sm)',
  },
  bubbleAssistant: {
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface)',
    borderBottomLeftRadius: 'var(--radius-sm)',
  },
  messageTime: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    paddingLeft: 'var(--space-2)',
    paddingRight: 'var(--space-2)',
  },
  inputArea: {
    padding: 'var(--space-4)',
    borderTop: '1px solid var(--color-surface-border)',
    flexShrink: 0,
  },
  inputWrapper: {
    display: 'flex',
    gap: 'var(--space-2)',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    padding: 'var(--space-3)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-lg)',
    resize: 'none',
    minHeight: '44px',
    maxHeight: '120px',
    outline: 'none',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-body)',
  },
  textareaFocus: {
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 0 3px var(--color-accent-subtle)',
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    padding: '0',
    color: 'white',
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  sendBtnHover: {
    background: 'var(--color-accent-hover)',
  },
  loadingDots: {
    display: 'flex',
    gap: '4px',
    padding: 'var(--space-3)',
  },
  dot: {
    width: '8px',
    height: '8px',
    background: 'var(--color-text-muted)',
    borderRadius: '50%',
    animation: 'bounce 1.4s infinite ease-in-out both',
  },
}

function LoadingMessage() {
  return (
    <div style={{ ...styles.message, ...styles.messageAssistant }}>
      <div style={{ ...styles.messageBubble, ...styles.bubbleAssistant }}>
        <div style={styles.loadingDots}>
          <span style={{ ...styles.dot, animationDelay: '-0.32s' }} />
          <span style={{ ...styles.dot, animationDelay: '-0.16s' }} />
          <span style={styles.dot} />
        </div>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  )
}

function ChatMessage({ message, onOpenDocument }) {
  const isUser = message.role === 'user'
  
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString(undefined, { 
      hour: 'numeric', 
      minute: '2-digit' 
    })
  }
  
  return (
    <div style={{ 
      ...styles.message, 
      ...(isUser ? styles.messageUser : styles.messageAssistant) 
    }}>
      <div style={{ 
        ...styles.messageBubble, 
        ...(isUser ? styles.bubbleUser : styles.bubbleAssistant) 
      }}>
        {isUser ? (
          message.content
        ) : (
          <CitedText 
            text={message.content}
            citations={message.citations || []}
            onOpenDocument={onOpenDocument}
          />
        )}
      </div>
      <span style={styles.messageTime}>
        {formatTime(message.timestamp)}
      </span>
    </div>
  )
}

export default function ChatPanel({
  messages = [],
  isLoading = false,
  disabled = false,
  isCollapsed = false,
  onToggleCollapse,
  onSendMessage,
  onClearHistory,
  onOpenDocument,
}) {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [clearHovered, setClearHovered] = useState(false)
  const [sendHovered, setSendHovered] = useState(false)
  const [toggleHovered, setToggleHovered] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])
  
  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (trimmed && !isLoading && !disabled) {
      onSendMessage(trimmed)
      setInput('')
    }
  }, [input, isLoading, disabled, onSendMessage])
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])
  
  const handleClear = useCallback(() => {
    if (messages.length > 0 && window.confirm('Clear chat history?')) {
      onClearHistory()
    }
  }, [messages.length, onClearHistory])
  
  const canSend = input.trim() && !isLoading && !disabled
  
  // Reverse messages to show newest at top (iPhone style)
  const displayMessages = [...messages].reverse()
  
  return (
    <div style={{ 
      ...styles.panel, 
      ...(isCollapsed ? styles.panelCollapsed : {}),
      position: 'relative',
    }}>
      <button
        style={{
          ...styles.collapseToggle,
          ...(toggleHovered ? styles.collapseToggleHover : {}),
        }}
        onClick={onToggleCollapse}
        onMouseEnter={() => setToggleHovered(true)}
        onMouseLeave={() => setToggleHovered(false)}
        title={isCollapsed ? "Show Q&A Panel" : "Hide Q&A Panel"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isCollapsed ? (
            <polyline points="15 18 9 12 15 6" />
          ) : (
            <polyline points="9 18 15 12 9 6" />
          )}
        </svg>
      </button>
      
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <svg style={styles.headerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Folder Q&A
        </div>
        <button
          style={{
            ...styles.clearBtn,
            ...(clearHovered ? styles.clearBtnHover : {}),
          }}
          onClick={handleClear}
          onMouseEnter={() => setClearHovered(true)}
          onMouseLeave={() => setClearHovered(false)}
          disabled={messages.length === 0}
        >
          Clear
        </button>
      </div>
      
      <div style={{
        ...styles.messages,
        flexDirection: 'column-reverse', // Reverse the flex direction for iPhone-style chat
      }}>
        {messages.length === 0 && !isLoading ? (
          <div style={styles.emptyState}>
            <svg style={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p style={styles.emptyText}>
              Ask questions about your documents.<br />
              Answers will include citations to the source.
            </p>
          </div>
        ) : (
          <>
            <div ref={messagesEndRef} />
            {isLoading && <LoadingMessage />}
            {displayMessages.map((message) => (
              <ChatMessage
                key={message.id || message.timestamp}
                message={message}
                onOpenDocument={onOpenDocument}
              />
            ))}
          </>
        )}
      </div>
      
      <div style={styles.inputArea}>
        <div style={styles.inputWrapper}>
          <textarea
            ref={textareaRef}
            style={{
              ...styles.textarea,
              ...(isFocused ? styles.textareaFocus : {}),
            }}
            placeholder={disabled ? "Select a project first..." : "Ask a question about your documents..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            rows={1}
          />
          <button
            style={{
              ...styles.sendBtn,
              ...(!canSend ? styles.sendBtnDisabled : {}),
              ...(sendHovered && canSend ? styles.sendBtnHover : {}),
            }}
            onClick={handleSubmit}
            onMouseEnter={() => setSendHovered(true)}
            onMouseLeave={() => setSendHovered(false)}
            disabled={!canSend}
            title="Send message"
          >
            {isLoading ? (
              <div style={{ width: '20px', height: '20px' }} className="spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

