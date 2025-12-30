/**
 * Citation Popover Component
 * 
 * Displays citation details in a floating popover on hover.
 * Shows source file, page number, and quoted text with context.
 */

import { useState, useRef, useEffect } from 'react'

const styles = {
  popover: {
    position: 'fixed',
    zIndex: 'var(--z-popover)',
    maxWidth: '400px',
    padding: 'var(--space-4)',
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-citation-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    animation: 'fadeIn 0.15s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-3)',
    paddingBottom: 'var(--space-2)',
    borderBottom: '1px solid var(--color-surface-border)',
  },
  sourceFile: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--text-sm)',
    fontWeight: '600',
    color: 'var(--color-text-primary)',
  },
  fileIcon: {
    width: '16px',
    height: '16px',
    color: 'var(--color-citation)',
  },
  pageBadge: {
    padding: '2px 8px',
    fontSize: 'var(--text-xs)',
    fontWeight: '500',
    color: 'var(--color-citation)',
    background: 'var(--color-citation-bg)',
    borderRadius: 'var(--radius-full)',
  },
  quote: {
    padding: 'var(--space-3)',
    fontSize: 'var(--text-sm)',
    lineHeight: '1.6',
    color: 'var(--color-text-secondary)',
    background: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    borderLeft: '3px solid var(--color-citation)',
  },
  highlightedText: {
    color: 'var(--color-text-primary)',
    fontWeight: '500',
    background: 'var(--color-citation-bg)',
    padding: '0 2px',
    borderRadius: '2px',
  },
  openButton: {
    marginTop: 'var(--space-3)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-xs)',
    fontWeight: '500',
    color: 'var(--color-accent)',
    background: 'var(--color-accent-subtle)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
}

export default function CitationPopover({ 
  citation, 
  anchorRect, 
  onClose,
  onOpenDocument 
}) {
  const popoverRef = useRef(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  
  useEffect(() => {
    if (!anchorRect || !popoverRef.current) return
    
    const popoverRect = popoverRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let top = anchorRect.bottom + 8
    let left = anchorRect.left
    
    // Adjust if overflowing right
    if (left + popoverRect.width > viewportWidth - 16) {
      left = viewportWidth - popoverRect.width - 16
    }
    
    // Adjust if overflowing bottom - show above instead
    if (top + popoverRect.height > viewportHeight - 16) {
      top = anchorRect.top - popoverRect.height - 8
    }
    
    // Ensure not off-screen left
    if (left < 16) left = 16
    
    setPosition({ top, left })
  }, [anchorRect])
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose()
      }
    }
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])
  
  if (!citation) return null
  
  // Build context display with highlighted quoted text
  const renderContext = () => {
    const { context, text } = citation
    if (!context) return <span style={styles.highlightedText}>{text}</span>
    
    const idx = context.indexOf(text)
    if (idx === -1) {
      return (
        <>
          <span style={styles.highlightedText}>{text}</span>
          {context && <div style={{ marginTop: '8px', opacity: 0.7 }}>{context}</div>}
        </>
      )
    }
    
    return (
      <>
        {context.slice(0, idx)}
        <span style={styles.highlightedText}>{text}</span>
        {context.slice(idx + text.length)}
      </>
    )
  }
  
  const handleOpenDocument = () => {
    if (onOpenDocument) {
      onOpenDocument(citation.source_file)
    }
  }
  
  return (
    <div
      ref={popoverRef}
      style={{
        ...styles.popover,
        top: position.top,
        left: position.left,
      }}
    >
      <div style={styles.header}>
        <div style={styles.sourceFile}>
          <svg style={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="truncate" style={{ maxWidth: '200px' }}>
            {citation.source_file}
          </span>
        </div>
        {citation.page !== 0 && (
          <span style={styles.pageBadge}>
            {typeof citation.page === 'number' ? `Page ${citation.page}` : citation.page}
          </span>
        )}
      </div>
      
      <div style={styles.quote}>
        {renderContext()}
      </div>
      
      <button
        style={styles.openButton}
        onClick={handleOpenDocument}
        onMouseEnter={(e) => e.target.style.background = 'var(--color-accent-subtle)'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Open in document
      </button>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

