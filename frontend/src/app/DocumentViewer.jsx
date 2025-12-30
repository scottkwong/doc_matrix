/**
 * Document Viewer Component
 * 
 * Left sidebar panel for viewing documents with citation highlighting.
 * Slides in from the left when a citation is clicked.
 * Automatically scrolls to and highlights the cited text/location.
 */

import { useState, useEffect } from 'react'
import PdfViewer from './viewers/PdfViewer'
import TextViewer from './viewers/TextViewer'
import MarkdownViewer from './viewers/MarkdownViewer'

const styles = {
  panel: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    width: '480px',
    minWidth: '380px',
    maxWidth: '600px',
    height: '100%',
    background: 'var(--color-bg-secondary)',
    borderRight: '1px solid var(--color-surface-border)',
    transition: 'transform var(--transition-normal)',
    overflow: 'hidden',
    flexShrink: 0,
    zIndex: 10,
  },
  panelCollapsed: {
    width: '0',
    minWidth: '0',
    transform: 'translateX(-100%)',
  },
  collapseToggle: {
    position: 'absolute',
    right: '-32px',
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
    borderLeft: 'none',
    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
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
    flex: 1,
    fontSize: 'var(--text-sm)',
    fontWeight: '600',
    color: 'var(--color-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    padding: '0',
    color: 'var(--color-text-muted)',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  closeBtnHover: {
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface-hover)',
  },
  badge: {
    marginLeft: 'var(--space-2)',
    padding: '2px 8px',
    fontSize: 'var(--text-xs)',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    background: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-full)',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-sm)',
  },
  error: {
    padding: 'var(--space-4)',
    color: 'var(--color-error)',
    fontSize: 'var(--text-sm)',
  },
}

export default function DocumentViewer({
  isOpen = false,
  filename = null,
  citation = null,
  onClose,
  onToggle,
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [closeHovered, setCloseHovered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [documentContent, setDocumentContent] = useState(null)
  const [pdfLocation, setPdfLocation] = useState(null)
  
  // Load document content when filename changes
  useEffect(() => {
    if (!filename || !isOpen) {
      setDocumentContent(null)
      setError(null)
      return
    }
    
    const loadDocument = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/documents/${encodeURIComponent(filename)}/content`)
        if (!response.ok) {
          throw new Error('Failed to load document')
        }
        const data = await response.json()
        setDocumentContent(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadDocument()
  }, [filename, isOpen])
  
  // Load PDF location when citation changes
  useEffect(() => {
    if (!citation || !filename || !isOpen || !documentContent) {
      return
    }
    
    // Only translate for PDFs
    if (documentContent.file_type !== 'pdf') {
      return
    }
    
    const loadPdfLocation = async () => {
      try {
        const response = await fetch(
          `/api/documents/${encodeURIComponent(filename)}/resolve_pdf_location`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              char_start: citation.char_start,
              char_end: citation.char_end,
              extraction_version: citation.extraction_version || '1.0',
            }),
          }
        )
        
        if (!response.ok) {
          throw new Error('Failed to translate PDF location')
        }
        
        const data = await response.json()
        setPdfLocation(data)
      } catch (err) {
        console.error('PDF location translation failed:', err)
        // Non-fatal - viewer can still show document
      }
    }
    
    loadPdfLocation()
  }, [citation, filename, isOpen, documentContent])
  
  const handleClose = () => {
    if (onClose) onClose()
  }
  
  const handleToggle = () => {
    if (onToggle) onToggle()
  }
  
  // Determine which viewer to use
  const renderViewer = () => {
    if (loading) {
      return (
        <div style={styles.loading}>
          <div style={styles.spinner}>Loading document...</div>
        </div>
      )
    }
    
    if (error) {
      return (
        <div style={styles.error}>
          Error: {error}
        </div>
      )
    }
    
    if (!documentContent) {
      return null
    }
    
    const fileType = documentContent.file_type
    
    if (fileType === 'pdf') {
      return (
        <PdfViewer
          filename={filename}
          citation={citation}
          pdfLocation={pdfLocation}
        />
      )
    }
    
    if (fileType === 'md') {
      return (
        <MarkdownViewer
          content={documentContent.text}
          citation={citation}
        />
      )
    }
    
    // Default to text viewer for txt, csv, json, etc.
    return (
      <TextViewer
        content={documentContent.text}
        fileType={fileType}
        citation={citation}
      />
    )
  }
  
  return (
    <div
      style={{
        ...styles.panel,
        ...(isOpen ? {} : styles.panelCollapsed),
      }}
    >
      {/* Collapse/expand toggle button */}
      <button
        style={{
          ...styles.collapseToggle,
          ...(isHovered ? styles.collapseToggleHover : {}),
        }}
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={isOpen ? "Hide Document Viewer" : "Show Document Viewer"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isOpen ? (
            <polyline points="15 18 9 12 15 6" />
          ) : (
            <polyline points="9 18 15 12 9 6" />
          )}
        </svg>
      </button>
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          {filename || 'No document selected'}
          {documentContent && documentContent.extraction_method && (
            <span style={styles.badge}>
              v{documentContent.extraction_version}
            </span>
          )}
        </div>
        <button
          style={{
            ...styles.closeBtn,
            ...(closeHovered ? styles.closeBtnHover : {}),
          }}
          onClick={handleClose}
          onMouseEnter={() => setCloseHovered(true)}
          onMouseLeave={() => setCloseHovered(false)}
          title="Close viewer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      
      {/* Document content */}
      <div style={styles.content}>
        {renderViewer()}
      </div>
    </div>
  )
}

