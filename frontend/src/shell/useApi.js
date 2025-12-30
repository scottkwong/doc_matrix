/**
 * API hooks for communicating with the Flask backend.
 * 
 * This is part of the framework layer. These hooks provide a clean
 * interface for making API calls to your backend.
 */

import { useCallback } from 'react'

/**
 * Custom hook for making API calls to the backend.
 * 
 * @returns {object} API call utilities
 */
export function useApi() {
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const url = `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    const method = options.method || 'GET'
    const startTime = performance.now()
    
    console.log(`📤 API Request: ${method} ${url}`)
    
    try {
      const response = await fetch(url, options)
      const elapsed = performance.now() - startTime
      
      if (!response.ok) {
        console.error(
          `📥 API Error: ${response.status} ${response.statusText} (${elapsed.toFixed(0)}ms)`,
          url
        )
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`📥 API Response: ${url} (${elapsed.toFixed(0)}ms)`)
      
      return data
    } catch (error) {
      const elapsed = performance.now() - startTime
      console.error(`💥 API Failed: ${url} (${elapsed.toFixed(0)}ms)`, error)
      throw error
    }
  }, [])

  const get = useCallback(async (endpoint, params = {}) => {
    const query = new URLSearchParams(params).toString()
    const url = query ? `${endpoint}?${query}` : endpoint
    return apiCall(url)
  }, [apiCall])

  const post = useCallback(async (endpoint, data = {}) => {
    return apiCall(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  }, [apiCall])

  return { get, post, apiCall }
}

import { useEffect } from 'react'

/**
 * Hook for periodic API polling.
 * 
 * @param {Function} callback - Function to call on each interval
 * @param {number} interval - Milliseconds between calls
 */
export function useApiPolling(callback, interval = 1000) {
  useEffect(() => {
    if (!callback || !interval) return

    callback()
    const id = setInterval(callback, interval)
    return () => clearInterval(id)
  }, [callback, interval])
}

