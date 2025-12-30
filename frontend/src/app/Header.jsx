/**
 * Header Component
 * 
 * Top navigation bar with folder selection, project selector,
 * project metadata display, model selector, execution mode toggle, and run controls.
 */

import { useState, useCallback } from 'react'
import ProjectSelector from './ProjectSelector'
import FileBrowser from './FileBrowser'

const styles = {
  header: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-bg-secondary)',
    borderBottom: '1px solid var(--color-surface-border)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-3) var(--space-4)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-lg)',
    fontWeight: '700',
    color: 'var(--color-text-primary)',
  },
  logoIcon: {
    width: '24px',
    height: '24px',
    color: 'var(--color-accent)',
  },
  sectionLabel: {
    fontSize: 'var(--text-xs)',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginRight: 'var(--space-2)',
  },
  folderPath: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-secondary)',
    background: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  folderIcon: {
    flexShrink: 0,
    width: '16px',
    height: '16px',
    color: 'var(--color-text-muted)',
  },
  pathText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  changeFolderBtn: {
    flexShrink: 0,
    padding: 'var(--space-1) var(--space-2)',
    fontSize: 'var(--text-xs)',
    fontWeight: '500',
    color: 'var(--color-accent)',
    background: 'transparent',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  projectMetadata: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    background: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-md)',
  },
  metadataItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
  },
  metadataIcon: {
    width: '14px',
    height: '14px',
  },
  divider: {
    height: '1px',
    background: 'var(--color-surface-border)',
    margin: '0 var(--space-4)',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: '0 var(--space-4) var(--space-3)',
  },
  settingsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  settingLabel: {
    fontSize: 'var(--text-xs)',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  select: {
    padding: 'var(--space-2) var(--space-3)',
    paddingRight: 'var(--space-8)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface)',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    appearance: 'none',
  },
  toggle: {
    display: 'flex',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  toggleOption: {
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--text-sm)',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  toggleOptionActive: {
    color: 'var(--color-text-primary)',
    background: 'var(--color-accent-subtle)',
  },
  spacer: {
    flex: 1,
  },
  runButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--text-sm)',
    fontWeight: '600',
    color: 'white',
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  runButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  runIcon: {
    width: '16px',
    height: '16px',
  },
}

export default function Header({
  root,
  projects,
  currentProject,
  projectMetadata,
  models,
  selectedModel,
  executionMode,
  isExecuting,
  onChangeFolder,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onChangeModel,
  onChangeExecutionMode,
  onExecute,
}) {
  const [isHovering, setIsHovering] = useState(false)
  const [isBrowserOpen, setIsBrowserOpen] = useState(false)
  
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }
  
  const handleModelChange = useCallback((e) => {
    onChangeModel(e.target.value)
  }, [onChangeModel])
  
  const handleOpenBrowser = useCallback(() => {
    setIsBrowserOpen(true)
  }, [])
  
  const handleBrowserSelect = useCallback((selectedPath) => {
    setIsBrowserOpen(false)
    onChangeFolder(selectedPath)
  }, [onChangeFolder])
  
  const handleBrowserCancel = useCallback(() => {
    setIsBrowserOpen(false)
  }, [])
  
  const truncatePath = (path, maxLength = 60) => {
    if (!path || path.length <= maxLength) return path
    const parts = path.split('/')
    if (parts.length <= 2) return path
    
    // Keep first and last parts, truncate middle
    const first = parts[0] || ''
    const last = parts.slice(-2).join('/')
    return `${first}/.../${last}`
  }
  
  return (
    <header style={styles.header}>
      {/* Folder Row */}
      <div style={styles.row}>
        <div style={styles.logo}>
          <svg style={styles.logoIcon} viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Doc Matrix
        </div>
        
        <span style={styles.sectionLabel}>Folder</span>
        
        <div style={styles.folderPath}>
          <svg style={styles.folderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span style={styles.pathText} title={root}>
            {truncatePath(root) || 'No folder selected'}
          </span>
          <button 
            style={styles.changeFolderBtn}
            onClick={handleOpenBrowser}
          >
            Change
          </button>
        </div>
        
        <FileBrowser
          isOpen={isBrowserOpen}
          initialPath={root}
          onSelect={handleBrowserSelect}
          onCancel={handleBrowserCancel}
        />
      </div>
      
      {/* Project Row */}
      <div style={styles.row}>
        <span style={styles.sectionLabel}>Project</span>
        
        <ProjectSelector
          projects={projects}
          currentProject={currentProject}
          onSelectProject={onSelectProject}
          onCreateProject={onCreateProject}
          onDeleteProject={onDeleteProject}
        />
        
        {currentProject && projectMetadata && (
          <div style={styles.projectMetadata}>
            <div style={styles.metadataItem}>
              <svg style={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span title="Input tokens">
                In: {formatNumber(projectMetadata.total_input_tokens || 0)}
              </span>
            </div>
            <div style={styles.metadataItem}>
              <svg style={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span title="Output tokens">
                Out: {formatNumber(projectMetadata.total_output_tokens || 0)}
              </span>
            </div>
            <div style={styles.metadataItem}>
              <svg style={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span title="Total tokens">
                Total: {formatNumber((projectMetadata.total_input_tokens || 0) + (projectMetadata.total_output_tokens || 0))}
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div style={styles.divider} />
      
      {/* Controls Row */}
      <div style={styles.controlsRow}>
        <div style={styles.settingsGroup}>
          <span style={styles.settingLabel}>Model</span>
          <select
            style={styles.select}
            value={selectedModel}
            onChange={handleModelChange}
          >
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        
        <div style={styles.settingsGroup}>
          <span style={styles.settingLabel}>Mode</span>
          <div style={styles.toggle}>
            <button
              style={{
                ...styles.toggleOption,
                ...(executionMode === 'parallel' ? styles.toggleOptionActive : {}),
              }}
              onClick={() => onChangeExecutionMode('parallel')}
            >
              Parallel
            </button>
            <button
              style={{
                ...styles.toggleOption,
                ...(executionMode === 'row_wise' ? styles.toggleOptionActive : {}),
              }}
              onClick={() => onChangeExecutionMode('row_wise')}
            >
              Row-wise
            </button>
          </div>
        </div>
        
        <div style={styles.spacer} />
        
        <button
          style={{
            ...styles.runButton,
            ...(isExecuting || !currentProject ? styles.runButtonDisabled : {}),
          }}
          onClick={onExecute}
          disabled={isExecuting || !currentProject}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {isExecuting ? (
            <>
              <div className="spinner" style={styles.runIcon} />
              Running...
            </>
          ) : (
            <>
              <svg style={styles.runIcon} viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run All
            </>
          )}
        </button>
      </div>
    </header>
  )
}

