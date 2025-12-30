/**
 * File Browser Component
 * 
 * Modal file browser for selecting folders. Shows directory hierarchy,
 * navigation with keyboard controls, and highlights folders containing
 * Doc Matrix projects.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 'var(--z-modal)',
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    width: '90%',
    maxWidth: '700px',
    maxHeight: '80vh',
    background: 'var(--color-bg-elevated)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-2xl)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'slideUp 0.2s ease',
  },
  header: {
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--color-surface-border)',
  },
  title: {
    fontSize: 'var(--text-lg)',
    fontWeight: '600',
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-2)',
  },
  currentPath: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    background: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-mono)',
  },
  selectedFolder: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3)',
    marginBottom: 'var(--space-2)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-accent-subtle)',
    border: '2px solid var(--color-accent)',
  },
  selectedFolderIcon: {
    flexShrink: 0,
    width: '20px',
    height: '20px',
    color: 'var(--color-accent)',
  },
  selectedFolderInfo: {
    flex: 1,
    minWidth: 0,
  },
  selectedFolderLabel: {
    fontSize: 'var(--text-xs)',
    fontWeight: '600',
    color: 'var(--color-accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 'var(--space-1)',
  },
  selectedFolderName: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--text-sm)',
    fontWeight: '600',
    color: 'var(--color-text-primary)',
  },
  selectedFolderNameText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  radioButton: {
    flexShrink: 0,
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid var(--color-accent)',
    background: 'var(--color-accent)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'white',
  },
  sectionDivider: {
    margin: 'var(--space-3) 0',
    height: '1px',
    background: 'var(--color-surface-border)',
  },
  sectionLabel: {
    fontSize: 'var(--text-xs)',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 'var(--space-2)',
    paddingLeft: 'var(--space-3)',
  },
  pathIcon: {
    flexShrink: 0,
    width: '16px',
    height: '16px',
    color: 'var(--color-text-muted)',
  },
  pathText: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  navigation: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginTop: 'var(--space-3)',
  },
  navButton: {
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  navButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: 'var(--space-2)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  directoryItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    border: '2px solid transparent',
  },
  directoryItemHover: {
    background: 'var(--color-surface-hover)',
  },
  directoryItemFocused: {
    borderColor: 'var(--color-accent)',
    background: 'var(--color-accent-subtle)',
  },
  directoryIcon: {
    flexShrink: 0,
    width: '20px',
    height: '20px',
    marginTop: '2px',
  },
  directoryInfo: {
    flex: 1,
    minWidth: 0,
  },
  directoryName: {
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-1)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  projectBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    padding: '2px var(--space-2)',
    fontSize: 'var(--text-xs)',
    fontWeight: '500',
    color: 'var(--color-accent)',
    background: 'var(--color-accent-subtle)',
    borderRadius: 'var(--radius-sm)',
    marginRight: 'var(--space-2)',
  },
  projectsList: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    marginTop: 'var(--space-1)',
  },
  emptyState: {
    padding: 'var(--space-8)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-sm)',
  },
  loading: {
    padding: 'var(--space-8)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid var(--color-surface-border)',
    borderTopColor: 'var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)',
    borderTop: '1px solid var(--color-surface-border)',
    gap: 'var(--space-3)',
  },
  hint: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
  },
  buttonGroup: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  button: {
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  buttonPrimary: {
    color: 'white',
    background: 'var(--color-accent)',
  },
  buttonSecondary: {
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-surface-border)',
  },
}

export default function FileBrowser({ 
  isOpen, 
  initialPath, 
  onSelect, 
  onCancel 
}) {
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState(null)
  const [directories, setDirectories] = useState([])
  const [canGoUp, setCanGoUp] = useState(false)
  const [currentHasProjects, setCurrentHasProjects] = useState(false)
  const [currentProjects, setCurrentProjects] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  
  const contentRef = useRef(null)
  const itemRefs = useRef([])
  
  // Load directory contents
  const loadDirectory = useCallback(async (path = null) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to load directory')
      }
      
      const data = await response.json()
      setCurrentPath(data.current)
      setParentPath(data.parent)
      setDirectories(data.directories)
      setCanGoUp(data.can_go_up)
      setCurrentHasProjects(data.current_has_projects || false)
      setCurrentProjects(data.current_projects || [])
      setFocusedIndex(-1) // Start with no subfolder focused
    } catch (error) {
      console.error('Failed to load directory:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Initialize with current path
  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath)
    }
  }, [isOpen, initialPath, loadDirectory])
  
  // Navigate to a directory
  const navigateToDirectory = useCallback((path) => {
    loadDirectory(path)
  }, [loadDirectory])
  
  // Go up one level
  const handleGoUp = useCallback(() => {
    if (canGoUp && parentPath) {
      navigateToDirectory(parentPath)
    }
  }, [canGoUp, parentPath, navigateToDirectory])
  
  // Go to home directory
  const handleGoHome = useCallback(() => {
    navigateToDirectory(null)
  }, [navigateToDirectory])
  
  // Select a directory
  const handleSelectDirectory = useCallback((dir) => {
    navigateToDirectory(dir.path)
  }, [navigateToDirectory])
  
  // Confirm selection
  const handleConfirm = useCallback(() => {
    onSelect(currentPath)
  }, [currentPath, onSelect])
  
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => 
            Math.min(prev + 1, directories.length - 1)
          )
          break
          
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, -1))
          break
          
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && directories[focusedIndex]) {
            handleSelectDirectory(directories[focusedIndex])
          } else if (focusedIndex === -1) {
            // If focused on current folder, select it
            handleConfirm()
          }
          break
          
        case 'ArrowLeft':
          e.preventDefault()
          handleGoUp()
          break
          
        case 'Escape':
          e.preventDefault()
          onCancel()
          break
          
        default:
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isOpen, 
    directories, 
    focusedIndex, 
    handleSelectDirectory, 
    handleGoUp, 
    onCancel
  ])
  
  // Scroll focused item into view
  useEffect(() => {
    if (itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [focusedIndex])
  
  if (!isOpen) return null
  
  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Select Folder</h2>
          
          <div style={styles.currentPath}>
            <svg style={styles.pathIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span style={styles.pathText} title={currentPath}>
              {currentPath}
            </span>
          </div>
          
          <div style={styles.navigation}>
            <button
              style={{
                ...styles.navButton,
                ...((!canGoUp) ? styles.navButtonDisabled : {}),
              }}
              onClick={handleGoUp}
              disabled={!canGoUp}
              title="Go up one level (←)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Up
            </button>
            
            <button
              style={styles.navButton}
              onClick={handleGoHome}
              title="Go to home directory"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Home
            </button>
          </div>
        </div>
        
        <div style={styles.content} ref={contentRef}>
          {isLoading ? (
            <div style={styles.loading}>
              <div style={styles.spinner} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                Loading...
              </span>
            </div>
          ) : (
            <>
              {/* Current folder being selected */}
              <div style={styles.selectedFolder}>
                <svg style={styles.selectedFolderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                
                <div style={styles.selectedFolderInfo}>
                  <div style={styles.selectedFolderLabel}>Currently Selecting</div>
                  <div style={styles.selectedFolderName}>
                    <span style={styles.selectedFolderNameText} title={currentPath}>
                      {currentPath.split('/').pop() || currentPath}
                    </span>
                    {currentHasProjects && (
                      <span style={styles.projectBadge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                        {currentProjects.length} {currentProjects.length === 1 ? 'project' : 'projects'}
                      </span>
                    )}
                  </div>
                  {currentHasProjects && (
                    <div style={styles.projectsList}>
                      Projects: {currentProjects.join(', ')}
                    </div>
                  )}
                </div>
                
                <div style={styles.radioButton}>
                  <div style={styles.radioButtonInner} />
                </div>
              </div>
              
              {/* Subdirectories to navigate into */}
              {directories.length > 0 && (
                <>
                  <div style={styles.sectionDivider} />
                  <div style={styles.sectionLabel}>Navigate Into:</div>
                </>
              )}
              
              {directories.length === 0 ? (
                <div style={styles.emptyState}>
                  No subdirectories to navigate into
                </div>
              ) : (
                <div style={styles.list}>
                  {directories.map((dir, index) => (
                <div
                  key={dir.path}
                  ref={(el) => (itemRefs.current[index] = el)}
                  style={{
                    ...styles.directoryItem,
                    ...(hoveredIndex === index ? styles.directoryItemHover : {}),
                    ...(focusedIndex === index ? styles.directoryItemFocused : {}),
                  }}
                  onClick={() => handleSelectDirectory(dir)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onMouseMove={() => {
                    if (focusedIndex !== index) {
                      setFocusedIndex(index)
                    }
                  }}
                >
                  <svg 
                    style={{
                      ...styles.directoryIcon,
                      color: dir.has_projects ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  
                  <div style={styles.directoryInfo}>
                    <div style={styles.directoryName}>
                      {dir.name}
                      {dir.has_projects && (
                        <span style={styles.projectBadge}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                          </svg>
                          {dir.projects.length} {dir.projects.length === 1 ? 'project' : 'projects'}
                        </span>
                      )}
                    </div>
                    {dir.has_projects && (
                      <div style={styles.projectsList}>
                        Projects: {dir.projects.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
                </div>
              )}
            </>
          )}
        </div>
        
        <div style={styles.footer}>
          <div style={styles.hint}>
            Use arrow keys to navigate • Enter to dive deeper • Esc to cancel
          </div>
          
          <div style={styles.buttonGroup}>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              style={{ ...styles.button, ...styles.buttonPrimary }}
              onClick={handleConfirm}
            >
              Select Current Folder
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

