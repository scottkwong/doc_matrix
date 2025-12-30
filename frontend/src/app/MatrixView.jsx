/**
 * Matrix View Component
 * 
 * Main document analysis matrix grid showing documents as rows,
 * questions as columns, and LLM answers in cells. Uses a 4-quadrant
 * freeze panes layout for proper scrolling behavior.
 * 
 * Layout:
 * +------------------+---------------------------+
 * | Corner (fixed)   | Column Headers (h-scroll) |
 * +------------------+---------------------------+
 * | Row Headers      | Main Cells                |
 * | (v-scroll)       | (both scroll)             |
 * +------------------+---------------------------+
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import MatrixCell from './MatrixCell'

// Default dimensions for consistent sizing
const DEFAULT_ROW_HEADER_WIDTH = 400  // Wide enough for full filenames
const DEFAULT_HEADER_ROW_HEIGHT = 100
const MIN_ROW_HEADER_WIDTH = 250
const MIN_HEADER_ROW_HEIGHT = 60
const CELL_WIDTH = 250
const CELL_HEIGHT = 120
const GAP = 8

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: 'var(--space-4)',
  },
  // 4-quadrant grid layout (dimensions set dynamically via inline styles)
  matrixLayout: {
    flex: 1,
    display: 'grid',
    gap: `${GAP}px`,
    overflow: 'hidden',
    minHeight: 0,
  },
  // Top-left corner (fixed, with resize handles)
  corner: {
    gridColumn: 1,
    gridRow: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-md)',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-sm)',
    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    userSelect: 'none',
  },
  cornerResizeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '6px',
    cursor: 'col-resize',
    background: 'transparent',
    zIndex: 10,
  },
  cornerResizeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '6px',
    cursor: 'row-resize',
    background: 'transparent',
    zIndex: 10,
  },
  cornerResizeCorner: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '12px',
    height: '12px',
    cursor: 'nwse-resize',
    background: 'transparent',
    zIndex: 11,
  },
  // Column headers (scrolls horizontally only)
  columnHeadersContainer: {
    gridColumn: 2,
    gridRow: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  columnHeadersScroll: {
    display: 'flex',
    gap: `${GAP}px`,
    minWidth: 'max-content',
  },
  columnHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    padding: 'var(--space-3)',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    flexShrink: 0,
  },
  columnHeaderTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--space-2)',
  },
  questionText: {
    flex: 1,
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    color: 'var(--color-text-primary)',
    lineHeight: '1.4',
  },
  questionInput: {
    flex: 1,
    padding: 'var(--space-2)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--radius-sm)',
    resize: 'vertical',
    minHeight: '50px',
  },
  editContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    flex: 1,
  },
  editActions: {
    display: 'flex',
    gap: 'var(--space-1)',
    justifyContent: 'flex-end',
  },
  editActionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    padding: '0',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  editSaveBtn: {
    background: 'var(--color-success)',
    color: 'white',
  },
  editCancelBtn: {
    background: 'var(--color-text-muted)',
    color: 'white',
  },
  columnActions: {
    display: 'flex',
    gap: 'var(--space-1)',
    flexShrink: 0,
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    padding: '0',
    color: 'var(--color-text-secondary)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    flexShrink: 0,
  },
  iconBtnHover: {
    color: 'var(--color-accent)',
    background: 'var(--color-accent-subtle)',
    borderColor: 'var(--color-accent)',
  },
  iconBtnDanger: {
    color: 'var(--color-error)',
  },
  iconBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  summaryColumnHeader: {
    background: 'var(--color-bg-elevated)',
    borderLeft: '3px solid var(--color-accent)',
  },
  addColumnBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3)',
    minWidth: '160px',
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    color: 'var(--color-accent)',
    background: 'var(--color-surface)',
    border: '2px dashed var(--color-surface-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    flexShrink: 0,
  },
  addColumnBtnHover: {
    borderColor: 'var(--color-accent)',
    background: 'var(--color-accent-subtle)',
  },
  // Row headers (scrolls vertically only)
  rowHeadersContainer: {
    gridColumn: 1,
    gridRow: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  rowHeadersScroll: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: `${GAP}px`,
  },
  rowHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    padding: 'var(--space-3)',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '2px 0 4px rgba(0, 0, 0, 0.05)',
    position: 'relative',
    flexShrink: 0,
    minHeight: '80px',
  },
  rowHeaderTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-2)',
    width: '100%',
  },
  rowHeaderButtons: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexShrink: 0,
  },
  rowHeaderContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-2)',
    flex: 1,
    minWidth: 0,
  },
  fileIcon: {
    flexShrink: 0,
    width: '18px',
    height: '18px',
    color: 'var(--color-text-muted)',
  },
  fileName: {
    flex: 1,
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    color: 'var(--color-text-primary)',
    minWidth: 0,
    cursor: 'pointer',
    transition: 'color var(--transition-fast)',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 4,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  fileNameHover: {
    color: 'var(--color-accent)',
  },
  summaryRowHeader: {
    background: 'var(--color-bg-elevated)',
    borderTop: '3px solid var(--color-accent)',
    fontWeight: '600',
    color: 'var(--color-accent)',
  },
  docMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: '220px',
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    padding: 'var(--space-3)',
    zIndex: 1000,
    marginTop: '4px',
  },
  docMenuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-2)',
    paddingBottom: 'var(--space-2)',
    borderBottom: '1px solid var(--color-surface-border)',
  },
  docMenuTitle: {
    fontSize: 'var(--text-sm)',
    fontWeight: '600',
    color: 'var(--color-text-primary)',
  },
  docMenuClose: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    padding: '0',
    color: 'var(--color-text-muted)',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  },
  docMenuCloseHover: {
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface)',
  },
  docMenuItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-secondary)',
  },
  docMenuLabel: {
    fontWeight: '500',
    color: 'var(--color-text-muted)',
  },
  docMenuValue: {
    fontWeight: '400',
    color: 'var(--color-text-primary)',
  },
  // Main cells area (scrolls both ways)
  cellsContainer: {
    gridColumn: 2,
    gridRow: 2,
    overflow: 'auto',
    position: 'relative',
  },
  cellsGrid: {
    display: 'grid',
    gap: `${GAP}px`,
    minWidth: 'max-content',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-12)',
    textAlign: 'center',
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    color: 'var(--color-text-muted)',
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 'var(--text-xl)',
    fontWeight: '600',
    color: 'var(--color-text-primary)',
  },
  emptyText: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-muted)',
    maxWidth: '400px',
  },
}

export default function MatrixView({
  documents = [],
  columns = [],
  results = {},
  rowSummaries = {},
  columnSummaries = {},
  overallSummary = null,
  refreshingCells = {},
  executingColumns = new Set(),
  executingRows = new Set(),
  isExecuting = false,
  onRefreshCell,
  onRefreshRow,
  onRefreshColumn,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onReorderColumns,
  onOpenDocument,
}) {
  const [hoveredAction, setHoveredAction] = useState(null)
  const [addBtnHovered, setAddBtnHovered] = useState(false)
  const [openDocMenu, setOpenDocMenu] = useState(null)
  const [editingColumn, setEditingColumn] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [draggedColumnId, setDraggedColumnId] = useState(null)
  const [dragOverColumnId, setDragOverColumnId] = useState(null)
  
  // Refs for synchronized scrolling
  const columnHeadersRef = useRef(null)
  const rowHeadersRef = useRef(null)
  const cellsRef = useRef(null)
  
  // Track dimensions for first row and first column (resizable)
  const [rowHeaderWidth, setRowHeaderWidth] = useState(DEFAULT_ROW_HEADER_WIDTH)
  const [headerRowHeight, setHeaderRowHeight] = useState(DEFAULT_HEADER_ROW_HEIGHT)
  
  // Track column widths and row heights (shared between headers and cells)
  const [columnWidthsState, setColumnWidthsState] = useState({})
  const [rowHeightsState, setRowHeightsState] = useState({})
  
  // Resize state for corner handles
  const [isResizingCorner, setIsResizingCorner] = useState(null) // 'right', 'bottom', 'corner'
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

  // Synchronized scrolling: when cells scroll, update headers
  const handleCellsScroll = useCallback((e) => {
    const { scrollLeft, scrollTop } = e.target
    if (columnHeadersRef.current) {
      columnHeadersRef.current.scrollLeft = scrollLeft
    }
    if (rowHeadersRef.current) {
      rowHeadersRef.current.scrollTop = scrollTop
    }
  }, [])
  
  // Corner resize handlers for first column width and first row height
  const handleCornerResizeStart = useCallback((e, direction) => {
    e.preventDefault()
    setIsResizingCorner(direction)
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: rowHeaderWidth,
      height: headerRowHeight,
    }
  }, [rowHeaderWidth, headerRowHeight])
  
  const handleCornerResizeMove = useCallback((e) => {
    if (!isResizingCorner) return
    
    const deltaX = e.clientX - resizeStartRef.current.x
    const deltaY = e.clientY - resizeStartRef.current.y
    
    if (isResizingCorner === 'right' || isResizingCorner === 'corner') {
      const newWidth = Math.max(MIN_ROW_HEADER_WIDTH, resizeStartRef.current.width + deltaX)
      setRowHeaderWidth(newWidth)
    }
    if (isResizingCorner === 'bottom' || isResizingCorner === 'corner') {
      const newHeight = Math.max(MIN_HEADER_ROW_HEIGHT, resizeStartRef.current.height + deltaY)
      setHeaderRowHeight(newHeight)
    }
  }, [isResizingCorner])
  
  const handleCornerResizeEnd = useCallback(() => {
    setIsResizingCorner(null)
  }, [])
  
  // Attach/detach global mouse listeners for corner resize
  useEffect(() => {
    if (isResizingCorner) {
      window.addEventListener('mousemove', handleCornerResizeMove)
      window.addEventListener('mouseup', handleCornerResizeEnd)
      return () => {
        window.removeEventListener('mousemove', handleCornerResizeMove)
        window.removeEventListener('mouseup', handleCornerResizeEnd)
      }
    }
  }, [isResizingCorner, handleCornerResizeMove, handleCornerResizeEnd])
  
  // Handle resize from cells
  // Note: Cell content changes should only expand row height, never column width
  // Column width changes only happen from manual resize handles
  const handleCellResize = useCallback((rowIndex, columnId, width, height, isManualResize = false) => {
    // Only allow column width changes from manual resize (not from content changes)
    if (width && columnId && isManualResize) {
      setColumnWidthsState(prev => ({ ...prev, [columnId]: width }))
    }
    // Row height can expand from content or manual resize
    if (height && rowIndex !== undefined) {
      setRowHeightsState(prev => {
        const currentHeight = prev[rowIndex] || CELL_HEIGHT
        // Only expand, don't shrink (unless manual resize)
        if (isManualResize || height > currentHeight) {
          return { ...prev, [rowIndex]: height }
        }
        return prev
      })
    }
  }, [])

  const getCellResult = (filename, columnId) => {
    return results[`${filename}:${columnId}`]
  }

  const toggleDocMenu = useCallback((docName) => {
    setOpenDocMenu(openDocMenu === docName ? null : docName)
  }, [openDocMenu])

  const handleStartEdit = (column) => {
    setEditingColumn(column.id)
    setEditValue(column.question)
  }

  const handleSaveEdit = () => {
    if (editingColumn && editValue.trim()) {
      onEditColumn(editingColumn, editValue.trim())
    }
    setEditingColumn(null)
    setEditValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      setEditingColumn(null)
      setEditValue('')
    }
  }
  
  const handleCancelEdit = () => {
    setEditingColumn(null)
    setEditValue('')
  }

  const handleAddColumn = () => {
    const question = prompt('Enter the question:')
    if (question && question.trim()) {
      onAddColumn(question.trim())
    }
  }

  const handleDragStart = (e, columnId) => {
    setDraggedColumnId(columnId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, columnId) => {
    e.preventDefault()
    if (draggedColumnId && draggedColumnId !== columnId) {
      setDragOverColumnId(columnId)
    }
  }

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault()
    if (draggedColumnId && draggedColumnId !== targetColumnId) {
      onReorderColumns(draggedColumnId, targetColumnId)
    }
    setDraggedColumnId(null)
    setDragOverColumnId(null)
  }

  const handleDragEnd = () => {
    setDraggedColumnId(null)
    setDragOverColumnId(null)
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const formatNumber = (num) => {
    return num.toLocaleString()
  }

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase()
    
    if (['pdf'].includes(ext)) {
      return (
        <svg style={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M10 12h4" />
          <path d="M10 16h2" />
        </svg>
      )
    }
    if (['doc', 'docx'].includes(ext)) {
      return (
        <svg style={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return (
        <svg style={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M8 13h8" />
          <path d="M8 17h8" />
          <path d="M12 13v8" />
        </svg>
      )
    }
    
    return (
      <svg style={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    )
  }

  // Calculate column widths (same for headers and cells)
  const columnWidths = useMemo(() => {
    return columns.map(col => columnWidthsState[col.id] || CELL_WIDTH)
  }, [columns, columnWidthsState])
  
  // Calculate row heights (same for row headers and cells)
  const rowHeights = useMemo(() => {
    const heights = documents.map((_, i) => rowHeightsState[i] || CELL_HEIGHT)
    heights.push(rowHeightsState['summary'] || CELL_HEIGHT) // summary row
    return heights
  }, [documents, rowHeightsState])
  
  // Grid template for columns (used in both headers and cells)
  const gridTemplateColumns = useMemo(() => {
    const colWidths = columnWidths.map(w => `${w}px`).join(' ')
    const summaryWidth = columnWidthsState['summary'] || CELL_WIDTH
    return `${colWidths} ${summaryWidth}px 160px` // + summary + add button space
  }, [columnWidths, columnWidthsState])
  
  // Grid template for rows (used in both row headers and cells)
  const gridTemplateRows = useMemo(() => {
    return rowHeights.map(h => `${h}px`).join(' ')
  }, [rowHeights])

  if (documents.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <svg style={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h3 style={styles.emptyTitle}>No documents found</h3>
          <p style={styles.emptyText}>
            Select a folder containing documents (PDF, DOCX, XLSX, TXT, MD, CSV, JSON) 
            to start analyzing them.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.matrixLayout,
        gridTemplateColumns: `${rowHeaderWidth}px 1fr`,
        gridTemplateRows: `${headerRowHeight}px 1fr`,
      }}>
        {/* QUADRANT 1: Corner (fixed, resizable) */}
        <div style={styles.corner}>
          Documents
          {/* Resize handle: right edge (for column width) */}
          <div 
            style={styles.cornerResizeRight}
            onMouseDown={(e) => handleCornerResizeStart(e, 'right')}
          />
          {/* Resize handle: bottom edge (for row height) */}
          <div 
            style={styles.cornerResizeBottom}
            onMouseDown={(e) => handleCornerResizeStart(e, 'bottom')}
          />
          {/* Resize handle: corner (for both) */}
          <div 
            style={styles.cornerResizeCorner}
            onMouseDown={(e) => handleCornerResizeStart(e, 'corner')}
          />
        </div>

        {/* QUADRANT 2: Column Headers (scrolls horizontally with cells) */}
        <div 
          style={styles.columnHeadersContainer}
          ref={columnHeadersRef}
        >
          <div style={styles.columnHeadersScroll}>
            {columns.map((column, colIndex) => (
              <div 
                key={column.id} 
                style={{
                  ...styles.columnHeader,
                  width: `${columnWidths[colIndex]}px`,
                  height: `${headerRowHeight - GAP}px`,
                  opacity: draggedColumnId === column.id ? 0.5 : 1,
                  borderLeft: dragOverColumnId === column.id ? '2px solid var(--color-accent)' : 'none',
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, column.id)}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                onDragEnd={handleDragEnd}
                onDragLeave={() => setDragOverColumnId(null)}
              >
                <div style={styles.columnHeaderTop}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                    <div style={{ cursor: 'grab', color: 'var(--color-text-muted)', display: 'flex' }} title="Drag to reorder">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="5" r="1" />
                        <circle cx="9" cy="12" r="1" />
                        <circle cx="9" cy="19" r="1" />
                        <circle cx="15" cy="5" r="1" />
                        <circle cx="15" cy="12" r="1" />
                        <circle cx="15" cy="19" r="1" />
                      </svg>
                    </div>
                    {editingColumn === column.id ? (
                      <div style={styles.editContainer}>
                        <textarea
                          style={styles.questionInput}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          autoFocus
                        />
                        <div style={styles.editActions}>
                          <button
                            style={{
                              ...styles.editActionBtn,
                              ...styles.editSaveBtn,
                            }}
                            onClick={handleSaveEdit}
                            title="Save (Enter)"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                          <button
                            style={{
                              ...styles.editActionBtn,
                              ...styles.editCancelBtn,
                            }}
                            onClick={handleCancelEdit}
                            title="Cancel (Esc)"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span style={styles.questionText}>{column.question}</span>
                    )}
                  </div>
                  
                  <div style={styles.columnActions}>
                    {editingColumn !== column.id && (
                      <>
                        <button
                          style={{
                            ...styles.iconBtn,
                            ...(hoveredAction === `edit-${column.id}` ? styles.iconBtnHover : {}),
                          }}
                          onClick={() => handleStartEdit(column)}
                          onMouseEnter={() => setHoveredAction(`edit-${column.id}`)}
                          onMouseLeave={() => setHoveredAction(null)}
                          title="Edit question"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          style={{
                            ...styles.iconBtn,
                            ...(hoveredAction === `run-${column.id}` && !executingColumns.has(column.id) ? styles.iconBtnHover : {}),
                            ...(executingColumns.has(column.id) ? styles.iconBtnDisabled : {}),
                          }}
                          onClick={() => onRefreshColumn(column.id)}
                          onMouseEnter={() => setHoveredAction(`run-${column.id}`)}
                          onMouseLeave={() => setHoveredAction(null)}
                          title="Run this column"
                          disabled={executingColumns.has(column.id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </button>
                        <button
                          style={{
                            ...styles.iconBtn,
                            ...(hoveredAction === `delete-${column.id}` ? { ...styles.iconBtnHover, ...styles.iconBtnDanger } : {}),
                          }}
                          onClick={() => {
                            if (window.confirm('Delete this question column?')) {
                              onDeleteColumn(column.id)
                            }
                          }}
                          onMouseEnter={() => setHoveredAction(`delete-${column.id}`)}
                          onMouseLeave={() => setHoveredAction(null)}
                          title="Delete column"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Summary column header */}
            <div 
              style={{
                ...styles.columnHeader, 
                ...styles.summaryColumnHeader,
                width: `${columnWidthsState['summary'] || CELL_WIDTH}px`,
                height: `${headerRowHeight - GAP}px`,
              }}
            >
              <span style={styles.questionText}>Document Summary</span>
            </div>
            
            {/* Add column button */}
            <button
              style={{
                ...styles.addColumnBtn,
                height: `${headerRowHeight - GAP}px`,
                ...(addBtnHovered ? styles.addColumnBtnHover : {}),
              }}
              onClick={handleAddColumn}
              onMouseEnter={() => setAddBtnHovered(true)}
              onMouseLeave={() => setAddBtnHovered(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Question
            </button>
          </div>
        </div>

        {/* QUADRANT 3: Row Headers (scrolls vertically with cells) */}
        <div 
          style={styles.rowHeadersContainer}
          ref={rowHeadersRef}
        >
          <div style={{ ...styles.rowHeadersScroll, gridTemplateRows }}>
            {documents.map((doc, rowIndex) => (
              <div 
                key={doc.name}
                style={{
                  ...styles.rowHeader,
                  zIndex: openDocMenu === doc.name ? 1000 : 1,
                }}
              >
                {/* Top row: file icon, name, and buttons */}
                <div style={styles.rowHeaderTop}>
                  {/* Document name - click to open document */}
                  <div style={styles.rowHeaderContent}>
                    {getFileIcon(doc.name)}
                    <span 
                      style={{
                        ...styles.fileName,
                        ...(hoveredAction === `filename-${doc.name}` ? styles.fileNameHover : {}),
                      }}
                      title={`Click to open: ${doc.name}`}
                      onClick={() => onOpenDocument(doc.name)}
                      onMouseEnter={() => setHoveredAction(`filename-${doc.name}`)}
                      onMouseLeave={() => setHoveredAction(null)}
                    >
                      {doc.name}
                    </span>
                  </div>
                  
                  {/* Action buttons - always visible */}
                  <div style={styles.rowHeaderButtons}>
                    <button
                      style={{
                        ...styles.iconBtn,
                        ...(hoveredAction === `menu-${doc.name}` ? styles.iconBtnHover : {}),
                      }}
                      onClick={() => toggleDocMenu(doc.name)}
                      onMouseEnter={() => setHoveredAction(`menu-${doc.name}`)}
                      onMouseLeave={() => setHoveredAction(null)}
                      title="Document info"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    <button
                      style={{
                        ...styles.iconBtn,
                        ...(hoveredAction === `run-row-${doc.name}` && !executingRows.has(doc.name) ? styles.iconBtnHover : {}),
                        ...(executingRows.has(doc.name) ? styles.iconBtnDisabled : {}),
                      }}
                      onClick={() => onRefreshRow(doc.name)}
                      onMouseEnter={() => setHoveredAction(`run-row-${doc.name}`)}
                      onMouseLeave={() => setHoveredAction(null)}
                      title="Run this row"
                      disabled={executingRows.has(doc.name)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="6 4 20 12 6 20 6 4" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Document metadata menu */}
                {openDocMenu === doc.name && (
                  <div style={styles.docMenu}>
                    <div style={styles.docMenuHeader}>
                      <span style={styles.docMenuTitle}>Document Info</span>
                      <button
                        style={{
                          ...styles.docMenuClose,
                          ...(hoveredAction === `close-menu-${doc.name}` ? styles.docMenuCloseHover : {}),
                        }}
                        onClick={() => setOpenDocMenu(null)}
                        onMouseEnter={() => setHoveredAction(`close-menu-${doc.name}`)}
                        onMouseLeave={() => setHoveredAction(null)}
                        title="Close"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <div style={styles.docMenuItem}>
                      <span style={styles.docMenuLabel}>Last Modified</span>
                      <span style={styles.docMenuValue}>{formatDate(doc.mtime)}</span>
                    </div>
                    <div style={styles.docMenuItem}>
                      <span style={styles.docMenuLabel}>Token Count</span>
                      <span style={styles.docMenuValue}>
                        {doc.token_count ? formatNumber(doc.token_count) : 'Not calculated'}
                      </span>
                    </div>
                    <div style={styles.docMenuItem}>
                      <span style={styles.docMenuLabel}>File Size</span>
                      <span style={styles.docMenuValue}>
                        {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'Unknown'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Summary row header */}
            <div 
              style={{
                ...styles.rowHeader, 
                ...styles.summaryRowHeader,
              }}
            >
              <svg style={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Question Summaries</span>
            </div>
          </div>
        </div>

        {/* QUADRANT 4: Main Cells (scrolls both ways) */}
        <div 
          style={styles.cellsContainer}
          ref={cellsRef}
          onScroll={handleCellsScroll}
        >
          <div 
            style={{ ...styles.cellsGrid, gridTemplateColumns, gridTemplateRows }}
            data-cells-grid
          >
            {/* Document rows */}
            {documents.map((doc, rowIndex) => (
              <div key={doc.name} style={{ display: 'contents' }}>
                {columns.map((column, colIndex) => (
                  <MatrixCell
                    key={`${doc.name}:${column.id}`}
                    result={getCellResult(doc.name, column.id)}
                    onRefresh={() => onRefreshCell(doc.name, column.id)}
                    onOpenDocument={onOpenDocument}
                    isRefreshing={refreshingCells[`${doc.name}:${column.id}`]}
                    onManualResize={(width, height) => handleCellResize(rowIndex, column.id, width, height, true)}
                  />
                ))}
                
                {/* Row summary cell */}
                <MatrixCell
                  result={rowSummaries[doc.name]}
                  isSummary
                  onOpenDocument={onOpenDocument}
                  onManualResize={(width, height) => handleCellResize(rowIndex, 'summary', width, height, true)}
                />
                
                {/* Spacer for add column */}
                <div style={{ width: '160px' }} />
              </div>
            ))}
            
            {/* Summary row */}
            <div style={{ display: 'contents' }}>
              {columns.map((column, colIndex) => (
                <MatrixCell
                  key={`summary:${column.id}`}
                  result={columnSummaries[column.id]}
                  isSummary
                  onOpenDocument={onOpenDocument}
                  onManualResize={(width, height) => handleCellResize('summary', column.id, width, height, true)}
                />
              ))}
              
              {/* Overall summary cell */}
              <MatrixCell
                result={overallSummary}
                isOverall
                onOpenDocument={onOpenDocument}
                onManualResize={(width, height) => handleCellResize('summary', 'summary', width, height, true)}
              />
              
              {/* Spacer for add column */}
              <div style={{ width: '160px' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
