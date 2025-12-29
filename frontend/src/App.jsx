/**
 * Main Application Component
 * 
 * This is your app's entry point. Modify this file to build your own
 * application UI. The example below shows a simple file browser, but you
 * can replace it with anything.
 */

import { useEffect, useState, useCallback } from 'react'
import { useApi } from './shell/useApi'
import { useGlobalCallback } from './shell/useNative'
import FileBrowser from './app/FileBrowser'

export default function App() {
  const [now, setNow] = useState('')
  const { get } = useApi()

  const refreshTime = useCallback(async () => {
    try {
      const data = await get('/time')
      setNow(data.now)
    } catch (error) {
      // Silently fail - backend might not be ready yet
      console.warn('Failed to fetch time:', error.message)
    }
  }, [get])

  // Setup polling for time updates
  useEffect(() => {
    refreshTime()
    const id = setInterval(refreshTime, 1000)
    return () => clearInterval(id)
  }, [refreshTime])

  // Register global callback for Python to trigger refresh
  useGlobalCallback('__refreshRoot', useCallback(() => {
    window.location.reload()
  }, []))

  return (
    <div style={{ 
      padding: 16, 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: 1200,
      margin: '0 auto'
    }}>
      <h2 style={{ margin: 0 }}>Doc Matrix</h2>
      <div style={{ marginTop: 6, color: '#666' }}>
        Hello! Current time: <b style={{ color: '#000' }}>{now}</b>
      </div>

      <FileBrowser />
      
      <footer style={{ 
        marginTop: 40, 
        paddingTop: 20, 
        borderTop: '1px solid #eee',
        color: '#999',
        fontSize: 13 
      }}>
        <p>
          This is a template application. Modify <code>frontend/src/App.jsx</code> 
          {' '}and <code>backend/app/</code> to build your own app.
        </p>
      </footer>
    </div>
  )
}
