/**
 * Native integration hooks for pywebview functionality.
 * 
 * This module provides React hooks for interacting with native OS
 * features through the pywebview bridge. Part of the framework layer.
 */

import { useCallback, useMemo, useEffect } from 'react'

/**
 * Check if running in pywebview (native app) vs browser.
 * 
 * @returns {boolean} True if running in native app
 */
export function isPyWebview() {
  return typeof window !== 'undefined' && 
         window.pywebview && 
         window.pywebview.api
}

/**
 * Hook for accessing native pywebview APIs.
 * 
 * @returns {object} Native API methods or fallbacks
 */
export function useNative() {
  const isNative = useMemo(() => isPyWebview(), [])

  const chooseFolder = useCallback(async (startDir = '') => {
    if (isNative) {
      return await window.pywebview.api.choose_folder(startDir)
    }
    // Browser fallback
    return { cancelled: true, error: 'Not available in browser' }
  }, [isNative])

  const revealInFileManager = useCallback(async (path) => {
    if (isNative) {
      return await window.pywebview.api.reveal_in_file_manager(path)
    }
    return { ok: false, error: 'Not available in browser' }
  }, [isNative])

  return {
    isNative,
    chooseFolder,
    revealInFileManager,
  }
}

/**
 * Hook for registering global callbacks accessible from Python.
 * 
 * @param {string} name - Global function name
 * @param {Function} callback - Function to call
 */
export function useGlobalCallback(name, callback) {
  useEffect(() => {
    if (!name || !callback) return
    
    window[name] = callback
    return () => {
      delete window[name]
    }
  }, [name, callback])
}

