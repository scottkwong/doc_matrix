/**
 * Text Viewer Component
 * 
 * Displays text-based files (TXT, CSV, JSON, code) with line numbers
 * and citation highlighting. Automatically scrolls to cited text location.
 */

import { useEffect, useRef } from 'react'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--color-bg-primary)',
  },
  citationBanner: {
    padding: 'var(--space-3)',
    background: 'var(--color-accent-subtle)',
    borderBottom: '1px solid var(--color-accent)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--space-4)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-sm)',
    lineHeight: '1.6',
  },
  lineNumbers: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  numbers: {
    color: 'var(--color-text-muted)',
    textAlign: 'right',
    userSelect: 'none',
    minWidth: '40px',
    paddingRight: 'var(--space-2)',
    borderRight: '1px solid var(--color-surface-border)',
  },
  lines: {
    flex: 1,
    color: 'var(--color-text-primary)',
  },
  line: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  highlightedLine: {
    background: 'var(--color-citation-bg)',
    padding: '0 var(--space-1)',
    borderRadius: 'var(--radius-sm)',
  },
}

export default function TextViewer({ content, fileType, citation }) {
  const contentRef = useRef(null)
  const highlightedLineRef = useRef(null)
  
  // Split content into lines
  const lines = (content || '').split('\n')
  
  // Calculate which lines to highlight based on citation
  const highlightStart = citation?.char_start || -1
  const highlightEnd = citation?.char_end || -1
  
  const getHighlightedLines = () => {
    if (highlightStart < 0 || highlightEnd < 0) return new Set()
    
    let charCount = 0
    const highlightedLines = new Set()
    
    for (let i = 0; i < lines.length; i++) {
      const lineStart = charCount
      const lineEnd = charCount + lines[i].length + 1 // +1 for newline
      
      // Check if this line contains any part of the citation
      if (lineStart < highlightEnd && lineEnd > highlightStart) {
        highlightedLines.add(i)
      }
      
      charCount = lineEnd
    }
    
    return highlightedLines
  }
  
  const highlightedLines = getHighlightedLines()
  
  // Auto-scroll to highlighted line
  useEffect(() => {
    if (highlightedLineRef.current) {
      highlightedLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [citation])
  
  // Get page/line info for citation
  const getCitationInfo = () => {
    if (!citation || highlightedLines.size === 0) return null
    
    const firstHighlightedLine = Math.min(...highlightedLines)
    return `Line ${firstHighlightedLine + 1}`
  }
  
  const citationInfo = getCitationInfo()
  
  return (
    <div style={styles.container}>
      {/* Citation info banner */}
      {citation && citationInfo && (
        <div style={styles.citationBanner}>
          📍 Citation at {citationInfo}
        </div>
      )}
      
      {/* Text content with line numbers */}
      <div style={styles.content} ref={contentRef}>
        <div style={styles.lineNumbers}>
          {/* Line numbers */}
          <div style={styles.numbers}>
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          
          {/* Lines */}
          <div style={styles.lines}>
            {lines.map((line, i) => {
              const isHighlighted = highlightedLines.has(i)
              const isFirstHighlighted = highlightedLines.size > 0 && 
                                        i === Math.min(...highlightedLines)
              
              return (
                <div
                  key={i}
                  style={{
                    ...styles.line,
                    ...(isHighlighted ? styles.highlightedLine : {}),
                  }}
                  ref={isFirstHighlighted ? highlightedLineRef : null}
                >
                  {line || ' '}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

