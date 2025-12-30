/**
 * Citation Indicator Component
 * 
 * Renders citation markers as superscript numbers in circles.
 * Clicking or hovering shows the citation popover.
 */

import { useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CitationPopover from './CitationPopover'

const styles = {
  marker: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '1.25em',
    height: '1.25em',
    margin: '0 2px',
    padding: '0 4px',
    fontSize: '0.7em',
    fontWeight: '600',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-citation)',
    background: 'var(--color-citation-bg)',
    border: '1px solid var(--color-citation-border)',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    verticalAlign: 'super',
    transition: 'all var(--transition-fast)',
    userSelect: 'none',
  },
  markerHover: {
    background: 'var(--color-citation)',
    color: 'var(--color-bg-primary)',
  },
}

export function CitationMarker({ number, citation, onOpenDocument }) {
  const [isHovered, setIsHovered] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const markerRef = useRef(null)
  
  const handleClick = useCallback(() => {
    if (markerRef.current) {
      setAnchorRect(markerRef.current.getBoundingClientRect())
      setShowPopover(true)
    }
  }, [])
  
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])
  
  return (
    <>
      <span
        ref={markerRef}
        style={{
          ...styles.marker,
          ...(isHovered ? styles.markerHover : {}),
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={`Citation from ${citation?.source_file || 'unknown'}`}
      >
        {number}
      </span>
      
      {showPopover && citation && (
        <CitationPopover
          citation={citation}
          anchorRect={anchorRect}
          onClose={() => setShowPopover(false)}
          onOpenDocument={onOpenDocument}
        />
      )}
    </>
  )
}

/**
 * Parses text with citation markers and renders them as interactive indicators.
 * 
 * Supports two formats:
 * 1. Backend format: [1], [2], etc. with separate citations array
 * 2. Legacy format: [[cite:"text"]] or [[cite:filename:"text"]]
 */
export function CitedText({ text, citations = [], onOpenDocument }) {
  if (!text) return null
  
  const parts = []
  
  // Check if we have citations array from backend (new format)
  if (citations && citations.length > 0) {
    // Backend sends answer text with [1], [2], etc. and separate citations array
    // Pattern to match [1], [2], [3], etc.
    const numberPattern = /\[(\d+)\]/g
    
    let lastIndex = 0
    let match
    
    while ((match = numberPattern.exec(text)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        })
      }
      
      // Get citation number (1-indexed)
      const citationNum = parseInt(match[1], 10)
      const citation = citations[citationNum - 1]  // Convert to 0-indexed
      
      if (citation) {
        parts.push({
          type: 'citation',
          number: citationNum,
          citation: citation,
        })
      } else {
        // Citation not found in array, render as text
        parts.push({
          type: 'text',
          content: match[0],
        })
      }
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
      })
    }
  } else {
    // Legacy format: Parse [[cite:"text"]] or [[cite:filename:"text"]]
    const citationPattern = /\[\[cite:(?:([^:\]]+):)?["']([\s\S]*?)["']\]\]/g
    
    let lastIndex = 0
    let match
    let citationCounter = 1
    
    while ((match = citationPattern.exec(text)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        })
      }
      
      // Extract parts from the match
      const filename = match[1] ? match[1].trim() : null
      const quotedText = match[2] ? match[2].trim() : ""
      
      parts.push({
        type: 'citation',
        number: citationCounter++,
        citation: {
          source_file: filename || "Source Document",
          text: quotedText,
          page: null
        },
      })
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
      })
    }
  }
  
  // If no citations found at all, render as plain text
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: text,
    })
  }
  
  const markdownComponents = {
    p: ({ children }) => <span style={{ display: 'inline' }}>{children}</span>,
    span: ({ children }) => <span style={{ display: 'inline' }}>{children}</span>,
  }
  
  return (
    <span>
      {parts.map((part, idx) => {
        if (part.type === 'text') {
          return (
            <ReactMarkdown 
              key={idx}
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {part.content}
            </ReactMarkdown>
          )
        }
        return (
          <CitationMarker
            key={idx}
            number={part.number}
            citation={part.citation}
            onOpenDocument={onOpenDocument}
          />
        )
      })}
    </span>
  )
}

export default CitationMarker

