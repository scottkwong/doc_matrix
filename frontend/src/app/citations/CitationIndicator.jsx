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
 * Parses text with citation markers [[cite:"text"]] or [[cite:filename:"text"]] 
 * and renders them as interactive citation indicators.
 */
export function CitedText({ text, citations = [], onOpenDocument }) {
  if (!text) return null
  
  // Pattern to match [[cite:"text"]] or [[cite:filename:"text"]]
  // Matches [[cite: followed by optional filename + :, then quoted text, then ]]
  const citationPattern = /\[\[cite:(?:([^:\]]+):)?["']([\s\S]*?)["']\]\]/g
  
  const parts = []
  let lastIndex = 0
  let match
  let citationCounter = 1
  
  // Create a copy of text to work with
  const workingText = text
  
  while ((match = citationPattern.exec(workingText)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: workingText.slice(lastIndex, match.index),
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
  if (lastIndex < workingText.length) {
    parts.push({
      type: 'text',
      content: workingText.slice(lastIndex),
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

