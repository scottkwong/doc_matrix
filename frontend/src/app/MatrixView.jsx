/**
 * Matrix View Component
 * 
 * Main document analysis matrix grid showing documents as rows,
 * questions as columns, and LLM answers in cells. Includes
 * summary rows and columns with coordinated resizing.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import MatrixCell from './MatrixCell'

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  scrollArea: {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--space-4)',
    position: 'relative',
  },
  grid: {
    display: 'grid',
    gap: 'var(--space-2)',
    minWidth: 'fit-content',
  },
  headerRow: {
    display: 'contents',
  },
  cornerCell: {
    position: 'sticky',
    left: 0,
    top: 0,
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-3)',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-md)',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-sm)',
    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.05)',
  },
  columnHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    padding: 'var(--space-3)',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-md)',
    minWidth: '200px',
    maxWidth: '300px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
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
  summaryHeader: {
    background: 'var(--color-bg-elevated)',
    borderLeft: '3px solid var(--color-accent)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  rowHeader: {
    position: 'sticky',
    left: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3)',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-md)',
    minWidth: '180px',
    maxWidth: '220px',
    boxShadow: '2px 0 4px rgba(0, 0, 0, 0.05)',
  },
  rowHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    flex: 1,
    minWidth: 0,
  },
  docMenu: {
    position: 'absolute',
    bottom: 'calc(100% + 4px)',
    right: 0,
    minWidth: '220px',
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    padding: 'var(--space-2)',
    zIndex: 1000,
    animation: 'slideUp 0.15s ease',
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
    boxShadow: '2px 0 4px rgba(0, 0, 0, 0.05)',
  },
  addColumnBtn: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
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
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  addColumnBtnHover: {
    borderColor: 'var(--color-accent)',
    background: 'var(--color-accent-subtle)',
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
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onReorderColumns,
  onRefreshCell,
  onRefreshRow,
  onRefreshColumn,
  onOpenDocument,
}) {
  const [editingColumn, setEditingColumn] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [addBtnHovered, setAddBtnHovered] = useState(false)
  const [hoveredAction, setHoveredAction] = useState(null)
  const [draggedColumnId, setDraggedColumnId] = useState(null)
  const [dragOverColumnId, setDragOverColumnId] = useState(null)
  const [openDocMenu, setOpenDocMenu] = useState(null)
  
  // Track manually set dimensions (null = auto-fit, number = locked)
  const [columnWidths, setColumnWidths] = useState({})
  const [rowHeights, setRowHeights] = useState({})
  
  // Track which dimensions are manually set (locked)
  const [lockedColumns, setLockedColumns] = useState(new Set())
  const [lockedRows, setLockedRows] = useState(new Set())
  
  const getCellResult = (filename, columnId) => {
    const key = `${filename}:${columnId}`
    return results[key]
  }
  
  const handleStartEdit = useCallback((column) => {
    setEditingColumn(column.id)
    setEditValue(column.question)
  }, [])
  
  const handleSaveEdit = useCallback(() => {
    if (editingColumn && editValue.trim()) {
      onUpdateColumn(editingColumn, editValue.trim())
    }
    setEditingColumn(null)
    setEditValue('')
  }, [editingColumn, editValue, onUpdateColumn])
  
  const handleCancelEdit = useCallback(() => {
    setEditingColumn(null)
    setEditValue('')
  }, [])
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }, [handleSaveEdit, handleCancelEdit])
  
  const handleAddColumn = useCallback(async () => {
    console.log('➕ Adding new column...')
    // Create a new column with empty question
    const newColumn = await onAddColumn('') // Create with empty question
    
    if (newColumn) {
      console.log('✅ New column created:', newColumn.id)
      // Auto-start editing the new column
      setEditingColumn(newColumn.id)
      setEditValue('')
    } else {
      console.error('❌ Failed to create new column')
    }
  }, [onAddColumn])

  // Drag and drop for columns
  const handleDragStart = useCallback((e, columnId) => {
    setDraggedColumnId(columnId)
    e.dataTransfer.setData('columnId', columnId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e, columnId) => {
    e.preventDefault()
    if (draggedColumnId === columnId) return
    setDragOverColumnId(columnId)
  }, [draggedColumnId])

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('columnId')
    
    if (sourceId === targetId) {
      setDraggedColumnId(null)
      setDragOverColumnId(null)
      return
    }

    const columnIds = columns.map(c => c.id)
    const sourceIdx = columnIds.indexOf(sourceId)
    const targetIdx = columnIds.indexOf(targetId)
    
    const newOrder = [...columnIds]
    newOrder.splice(sourceIdx, 1)
    newOrder.splice(targetIdx, 0, sourceId)
    
    onReorderColumns(newOrder)
    setDraggedColumnId(null)
    setDragOverColumnId(null)
  }, [columns, onReorderColumns])

  const handleDragEnd = useCallback(() => {
    setDraggedColumnId(null)
    setDragOverColumnId(null)
  }, [])
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp * 1000) // Convert Unix timestamp to milliseconds
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
    })
  }
  
  const formatNumber = (num) => {
    if (!num) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }
  
  const toggleDocMenu = useCallback((docName) => {
    setOpenDocMenu((prev) => (prev === docName ? null : docName))
  }, [])
  
  // Handle manual cell resize (drag) - locks the dimension
  const handleManualResize = useCallback((rowIndex, columnId, newWidth, newHeight) => {
    console.log('🔒 Manual resize:', { rowIndex, columnId, newWidth, newHeight })
    
    setColumnWidths(prev => ({
      ...prev,
      [columnId]: Math.max(newWidth, 200)
    }))
    setRowHeights(prev => ({
      ...prev,
      [rowIndex]: Math.max(newHeight, 80)
    }))
    
    // Mark as manually locked
    setLockedColumns(prev => new Set(prev).add(columnId))
    setLockedRows(prev => new Set(prev).add(rowIndex))
  }, [])
  
  // Release locks when content changes (e.g., after execution)
  const releaseLocks = useCallback(() => {
    setLockedColumns(new Set())
    setLockedRows(new Set())
    setColumnWidths({})
    setRowHeights({})
  }, [])
  
  // Release locks when results change (content updated)
  useEffect(() => {
    releaseLocks()
  }, [results, rowSummaries, columnSummaries, releaseLocks])
  
  // Close doc menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDocMenu && !e.target.closest('[data-doc-menu]')) {
        setOpenDocMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDocMenu])
  
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const iconColor = {
      pdf: '#ef4444',
      docx: '#3b82f6',
      xlsx: '#22c55e',
      txt: '#94a3b8',
      md: '#94a3b8',
      csv: '#f59e0b',
      json: '#a78bfa',
    }[ext] || 'var(--color-text-muted)'
    
    return (
      <svg style={{ ...styles.fileIcon, color: iconColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    )
  }
  
  // Grid template columns: row header + question columns + summary column + add button
  // Use locked widths if available, otherwise use default minmax
  const gridTemplateColumns = useMemo(() => {
    const rowHeaderWidth = '220px'
    const addButtonWidth = '160px'
    
    // Build column widths for each question column
    const questionColumnWidths = columns.map(col => {
      if (lockedColumns.has(col.id) && columnWidths[col.id]) {
        return `${columnWidths[col.id]}px`
      }
      return 'minmax(200px, 300px)'
    }).join(' ')
    
    // Summary column width
    const summaryColumnWidth = lockedColumns.has('summary') && columnWidths['summary']
      ? `${columnWidths['summary']}px`
      : 'minmax(200px, 300px)'
    
    return `${rowHeaderWidth} ${questionColumnWidths} ${summaryColumnWidth} ${addButtonWidth}`
  }, [columns, columnWidths, lockedColumns])
  
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
      <div style={styles.scrollArea}>
        <div style={{ ...styles.grid, gridTemplateColumns }}>
          {/* Header row */}
          <div style={styles.headerRow}>
            {/* Corner cell */}
            <div style={styles.cornerCell}>
              Documents
            </div>
            
            {/* Column headers (questions) */}
            {columns.map((column) => (
              <div 
                key={column.id} 
                style={{
                  ...styles.columnHeader,
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
                            ...(hoveredAction === `run-${column.id}` && !executingColumns.has(column.id) && !isExecuting ? styles.iconBtnHover : {}),
                            ...(executingColumns.has(column.id) || isExecuting ? styles.iconBtnDisabled : {}),
                          }}
                          onClick={() => onRefreshColumn(column.id)}
                          onMouseEnter={() => setHoveredAction(`run-${column.id}`)}
                          onMouseLeave={() => setHoveredAction(null)}
                          title="Run this column"
                          disabled={executingColumns.has(column.id) || isExecuting}
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
            <div style={{ ...styles.columnHeader, ...styles.summaryHeader }}>
              <span style={styles.questionText}>Document Summary</span>
            </div>
            
            {/* Add column button */}
            <button
              style={{
                ...styles.addColumnBtn,
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
          
          {/* Document rows */}
          {documents.map((doc, rowIndex) => (
            <div key={doc.name} style={{ display: 'contents' }}>
              {/* Row header (document name) */}
              <div 
                style={{
                  ...styles.rowHeader,
                  zIndex: openDocMenu === doc.name ? 9999 : 10
                }} 
                data-doc-menu
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
                    ...(hoveredAction === `run-row-${doc.name}` && !executingRows.has(doc.name) && !isExecuting ? styles.iconBtnHover : {}),
                    ...(executingRows.has(doc.name) || isExecuting ? styles.iconBtnDisabled : {}),
                  }}
                  onClick={() => onRefreshRow(doc.name)}
                  onMouseEnter={() => setHoveredAction(`run-row-${doc.name}`)}
                  onMouseLeave={() => setHoveredAction(null)}
                  title="Run this row"
                  disabled={executingRows.has(doc.name) || isExecuting}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
                
                {/* Document metadata menu */}
                {openDocMenu === doc.name && (
                  <div style={styles.docMenu} data-doc-menu>
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
              
              {/* Data cells */}
              {columns.map((column) => (
                <MatrixCell
                  key={`${doc.name}:${column.id}`}
                  result={getCellResult(doc.name, column.id)}
                  onRefresh={() => onRefreshCell(doc.name, column.id)}
                  onOpenDocument={onOpenDocument}
                  isRefreshing={refreshingCells[`${doc.name}:${column.id}`]}
                  cellHeight={lockedRows.has(rowIndex) ? rowHeights[rowIndex] : null}
                  onManualResize={(width, height) => handleManualResize(rowIndex, column.id, width, height)}
                />
              ))}
              
              {/* Row summary cell */}
              <MatrixCell
                result={rowSummaries[doc.name]}
                isSummary
                onOpenDocument={onOpenDocument}
                cellHeight={lockedRows.has(rowIndex) ? rowHeights[rowIndex] : null}
                onManualResize={(width, height) => handleManualResize(rowIndex, 'summary', width, height)}
              />
              
              {/* Empty cell for add column space */}
              <div />
            </div>
          ))}
          
          {/* Summary row */}
          <div style={{ display: 'contents' }}>
            {/* Summary row header */}
            <div style={{ ...styles.rowHeader, ...styles.summaryRowHeader }}>
              <svg style={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Question Summaries</span>
            </div>
            
            {/* Column summary cells */}
            {columns.map((column) => (
              <MatrixCell
                key={`summary:${column.id}`}
                result={columnSummaries[column.id]}
                isSummary
                onOpenDocument={onOpenDocument}
                cellHeight={lockedRows.has('summary') ? rowHeights['summary'] : null}
                onManualResize={(width, height) => handleManualResize('summary', column.id, width, height)}
              />
            ))}
            
            {/* Overall summary cell */}
            <MatrixCell
              result={overallSummary}
              isOverall
              onOpenDocument={onOpenDocument}
              cellHeight={lockedRows.has('summary') ? rowHeights['summary'] : null}
              onManualResize={(width, height) => handleManualResize('summary', 'summary', width, height)}
            />
            
            {/* Empty cell for add column space */}
            <div />
          </div>
        </div>
      </div>
    </div>
  )
}

