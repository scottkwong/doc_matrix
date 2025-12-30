/**
 * Matrix Cell Component
 * 
 * Displays a single cell in the document matrix with answer text,
 * citation indicators, status, and refresh controls. Supports
 * markdown rendering and resizable cells.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CitedText } from './citations/CitationIndicator'

const styles = {
  cell: {
    position: 'relative',
    minHeight: '80px',
    minWidth: '200px',
    padding: 'var(--space-3)',
    background: 'var(--color-surface)',
    border: '1px solid white',
    borderRadius: 'var(--radius-md)',
    transition: 'border-color var(--transition-fast)',
    overflow: 'auto',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
    // Ensure cells stay below sticky headers
    zIndex: 1,
  },
  cellResizable: {
    cursor: 'default',
  },
  resizeHandleRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '6px',
    height: '100%',
    cursor: 'ew-resize',
    zIndex: 10,
    pointerEvents: 'all',
  },
  resizeHandleBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '6px',
    cursor: 'ns-resize',
    zIndex: 10,
    pointerEvents: 'all',
  },
  resizeHandleCorner: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '20px',
    height: '20px',
    cursor: 'nwse-resize',
    zIndex: 11,
    opacity: 0,
    transition: 'opacity var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-muted)',
    pointerEvents: 'all',
  },
  resizeHandleCornerVisible: {
    opacity: 1,
  },
  resizeIndicator: {
    position: 'absolute',
    background: 'var(--color-accent)',
    opacity: 0,
    transition: 'opacity var(--transition-fast)',
    pointerEvents: 'none',
  },
  resizeIndicatorRight: {
    top: 0,
    right: 0,
    width: '2px',
    height: '100%',
  },
  resizeIndicatorBottom: {
    bottom: 0,
    left: 0,
    width: '100%',
    height: '2px',
  },
  resizeIndicatorVisible: {
    opacity: 0.5,
  },
  cellHover: {
    borderColor: 'var(--color-accent)',
  },
  cellSummary: {
    background: 'var(--color-bg-elevated)',
    borderColor: 'var(--color-accent)',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
  },
  cellOverall: {
    background: 'linear-gradient(135deg, var(--color-accent-subtle) 0%, var(--color-bg-elevated) 100%)',
    borderColor: 'var(--color-accent)',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
  },
  cellError: {
    borderColor: 'var(--color-error)',
    background: 'var(--color-error-bg)',
  },
  cellPending: {
    opacity: 0.6,
  },
  cellRunning: {
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 0 2px var(--color-accent-subtle)',
  },
  content: {
    fontSize: 'var(--text-sm)',
    lineHeight: '1.6',
    color: 'var(--color-text-primary)',
    wordBreak: 'break-word',
  },
  markdown: {
    '& p': {
      margin: '0.5em 0',
    },
    '& p:first-child': {
      marginTop: 0,
    },
    '& p:last-child': {
      marginBottom: 0,
    },
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      marginTop: '0.75em',
      marginBottom: '0.5em',
      fontWeight: '600',
    },
    '& ul, & ol': {
      marginLeft: '1.5em',
      marginTop: '0.5em',
      marginBottom: '0.5em',
    },
    '& code': {
      background: 'var(--color-bg-tertiary)',
      padding: '0.125em 0.25em',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.9em',
    },
    '& pre': {
      background: 'var(--color-bg-tertiary)',
      padding: 'var(--space-2)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'auto',
    },
    '& strong': {
      fontWeight: '600',
    },
    '& em': {
      fontStyle: 'italic',
    },
  },
  expandButton: {
    marginTop: 'var(--space-2)',
    padding: '0',
    fontSize: 'var(--text-xs)',
    fontWeight: '500',
    color: 'var(--color-accent)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  controls: {
    position: 'absolute',
    top: 'var(--space-2)',
    right: 'var(--space-2)',
    display: 'flex',
    gap: 'var(--space-1)',
    opacity: 0,
    transition: 'opacity var(--transition-fast)',
  },
  controlsVisible: {
    opacity: 1,
  },
  controlBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    padding: '0',
    color: 'var(--color-text-muted)',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  controlBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  controlBtnHover: {
    color: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    background: 'var(--color-accent-subtle)',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 'var(--space-2)',
    left: 'var(--space-2)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    padding: 'var(--space-1) var(--space-2)',
    fontSize: 'var(--text-xs)',
    borderRadius: 'var(--radius-sm)',
  },
  statusPending: {
    color: 'var(--color-text-muted)',
    background: 'var(--color-surface)',
  },
  statusRunning: {
    color: 'var(--color-accent)',
    background: 'var(--color-accent-subtle)',
  },
  statusCompleted: {
    color: 'var(--color-success)',
    background: 'var(--color-success-bg)',
  },
  statusError: {
    color: 'var(--color-error)',
    background: 'var(--color-error-bg)',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60px',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-sm)',
    fontStyle: 'italic',
  },
  spinner: {
    width: '12px',
    height: '12px',
    border: '2px solid var(--color-surface-border)',
    borderTopColor: 'var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}

export default function MatrixCell({
  result,
  isSummary = false,
  isOverall = false,
  onRefresh,
  onOpenDocument,
  isRefreshing = false,
  cellHeight,
  onManualResize,
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [refreshBtnHovered, setRefreshBtnHovered] = useState(false)
  const [hoveredEdge, setHoveredEdge] = useState(null) // 'right', 'bottom', 'corner', or null
  const cellRef = useRef(null)
  const isResizing = useRef(false)
  const resizeStartSize = useRef({ width: 0, height: 0 })
  const resizeMode = useRef(null) // 'horizontal', 'vertical', or 'both'
  
  // Only show status if we have a result or are actively refreshing
  const status = isRefreshing ? 'running' : result?.status
  const answer = result?.answer || ''
  const citations = result?.citations || []
  const hasError = status === 'error'
  
  const getCellStyle = () => {
    let style = { 
      ...styles.cell,
      ...(onManualResize ? styles.cellResizable : {})
    }
    
    // Only apply height constraints (width is controlled by grid template)
    if (cellHeight) {
      style = { 
        ...style, 
        height: `${cellHeight}px`, 
        minHeight: `${cellHeight}px`, 
        maxHeight: `${cellHeight}px` 
      }
    }
    
    if (isHovered) style = { ...style, ...styles.cellHover }
    if (isSummary) style = { ...style, ...styles.cellSummary }
    if (isOverall) style = { ...style, ...styles.cellOverall }
    if (hasError) style = { ...style, ...styles.cellError }
    if (status === 'pending') style = { ...style, ...styles.cellPending }
    if (status === 'running') style = { ...style, ...styles.cellRunning }
    
    return style
  }
  
  const getStatusStyle = () => {
    switch (status) {
      case 'running': return styles.statusRunning
      case 'completed': return styles.statusCompleted
      case 'error': return styles.statusError
      default: return styles.statusPending
    }
  }
  
  const handleRefresh = useCallback((e) => {
    e.stopPropagation()
    if (onRefresh) onRefresh()
  }, [onRefresh])
  
  // Handle manual resize via drag - updates entire row/column in real-time
  // Supports resizing from right edge, bottom edge, or corner
  useEffect(() => {
    if (!cellRef.current || !onManualResize) return
    
    const cell = cellRef.current
    let rafId = null
    
    const handleMouseDown = (e) => {
      const rect = cell.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // Determine which edge/corner is being dragged
      const isNearRight = x > rect.width - 6
      const isNearBottom = y > rect.height - 6
      const isNearCorner = x > rect.width - 20 && y > rect.height - 20
      
      if (!isNearRight && !isNearBottom) return
      
      isResizing.current = true
      
      if (isNearCorner) {
        resizeMode.current = 'both'
        document.body.style.cursor = 'nwse-resize'
      } else if (isNearRight) {
        resizeMode.current = 'horizontal'
        document.body.style.cursor = 'ew-resize'
      } else if (isNearBottom) {
        resizeMode.current = 'vertical'
        document.body.style.cursor = 'ns-resize'
      }
      
      resizeStartSize.current = {
        width: rect.width,
        height: rect.height,
        startX: e.clientX,
        startY: e.clientY,
      }
      
      e.preventDefault()
      e.stopPropagation()
    }
    
    const handleMouseMove = (e) => {
      if (!isResizing.current) return
      
      if (rafId) cancelAnimationFrame(rafId)
      
      rafId = requestAnimationFrame(() => {
        const deltaX = e.clientX - resizeStartSize.current.startX
        const deltaY = e.clientY - resizeStartSize.current.startY
        
        let newWidth = resizeStartSize.current.width
        let newHeight = resizeStartSize.current.height
        
        if (resizeMode.current === 'horizontal' || resizeMode.current === 'both') {
          newWidth = Math.max(resizeStartSize.current.width + deltaX, 200)
        }
        
        if (resizeMode.current === 'vertical' || resizeMode.current === 'both') {
          newHeight = Math.max(resizeStartSize.current.height + deltaY, 80)
        }
        
        // Notify parent immediately for real-time row/column updates
        onManualResize(newWidth, newHeight)
      })
    }
    
    const handleMouseUp = () => {
      if (!isResizing.current) return
      
      isResizing.current = false
      resizeMode.current = null
      document.body.style.cursor = ''
      
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }
    
    cell.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      cell.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (rafId) cancelAnimationFrame(rafId)
      document.body.style.cursor = ''
    }
  }, [onManualResize])
  
  return (
    <div
      ref={cellRef}
      style={getCellStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Resize handles */}
      {onManualResize && (
        <>
          {/* Right edge resize handle */}
          <div 
            style={styles.resizeHandleRight}
            onMouseEnter={() => setHoveredEdge('right')}
            onMouseLeave={() => setHoveredEdge(null)}
          />
          
          {/* Bottom edge resize handle */}
          <div 
            style={styles.resizeHandleBottom}
            onMouseEnter={() => setHoveredEdge('bottom')}
            onMouseLeave={() => setHoveredEdge(null)}
          />
          
          {/* Corner resize handle with visual indicator */}
          <div 
            style={{
              ...styles.resizeHandleCorner,
              ...(isHovered || hoveredEdge === 'corner' ? styles.resizeHandleCornerVisible : {})
            }}
            onMouseEnter={() => setHoveredEdge('corner')}
            onMouseLeave={() => setHoveredEdge(null)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M11 11L11 7M11 11L7 11M11 11L6 6M11 3L11 0M11 3L8 3M3 11L0 11M3 11L3 8" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    fill="none" 
                    strokeLinecap="round"/>
            </svg>
          </div>
          
          {/* Visual indicators on hover */}
          <div 
            style={{
              ...styles.resizeIndicator,
              ...styles.resizeIndicatorRight,
              ...(hoveredEdge === 'right' || hoveredEdge === 'corner' ? styles.resizeIndicatorVisible : {})
            }}
          />
          <div 
            style={{
              ...styles.resizeIndicator,
              ...styles.resizeIndicatorBottom,
              ...(hoveredEdge === 'bottom' || hoveredEdge === 'corner' ? styles.resizeIndicatorVisible : {})
            }}
          /></>
      )}
      {/* Content */}
      {answer ? (
        <div style={styles.content}>
          <CitedText 
            text={answer}
            citations={citations || []}
            onOpenDocument={onOpenDocument}
          />
          
          {isExpanded && (
            <button
              style={styles.expandButton}
              onClick={() => setIsExpanded(false)}
            >
              Show less
            </button>
          )}
        </div>
      ) : (
        <div style={styles.emptyState}>
          {status === 'pending' && 'Not yet run'}
          {status === 'running' && 'Thinking...'}
          {status === 'error' && (result?.error || 'Error occurred')}
          {!status && ''}
        </div>
      )}
      
      {/* Refresh control */}
      {onRefresh && (
        <div style={{
          ...styles.controls,
          ...(isHovered ? styles.controlsVisible : {}),
        }}>
          <button
            style={{
              ...styles.controlBtn,
              ...(refreshBtnHovered && !isRefreshing ? styles.controlBtnHover : {}),
              ...(isRefreshing ? styles.controlBtnDisabled : {}),
            }}
            onClick={handleRefresh}
            onMouseEnter={() => setRefreshBtnHovered(true)}
            onMouseLeave={() => setRefreshBtnHovered(false)}
            title="Refresh this cell"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <div style={styles.spinner} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            )}
          </button>
        </div>
      )}
      
      {/* Status indicator - only show if status exists and is not completed (unless error) */}
      {status && (status !== 'completed' || hasError) && (
        <div style={{ ...styles.statusBadge, ...getStatusStyle() }}>
          {status === 'running' && <div style={styles.spinner} />}
          {status === 'pending' && '○'}
          {status === 'completed' && '✓'}
          {status === 'error' && '✕'}
          <span style={{ marginLeft: '2px' }}>
            {status === 'running' && 'Thinking'}
            {status === 'pending' && 'Pending'}
            {status === 'error' && 'Error'}
          </span>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

