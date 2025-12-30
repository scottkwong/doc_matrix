/**
 * Project Selector Component
 * 
 * Dropdown for selecting, creating, and deleting Doc Matrix projects.
 * Shows existing projects in the current folder's .doc_matrix directory.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import Dialog from './Dialog'

const styles = {
  container: {
    position: 'relative',
    display: 'inline-block',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    minWidth: '200px',
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  triggerHover: {
    borderColor: 'var(--color-accent)',
  },
  triggerOpen: {
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 0 3px var(--color-accent-subtle)',
  },
  projectIcon: {
    width: '16px',
    height: '16px',
    color: 'var(--color-accent)',
  },
  projectName: {
    flex: 1,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chevron: {
    width: '16px',
    height: '16px',
    color: 'var(--color-text-muted)',
    transition: 'transform var(--transition-fast)',
  },
  chevronOpen: {
    transform: 'rotate(180deg)',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    minWidth: '280px',
    maxHeight: '360px',
    overflowY: 'auto',
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    zIndex: 'var(--z-dropdown)',
    animation: 'slideDown 0.15s ease',
  },
  section: {
    padding: 'var(--space-2)',
  },
  sectionLabel: {
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-xs)',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  projectItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  projectItemHover: {
    background: 'var(--color-surface-hover)',
  },
  projectItemActive: {
    background: 'var(--color-accent-subtle)',
  },
  projectInfo: {
    flex: 1,
    minWidth: 0,
  },
  projectTitle: {
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    color: 'var(--color-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  projectMeta: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  deleteBtn: {
    padding: 'var(--space-1)',
    color: 'var(--color-text-muted)',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    opacity: 0,
    transition: 'all var(--transition-fast)',
  },
  deleteBtnVisible: {
    opacity: 1,
  },
  deleteBtnHover: {
    color: 'var(--color-error)',
    background: 'var(--color-error-bg)',
  },
  createSection: {
    padding: 'var(--space-3)',
    borderTop: '1px solid var(--color-surface-border)',
  },
  createInput: {
    width: '100%',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    transition: 'all var(--transition-fast)',
  },
  createInputFocus: {
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 0 3px var(--color-accent-subtle)',
  },
  createBtn: {
    width: '100%',
    marginTop: 'var(--space-2)',
    padding: 'var(--space-2)',
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    color: 'white',
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  emptyState: {
    padding: 'var(--space-6)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-sm)',
  },
}

export default function ProjectSelector({
  projects = [],
  currentProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  loading = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [hoveredProject, setHoveredProject] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Focus input when creating
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])
  
  const handleSelect = useCallback((project) => {
    onSelectProject(project.name)
    setIsOpen(false)
  }, [onSelectProject])
  
  const handleCreate = useCallback(async () => {
    const name = newProjectName.trim()
    if (!name) return
    
    setIsCreating(true)
    try {
      await onCreateProject(name)
      setNewProjectName('')
      setIsOpen(false)
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setIsCreating(false)
    }
  }, [newProjectName, onCreateProject])
  
  const handleDelete = useCallback((e, projectName) => {
    e.stopPropagation()
    setProjectToDelete(projectName)
    setDeleteDialogOpen(true)
  }, [])
  
  const confirmDelete = useCallback(async () => {
    if (projectToDelete) {
      await onDeleteProject(projectToDelete)
      setProjectToDelete(null)
    }
    setDeleteDialogOpen(false)
  }, [projectToDelete, onDeleteProject])
  
  const cancelDelete = useCallback(() => {
    setDeleteDialogOpen(false)
    setProjectToDelete(null)
  }, [])
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleCreate()
    }
  }, [handleCreate])
  
  const formatDate = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
    })
  }
  
  return (
    <div ref={containerRef} style={styles.container}>
      <button
        style={{
          ...styles.trigger,
          ...(isOpen ? styles.triggerOpen : {}),
        }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <svg style={styles.projectIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3h7l2 2h9a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        </svg>
        <span style={styles.projectName}>
          {loading ? 'Loading...' : currentProject || 'Select project...'}
        </span>
        <svg 
          style={{
            ...styles.chevron,
            ...(isOpen ? styles.chevronOpen : {}),
          }} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      
      {isOpen && (
        <div style={styles.dropdown}>
          {projects.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Projects</div>
              {projects.map((project) => (
                <div
                  key={project.name}
                  style={{
                    ...styles.projectItem,
                    ...(hoveredProject === project.name ? styles.projectItemHover : {}),
                    ...(currentProject === project.name ? styles.projectItemActive : {}),
                  }}
                  onClick={() => handleSelect(project)}
                  onMouseEnter={() => setHoveredProject(project.name)}
                  onMouseLeave={() => setHoveredProject(null)}
                >
                  <svg 
                    style={{ width: '18px', height: '18px', color: 'var(--color-accent)' }} 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  <div style={styles.projectInfo}>
                    <div style={styles.projectTitle}>{project.name}</div>
                    <div style={styles.projectMeta}>
                      {project.column_count} questions · {formatDate(project.updated_at)}
                    </div>
                  </div>
                  <button
                    style={{
                      ...styles.deleteBtn,
                      ...(hoveredProject === project.name ? styles.deleteBtnVisible : {}),
                    }}
                    onClick={(e) => handleDelete(e, project.name)}
                    title="Delete project"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {projects.length === 0 && (
            <div style={styles.emptyState}>
              No projects yet. Create one below.
            </div>
          )}
          
          <div style={styles.createSection}>
            <input
              ref={inputRef}
              type="text"
              placeholder="New project name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              style={styles.createInput}
              disabled={isCreating}
            />
            <button
              style={styles.createBtn}
              onClick={handleCreate}
              disabled={!newProjectName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : '+ Create Project'}
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      {/* Delete confirmation dialog */}
      <Dialog
        isOpen={deleteDialogOpen}
        type="confirm"
        title="Delete Project"
        message={`Are you sure you want to delete project "${projectToDelete}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onClose={cancelDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}

