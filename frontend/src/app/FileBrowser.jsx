/**
 * File Browser Component
 * 
 * Example application component showing file system navigation.
 * Replace this with your own app components.
 */

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../shell/useApi'
import { useNative } from '../shell/useNative'

export default function FileBrowser() {
  const [root, setRoot] = useState('')
  const [cwd, setCwd] = useState('')
  const [entries, setEntries] = useState([])
  const { get, post } = useApi()
  const { chooseFolder } = useNative()

  const refreshRoot = useCallback(async () => {
    try {
      const data = await get('/root')
      setRoot(data.root)
    } catch (error) {
      console.warn('Failed to fetch root:', error.message)
    }
  }, [get])

  const list = useCallback(async (path = '') => {
    try {
      const data = await get('/list', { path })
      if (data.error) {
        alert(data.error)
        return
      }
      setRoot(data.root || '')
      setCwd(data.cwd || '')
      setEntries(data.entries || [])
    } catch (error) {
      console.error('Failed to list directory:', error.message)
      alert(`Failed to load directory: ${error.message}`)
    }
  }, [get])

  const openFile = useCallback(async (relPath) => {
    await post('/open', { rel_path: relPath })
  }, [post])

  const handleChooseFolder = useCallback(async () => {
    const result = await chooseFolder(root)
    if (!result.cancelled) {
      await refreshRoot()
      await list('')
    }
  }, [chooseFolder, root, refreshRoot, list])

  const goUp = useCallback(() => {
    if (!cwd) return
    const parts = cwd.split('/').filter(Boolean)
    parts.pop()
    list(parts.join('/'))
  }, [cwd, list])

  const handleEntryDoubleClick = useCallback((entry) => {
    if (entry.is_dir) {
      list(entry.rel_path)
    } else {
      openFile(entry.rel_path)
    }
  }, [list, openFile])

  useEffect(() => {
    refreshRoot()
    list('')
  }, [refreshRoot, list])

  return (
    <div style={{ marginTop: 14 }}>
      <h3 style={{ margin: '8px 0' }}>File browser</h3>
      
      <div style={{ marginBottom: 8 }}>
        <button onClick={handleChooseFolder}>Open Folder…</button>
        <span style={{ marginLeft: 10, color: '#555' }}>
          Root: {root || '(loading...)'}
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <button onClick={goUp} disabled={!cwd}>Up</button>
        <span style={{ marginLeft: 12 }}>/ {cwd}</span>
      </div>

      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: 8, 
        padding: 8,
        minHeight: 200 
      }}>
        {entries.length === 0 ? (
          <div style={{ padding: 8, color: '#999' }}>
            No files or folders to display
          </div>
        ) : (
          entries.map((e) => (
            <FileEntry
              key={e.rel_path}
              entry={e}
              onDoubleClick={() => handleEntryDoubleClick(e)}
            />
          ))
        )}
      </div>

      <p style={{ marginTop: 8, color: '#666', fontSize: 14 }}>
        Double-click a folder to navigate. Double-click a file to open it.
      </p>
    </div>
  )
}

function FileEntry({ entry, onDoubleClick }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '6px 8px',
        cursor: 'default',
        userSelect: 'none',
        borderRadius: 6,
        background: isHovered ? '#f6f6f6' : 'transparent',
        transition: 'background 0.1s',
      }}
      title="Double-click to open"
    >
      <span style={{ display: 'inline-block', width: 22 }}>
        {entry.is_dir ? '📁' : '📄'}
      </span>
      {entry.name}
    </div>
  )
}

