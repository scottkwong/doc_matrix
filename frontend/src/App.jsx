/**
 * Doc Matrix - Main Application Component
 * 
 * Document analysis matrix application for querying documents with LLMs.
 * Point to a folder, create question columns, and execute queries in parallel.
 */

import { useEffect, useState, useCallback } from 'react'
import { useApi } from './shell/useApi'
import { useNative } from './shell/useNative'
import Header from './app/Header'
import MatrixView from './app/MatrixView'
import ChatPanel from './app/ChatPanel'

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'var(--color-bg-primary)',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    minHeight: 0,
  },
  loading: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--color-surface-border)',
    borderTopColor: 'var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-muted)',
  },
  welcomeScreen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-6)',
    padding: 'var(--space-8)',
    textAlign: 'center',
  },
  welcomeLogo: {
    width: '80px',
    height: '80px',
    color: 'var(--color-accent)',
  },
  welcomeTitle: {
    fontSize: 'var(--text-3xl)',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-text-primary)',
  },
  welcomeText: {
    fontSize: 'var(--text-base)',
    color: 'var(--color-text-secondary)',
    maxWidth: '500px',
    lineHeight: '1.6',
  },
  welcomeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-6)',
    fontSize: 'var(--text-base)',
    fontWeight: '600',
    color: 'white',
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
}

