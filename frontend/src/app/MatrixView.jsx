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

// Fixed dimensions for consistent sizing
const ROW_HEADER_WIDTH = 220
const HEADER_ROW_HEIGHT = 80
const CELL_MIN_WIDTH = 200
const CELL_MIN_HEIGHT = 80
const GAP = 8

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: 'var(--space-4)',
  },
  // 4-quadrant grid layout
  matrixLayout: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: `${ROW_HEADER_WIDTH}px 1fr`,
    gridTemplateRows: `${HEADER_ROW_HEIGHT}px 1fr`,
    gap: `${GAP}px`,
    overflow: 'hidden',
    minHeight: 0,
  },
  // Top-left corner (fixed)
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
    minHeight: '60px',
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
    width: '24px',
    height: '24px',
    padding: '0',
    color: 'var(--color-text-muted)',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  iconBtnHover: {
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface)',
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
    display: 'flex',
    flexDirection: 'column',
    gap: `${GAP}px`,
  },
  rowHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3)',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '2px 0 4px rgba(0, 0, 0, 0.05)',
    position: 'relative',
    flexShrink: 0,
  },
  rowHeaderContent: {
    display: 'flex',
    alignItems: 'center',
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
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
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
  
  // Track actual row heights for synchronization
  const [rowHeights, setRowHeights] = useState({})

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

  // Measure row heights from the cells container and apply to row headers
  useEffect(() => {
    if (!cellsRef.current) return
    
    const measureHeights = () => {
      const cellsGrid = cellsRef.current?.querySelector('[data-cells-grid]')
      if (!cellsGrid) return
      
      const rows = cellsGrid.children
      const heights = {}
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (row.getBoundingClientRect) {
          heights[i] = row.getBoundingClientRect().height
        }
      }
      
      setRowHeights(heights)
    }
    
    // Measure after render
    const timer = setTimeout(measureHeights, 100)
    
    // Re-measure on resize
    const observer = new ResizeObserver(measureHeights)
    if (cellsRef.current) {
      observer.observe(cellsRef.current)
    }
    
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [documents, columns, results])

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
    if (e.key === 'Enter' && e.shiftKey) {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      setEditingColumn(null)
      setEditValue('')
    }
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
    return columns.map(() => CELL_MIN_WIDTH)
  }, [columns])
  
  // Grid template for cells
  const gridTemplateColumns = useMemo(() => {
    const colWidths = columnWidths.map(w => `${w}px`).join(' ')
    return `${colWidths} ${CELL_MIN_WIDTH}px 160px` // + summary + add button space
  }, [columnWidths])

  // Total row count (documents + summary row)
  const totalRows = documents.length + 1

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
      <div style={styles.matrixLayout}>
        {/* QUADRANT 1: Corner (fixed) */}
        <div style={styles.corner}>
          Documents
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
                  height: `${HEADER_ROW_HEIGHT - GAP}px`,
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
                      <textarea
                        style={styles.questionInput}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSaveEdit}
                        autoFocus
                      />
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
                width: `${CELL_MIN_WIDTH}px`,
                height: `${HEADER_ROW_HEIGHT - GAP}px`,
              }}
            >
              <span style={styles.questionText}>Document Summary</span>
            </div>
            
            {/* Add column button */}
            <button
              style={{
                ...styles.addColumnBtn,
                height: `${HEADER_ROW_HEIGHT - GAP}px`,
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
          <div style={styles.rowHeadersScroll}>
            {documents.map((doc, rowIndex) => (
              <div 
                key={doc.name}
                style={{
                  ...styles.rowHeader,
                  height: rowHeights[rowIndex] ? `${rowHeights[rowIndex]}px` : `${CELL_MIN_HEIGHT}px`,
                  zIndex: openDocMenu === doc.name ? 1000 : 1,
                }}
              >
                <div style={styles.rowHeaderContent}>
                  {getFileIcon(doc.name)}
                  <span 
                    style={{
                      ...styles.fileName,
                      ...(hoveredAction === `filename-${doc.name}` ? styles.fileNameHover : {}),
                    }}
                    title={doc.name}
                    onClick={() => toggleDocMenu(doc.name)}
                    onMouseEnter={() => setHoveredAction(`filename-${doc.name}`)}
                    onMouseLeave={() => setHoveredAction(null)}
                  >
                    {doc.name}
                  </span>
                </div>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
                
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
                height: rowHeights[documents.length] ? `${rowHeights[documents.length]}px` : `${CELL_MIN_HEIGHT}px`,
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
            style={{ ...styles.cellsGrid, gridTemplateColumns }}
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
                  />
                ))}
                
                {/* Row summary cell */}
                <MatrixCell
                  result={rowSummaries[doc.name]}
                  isSummary
                  onOpenDocument={onOpenDocument}
                />
                
                {/* Spacer for add column */}
                <div style={{ width: '160px' }} />
              </div>
            ))}
            
            {/* Summary row */}
            <div style={{ display: 'contents' }}>
              {columns.map((column) => (
                <MatrixCell
                  key={`summary:${column.id}`}
                  result={columnSummaries[column.id]}
                  isSummary
                  onOpenDocument={onOpenDocument}
                />
              ))}
              
              {/* Overall summary cell */}
              <MatrixCell
                result={overallSummary}
                isOverall
                onOpenDocument={onOpenDocument}
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
