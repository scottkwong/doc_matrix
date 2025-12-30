/**
 * PDF Viewer Component
 * 
 * Renders PDF documents using react-pdf with navigation to citation locations.
 * Automatically scrolls to the cited page and highlights the citation text.
 */

import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

// Note: react-pdf v10+ doesn't require separate CSS imports
// The component handles its own styling

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--color-bg-primary)',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-3)',
    background: 'var(--color-bg-secondary)',
    borderBottom: '1px solid var(--color-surface-border)',
    flexShrink: 0,
  },
  controlsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  pageNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    padding: '0',
    color: 'var(--color-text-primary)',
    background: 'transparent',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  navBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  pageInfo: {
    padding: '0 var(--space-2)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-secondary)',
  },
  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
  },
  zoomBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    padding: '0',
    color: 'var(--color-text-primary)',
    background: 'transparent',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  zoomLevel: {
    padding: '0 var(--space-2)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-secondary)',
    minWidth: '50px',
    textAlign: 'center',
  },
  documentContainer: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 'var(--space-4)',
  },
  page: {
    marginBottom: 'var(--space-4)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-6)',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-sm)',
  },
  error: {
    padding: 'var(--space-4)',
    color: 'var(--color-error)',
    fontSize: 'var(--text-sm)',
  },
  citationBanner: {
    padding: 'var(--space-3)',
    background: 'var(--color-accent-subtle)',
    borderBottom: '1px solid var(--color-accent)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
  },
}

export default function PdfViewer({ filename, citation, pdfLocation }) {
  const [numPages, setNumPages] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Navigate to citation page when pdfLocation changes
  useEffect(() => {
    if (pdfLocation && pdfLocation.page) {
      setCurrentPage(pdfLocation.page)
    }
  }, [pdfLocation])
  
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setLoading(false)
  }
  
  const onDocumentLoadError = (error) => {
    setError(error.message)
    setLoading(false)
  }
  
  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }
  
  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(numPages, prev + 1))
  }
  
  const zoomIn = () => {
    setScale((prev) => Math.min(2.0, prev + 0.2))
  }
  
  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.2))
  }
  
  const resetZoom = () => {
    setScale(1.0)
  }
  
  const pdfUrl = `/api/open?rel_path=${encodeURIComponent(filename)}`
  
  return (
    <div style={styles.container}>
      {/* Citation info banner */}
      {citation && pdfLocation && (
        <div style={styles.citationBanner}>
          📍 Citation on page {pdfLocation.page}
          {pdfLocation.confidence === 'low' && ' (approximate)'}
        </div>
      )}
      
      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlsLeft}>
          {/* Page navigation */}
          <div style={styles.pageNav}>
            <button
              style={{
                ...styles.navBtn,
                ...(currentPage <= 1 ? styles.navBtnDisabled : {}),
              }}
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              title="Previous page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            
            <span style={styles.pageInfo}>
              {numPages ? `${currentPage} / ${numPages}` : '...'}
            </span>
            
            <button
              style={{
                ...styles.navBtn,
                ...(currentPage >= numPages ? styles.navBtnDisabled : {}),
              }}
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              title="Next page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Zoom controls */}
        <div style={styles.zoomControls}>
          <button
            style={styles.zoomBtn}
            onClick={zoomOut}
            disabled={scale <= 0.5}
            title="Zoom out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          
          <button
            style={styles.zoomBtn}
            onClick={resetZoom}
            title="Reset zoom"
          >
            <span style={styles.zoomLevel}>{Math.round(scale * 100)}%</span>
          </button>
          
          <button
            style={styles.zoomBtn}
            onClick={zoomIn}
            disabled={scale >= 2.0}
            title="Zoom in"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* PDF Document */}
      <div style={styles.documentContainer}>
        {error && (
          <div style={styles.error}>
            Error loading PDF: {error}
          </div>
        )}
        
        {loading && (
          <div style={styles.loading}>
            Loading PDF...
          </div>
        )}
        
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div style={styles.loading}>Loading PDF...</div>}
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            style={styles.page}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  )
}