export default function App() {
  // Core state
  const [root, setRoot] = useState('')
  const [projects, setProjects] = useState([])
  const [currentProject, setCurrentProject] = useState(null)
  const [projectData, setProjectData] = useState(null)
  
  // Settings state
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('gpt-5.2')
  const [executionMode, setExecutionMode] = useState('parallel')
  
  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [refreshingCells, setRefreshingCells] = useState({})
  const [executingColumns, setExecutingColumns] = useState(new Set())
  const [executingRows, setExecutingRows] = useState(new Set())
  const [chatMessages, setChatMessages] = useState([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  
  const { get, post, apiCall } = useApi()
  const { chooseFolder } = useNative()
  
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [rootData, modelsData, settingsData] = await Promise.all([
          get('/root'),
          get('/models'),
          get('/settings'),
        ])
        
        setRoot(rootData.root || '')
        setModels(modelsData.models || [])
        setSelectedModel(settingsData.default_model || 'gpt-5.2')
        
        // Load projects if we have a root
        if (rootData.root) {
          const projectsData = await get('/projects')
          setProjects(projectsData.projects || [])
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadInitialData()
  }, [get])
  
  // Load project data when project changes
  useEffect(() => {
    if (!currentProject) {
      setProjectData(null)
      setChatMessages([])
      return
    }
    
    const loadProject = async () => {
      try {
        const [project, chatHistory] = await Promise.all([
          get(`/projects/${encodeURIComponent(currentProject)}`),
          get(`/projects/${encodeURIComponent(currentProject)}/chat/history`),
        ])
        
        setProjectData(project)
        setChatMessages(chatHistory.messages || [])
        
        // Update execution mode from project config
        if (project.config?.execution_mode) {
          setExecutionMode(project.config.execution_mode)
        }
        if (project.config?.model) {
          setSelectedModel(project.config.model)
        }
      } catch (error) {
        console.error('Failed to load project:', error)
      }
    }
    
    loadProject()
  }, [currentProject, get])
  
  // Handle folder selection
  const handleChangeFolder = useCallback(async (selectedPath) => {
    console.log('🔄 Change folder clicked')
    
    // If invoked from an onClick without args, selectedPath may be an event; ignore it.
    if (selectedPath && typeof selectedPath === 'object' && selectedPath.preventDefault) {
      selectedPath = undefined
    }

    // If no path provided, this is being called from legacy flow
    // Try native picker first, then fall back to file browser
    if (!selectedPath) {
      const isNativeApp = window.pywebview && window.pywebview.api
      console.log('Running in native app:', isNativeApp)
      
      if (isNativeApp) {
        // Native app: use folder picker
        console.log('Using native folder picker')
        const result = await chooseFolder(root)
        console.log('Folder picker result:', result)
        
        if (!result.cancelled) {
          const rootData = await get('/root')
          setRoot(rootData.root || '')
          
          // Refresh projects list
          const projectsData = await get('/projects')
          setProjects(projectsData.projects || [])
          setCurrentProject(null)
          setProjectData(null)
          console.log('✅ Folder changed successfully')
        }
      } else {
        // Browser fallback: prompt for a path
        const entered = window.prompt('Enter a folder path to use as root:', root || '')
        if (entered) {
          try {
            await post('/root', { root: entered })
            const rootData = await get('/root')
            setRoot(rootData.root || '')
            const projectsData = await get('/projects')
            setProjects(projectsData.projects || [])
            setCurrentProject(null)
            setProjectData(null)
            console.log('✅ Folder changed successfully (browser prompt)')
          } catch (error) {
            console.error('❌ Failed to change folder (prompt):', error)
            alert(`Failed to change folder: ${error.message}`)
          }
        }
      }
      return
    }
    
    // Path was provided from file browser
    console.log('Setting new path from browser:', selectedPath)
    try {
      await post('/root', { root: selectedPath })
      const rootData = await get('/root')
      setRoot(rootData.root || '')
      
      // Refresh projects list
      const projectsData = await get('/projects')
      setProjects(projectsData.projects || [])
      setCurrentProject(null)
      setProjectData(null)
      console.log('✅ Folder changed successfully')
    } catch (error) {
      console.error('❌ Failed to change folder:', error)
      alert(`Failed to change folder: ${error.message}`)
    }
  }, [chooseFolder, root, get, post])
  
  // Project management
  const handleSelectProject = useCallback((projectName) => {
    setCurrentProject(projectName)
  }, [])
  
  const handleCreateProject = useCallback(async (name) => {
    const result = await post('/projects', { name, model: selectedModel })
    if (result.ok) {
      // Refresh projects list and select the new project
      const projectsData = await get('/projects')
      setProjects(projectsData.projects || [])
      setCurrentProject(name)
    }
    return result
  }, [post, get, selectedModel])
  
  const handleDeleteProject = useCallback(async (name) => {
    await apiCall(`/projects/${encodeURIComponent(name)}`, { method: 'DELETE' })
    
    // Refresh projects list
    const projectsData = await get('/projects')
    setProjects(projectsData.projects || [])
    
    if (currentProject === name) {
      setCurrentProject(null)
      setProjectData(null)
    }
  }, [apiCall, get, currentProject])
  
  // Model and settings
  const handleChangeModel = useCallback(async (model) => {
    setSelectedModel(model)
    
    if (currentProject) {
      await apiCall(`/projects/${encodeURIComponent(currentProject)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      })
    }
  }, [apiCall, currentProject])
  
  const handleChangeExecutionMode = useCallback(async (mode) => {
    setExecutionMode(mode)
    
    if (currentProject) {
      await apiCall(`/projects/${encodeURIComponent(currentProject)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_mode: mode }),
      })
    }
  }, [apiCall, currentProject])
  
  // Column management
  const handleAddColumn = useCallback(async (question) => {
    if (!currentProject) return null
    
    const result = await post(`/projects/${encodeURIComponent(currentProject)}/columns`, { question })
    if (result.ok) {
      // Refresh project data
      const project = await get(`/projects/${encodeURIComponent(currentProject)}`)
      setProjectData(project)
      return result.column
    }
    return null
  }, [currentProject, post, get])
  
  const handleUpdateColumn = useCallback(async (columnId, question) => {
    if (!currentProject) return
    
    await apiCall(`/projects/${encodeURIComponent(currentProject)}/columns/${columnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    
    // Refresh project data
    const project = await get(`/projects/${encodeURIComponent(currentProject)}`)
    setProjectData(project)
  }, [currentProject, apiCall, get])
  
  const handleDeleteColumn = useCallback(async (columnId) => {
    if (!currentProject || !window.confirm('Delete this question and all its answers?')) return
    
    await apiCall(`/projects/${encodeURIComponent(currentProject)}/columns/${columnId}`, {
      method: 'DELETE',
    })
    
    // Refresh project data
    const project = await get(`/projects/${encodeURIComponent(currentProject)}`)
    setProjectData(project)
  }, [currentProject, apiCall, get])

  const handleReorderColumns = useCallback(async (columnIds) => {
    if (!currentProject) return
    
    // Optimistic update
    setProjectData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        columns: columnIds.map(id => prev.config.columns.find(c => c.id === id))
      }
    }))
    
    const result = await apiCall(`/projects/${encodeURIComponent(currentProject)}/columns/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_ids: columnIds }),
    })
    
    if (!result.ok) {
      // Revert on error
      const project = await get(`/projects/${encodeURIComponent(currentProject)}`)
      setProjectData(project)
    }
  }, [currentProject, apiCall, get])
  
  // Execution Polling
  const startPolling = useCallback(() => {
    if (!currentProject) return
    
    setIsExecuting(true)
    
    const pollInterval = setInterval(async () => {
      try {
        // Get full project state to update UI
        const project = await get(`/projects/${encodeURIComponent(currentProject)}`)
        setProjectData(project)
        
        // Check if still running
        const status = await get(`/projects/${encodeURIComponent(currentProject)}/status`)
        console.log('⏱️ Poll tick', {
          is_running: status?.is_running,
          timestamp: new Date().toISOString(),
        })
        if (!status.is_running) {
          clearInterval(pollInterval)
          setIsExecuting(false)
          // Clear all executing state when complete
          setExecutingColumns(new Set())
          setExecutingRows(new Set())
          console.log('🏁 Execution complete')
          console.groupEnd()
        }
      } catch (error) {
        console.error('❌ Polling error:', error)
        clearInterval(pollInterval)
        setIsExecuting(false)
        // Clear all executing state on error
        setExecutingColumns(new Set())
        setExecutingRows(new Set())
        console.groupEnd()
      }
    }, 2000)
    
    return pollInterval
  }, [currentProject, get])

  // Execution
  const handleExecuteAll = useCallback(async () => {
    if (!currentProject || isExecuting) return
    
    console.group('🎬 Execute All Started')
    console.log('Project:', currentProject)
    console.log('Model:', selectedModel)
    console.log('Mode:', executionMode)
    
    try {
      console.log('📡 Sending execute request to API...')
      await post(`/projects/${encodeURIComponent(currentProject)}/execute`, {
        model: selectedModel,
      })
      
      console.log('✅ Execution started in background')
      startPolling()
      
    } catch (error) {
      console.error('❌ API: Execute all failed:', error)
      setIsExecuting(false)
      console.groupEnd()
      alert(`Execution failed: ${error.message}`)
    }
  }, [currentProject, isExecuting, selectedModel, executionMode, post, startPolling])
  
  const handleRefreshCell = useCallback(async (filename, columnId) => {
    if (!currentProject || isExecuting) return
    
    const cellKey = `${filename}:${columnId}`
    console.group(`🔄 Refresh Cell: ${cellKey}`)
    
    setRefreshingCells((prev) => ({ ...prev, [cellKey]: true }))
    
    try {
      console.log(`📡 Sending API request for cell ${cellKey}...`)
      await post(`/projects/${encodeURIComponent(currentProject)}/execute/cell`, {
        filename,
        column_id: columnId,
        model: selectedModel,
      })
      
      console.log(`✅ Cell ${cellKey} started in background`)
      startPolling()
    } catch (error) {
      console.error(`❌ Cell ${cellKey} failed:`, error)
      console.groupEnd()
      alert(`Refresh failed: ${error.message}`)
    } finally {
      setRefreshingCells((prev) => ({ ...prev, [cellKey]: false }))
    }
  }, [currentProject, isExecuting, post, selectedModel, startPolling])
  
  const handleRefreshRow = useCallback(async (filename) => {
    if (!currentProject || isExecuting || executingRows.has(filename)) return
    
    console.group(`📄 Refresh Row: ${filename}`)
    
    // Mark row as executing
    setExecutingRows((prev) => new Set(prev).add(filename))
    
    // Mark all cells in this row as refreshing
    const columns = projectData?.config?.columns || []
    const updates = {}
    columns.forEach((col) => {
      updates[`${filename}:${col.id}`] = true
    })
    setRefreshingCells((prev) => ({ ...prev, ...updates }))
    
    try {
      await post(`/projects/${encodeURIComponent(currentProject)}/execute/row/${encodeURIComponent(filename)}`, {
        model: selectedModel,
      })
      
      console.log(`✅ Row ${filename} started in background`)
      startPolling()
    } catch (error) {
      console.error(`❌ Row ${filename} failed:`, error)
      console.groupEnd()
      alert(`Refresh failed: ${error.message}`)
      // Clear executing state on error
      setExecutingRows((prev) => {
        const next = new Set(prev)
        next.delete(filename)
        return next
      })
    } finally {
      const clearUpdates = {}
      columns.forEach((col) => {
        clearUpdates[`${filename}:${col.id}`] = false
      })
      setRefreshingCells((prev) => ({ ...prev, ...clearUpdates }))
    }
  }, [currentProject, isExecuting, executingRows, projectData, post, selectedModel, startPolling])
  
  const handleRefreshColumn = useCallback(async (columnId) => {
    if (!currentProject || isExecuting || executingColumns.has(columnId)) return
    
    console.group(`📊 Refresh Column: ${columnId}`)
    
    // Mark column as executing
    setExecutingColumns((prev) => new Set(prev).add(columnId))
    
    // Mark all cells in this column as refreshing
    const documents = projectData?.documents || []
    const updates = {}
    documents.forEach((doc) => {
      updates[`${doc.name}:${columnId}`] = true
    })
    setRefreshingCells((prev) => ({ ...prev, ...updates }))
    
    try {
      await post(`/projects/${encodeURIComponent(currentProject)}/execute/column/${columnId}`, {
        model: selectedModel,
      })
      
      console.log(`✅ Column ${columnId} started in background`)
      startPolling()
    } catch (error) {
      console.error(`❌ Column ${columnId} failed:`, error)
      console.groupEnd()
      // Clear executing state on error
      setExecutingColumns((prev) => {
        const next = new Set(prev)
        next.delete(columnId)
        return next
      })
    }
      alert(`Refresh failed: ${error.message}`)
    } finally {
      const clearUpdates = {}
      documents.forEach((doc) => {
        clearUpdates[`${doc.name}:${columnId}`] = false
      })
      setRefreshingCells((prev) => ({ ...prev, ...clearUpdates }))
    }
  }, [currentProject, isExecuting, projectData, post, selectedModel, startPolling])
  
  // Document opening
  const handleOpenDocument = useCallback(async (filename) => {
    await post('/open', { rel_path: filename })
  }, [post])
  
  // Chat
  const handleSendMessage = useCallback(async (message) => {
    if (!currentProject || isChatLoading) return
    
    console.group('💬 Chat Message')
    console.log('Question:', message)
    console.time('Chat Response Time')
    
    // Add user message immediately
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    setChatMessages((prev) => [...prev, userMessage])
    
    setIsChatLoading(true)
    try {
      console.log('📡 Sending chat request...')
      const result = await post(`/projects/${encodeURIComponent(currentProject)}/chat`, {
        message,
        model: selectedModel,
      })
      
      if (result.ok && result.response) {
        const preview = result.response.content?.substring(0, 100) + '...'
        console.log('✅ Chat response received:', preview)
        console.timeEnd('Chat Response Time')
        
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response.content,
          citations: result.response.citations,
          timestamp: new Date().toISOString(),
        }
        setChatMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('❌ Chat failed:', error)
      console.timeEnd('Chat Response Time')
      // Add error message
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, there was an error processing your question. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsChatLoading(false)
      console.groupEnd()
    }
  }, [currentProject, isChatLoading, post, selectedModel])
  
  const handleClearChat = useCallback(async () => {
    if (!currentProject) return
    
    await apiCall(`/projects/${encodeURIComponent(currentProject)}/chat/history`, {
      method: 'DELETE',
    })
    setChatMessages([])
  }, [currentProject, apiCall])
  
  const handleToggleChatCollapse = useCallback(() => {
    setIsChatCollapsed((prev) => !prev)
  }, [])
  
  // Loading state
  if (isLoading) {
    return (
      <div style={styles.app}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading Doc Matrix...</span>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }
  
  // Welcome screen (no folder selected)
  if (!root) {
    return (
      <div style={styles.app}>
        <div style={styles.welcomeScreen}>
          <svg style={styles.welcomeLogo} viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <h1 style={styles.welcomeTitle}>Doc Matrix</h1>
          <p style={styles.welcomeText}>
            Analyze documents with AI. Select a folder containing your documents, 
            create questions as columns, and run queries against each document in parallel.
          </p>
          <button
            style={styles.welcomeBtn}
            onClick={(e) => {
              e.preventDefault()
              handleChangeFolder()
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Select Folder
          </button>
        </div>
      </div>
    )
  }
  
  // Main application
  return (
    <div style={styles.app}>
      <Header
        root={root}
        projects={projects}
        currentProject={currentProject}
        projectMetadata={projectData?.config}
        models={models}
        selectedModel={selectedModel}
        executionMode={executionMode}
        isExecuting={isExecuting}
        onChangeFolder={handleChangeFolder}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onChangeModel={handleChangeModel}
        onChangeExecutionMode={handleChangeExecutionMode}
        onExecute={handleExecuteAll}
      />
      
      <main style={styles.main}>
        <div style={styles.content}>
          {currentProject && projectData ? (
            <MatrixView
              documents={projectData.documents || []}
              columns={projectData.config?.columns || []}
              results={projectData.results?.cells || {}}
              rowSummaries={projectData.results?.row_summaries || {}}
              columnSummaries={projectData.results?.column_summaries || {}}
              overallSummary={projectData.results?.overall_summary}
              refreshingCells={refreshingCells}
              executingColumns={executingColumns}
              executingRows={executingRows}
              isExecuting={isExecuting}
              onAddColumn={handleAddColumn}
              onUpdateColumn={handleUpdateColumn}
              onDeleteColumn={handleDeleteColumn}
              onReorderColumns={handleReorderColumns}
              onRefreshCell={handleRefreshCell}
              onRefreshRow={handleRefreshRow}
              onRefreshColumn={handleRefreshColumn}
              onOpenDocument={handleOpenDocument}
            />
          ) : (
            <div style={styles.welcomeScreen}>
              <svg style={{ ...styles.welcomeLogo, width: '60px', height: '60px', opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3h7l2 2h9a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
              </svg>
              <h2 style={{ ...styles.welcomeTitle, fontSize: 'var(--text-xl)' }}>
                Select or create a project
              </h2>
              <p style={{ ...styles.welcomeText, fontSize: 'var(--text-sm)' }}>
                Use the dropdown above to select an existing project or create a new one.
              </p>
            </div>
          )}
        </div>
        
        <ChatPanel
          messages={chatMessages}
          isLoading={isChatLoading}
          disabled={!currentProject}
          isCollapsed={isChatCollapsed}
          onToggleCollapse={handleToggleChatCollapse}
          onSendMessage={handleSendMessage}
          onClearHistory={handleClearChat}
          onOpenDocument={handleOpenDocument}
        />
      </main>
    </div>
  )
}
