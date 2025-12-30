/**
 * Markdown Viewer Component
 * 
 * Renders markdown files with citation highlighting.
 * Automatically scrolls to cited text location.
 */

import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
    padding: 'var(--space-6)',
  },
  markdown: {
    color: 'var(--color-text-primary)',
    fontSize: 'var(--text-base)',
    lineHeight: '1.7',
    maxWidth: '800px',
  },
}

const markdownStyles = `
  .markdown-content h1 {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin-top: var(--space-6);
    margin-bottom: var(--space-4);
    color: var(--color-text-primary);
  }
  
  .markdown-content h2 {
    font-size: var(--text-xl);
    font-weight: 600;
    margin-top: var(--space-5);
    margin-bottom: var(--space-3);
    color: var(--color-text-primary);
  }
  
  .markdown-content h3 {
    font-size: var(--text-lg);
    font-weight: 600;
    margin-top: var(--space-4);
    margin-bottom: var(--space-2);
    color: var(--color-text-primary);
  }
  
  .markdown-content p {
    margin-bottom: var(--space-4);
  }
  
  .markdown-content ul, .markdown-content ol {
    margin-bottom: var(--space-4);
    padding-left: var(--space-6);
  }
  
  .markdown-content li {
    margin-bottom: var(--space-2);
  }
  
  .markdown-content code {
    background: var(--color-bg-tertiary);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.9em;
  }
  
  .markdown-content pre {
    background: var(--color-bg-tertiary);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin-bottom: var(--space-4);
  }
  
  .markdown-content pre code {
    background: none;
    padding: 0;
  }
  
  .markdown-content blockquote {
    border-left: 4px solid var(--color-accent);
    padding-left: var(--space-4);
    margin: var(--space-4) 0;
    color: var(--color-text-secondary);
  }
  
  .markdown-content a {
    color: var(--color-accent);
    text-decoration: underline;
  }
  
  .markdown-content table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: var(--space-4);
  }
  
  .markdown-content th,
  .markdown-content td {
    border: 1px solid var(--color-surface-border);
    padding: var(--space-2) var(--space-3);
    text-align: left;
  }
  
  .markdown-content th {
    background: var(--color-bg-secondary);
    font-weight: 600;
  }
  
  .markdown-content img {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-md);
    margin: var(--space-4) 0;
  }
  
  .markdown-content hr {
    border: none;
    border-top: 1px solid var(--color-surface-border);
    margin: var(--space-6) 0;
  }
  
  .highlighted-text {
    background: var(--color-citation-bg);
    padding: 0 var(--space-1);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-citation);
  }
`

export default function MarkdownViewer({ content, citation }) {
  const contentRef = useRef(null)
  const highlightedRef = useRef(null)
  
  // Extract the cited text for highlighting
  const citedText = citation?.text || ''
  
  // Process content to highlight citation
  const processedContent = content || ''
  
  // Auto-scroll to highlighted text
  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [citation])
  
  // TODO: Implement text highlighting in rendered markdown
  // This is complex because we need to highlight in the rendered HTML
  // For now, just show the citation banner
  
  return (
    <div style={styles.container}>
      <style>{markdownStyles}</style>
      
      {/* Citation info banner */}
      {citation && (
        <div style={styles.citationBanner}>
          📍 Citation: "{citedText.substring(0, 60)}..."
        </div>
      )}
      
      {/* Markdown content */}
      <div style={styles.content} ref={contentRef}>
        <div className="markdown-content" style={styles.markdown}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {processedContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

