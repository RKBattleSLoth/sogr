import React from 'react'
import ReactMarkdown from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        components={{
          // Customize paragraph rendering to avoid extra margins
          p: ({ children }) => (
            <p className="text-sm text-foreground/80 leading-relaxed mb-2 last:mb-0">
              {children}
            </p>
          ),
          // Customize strong/bold rendering
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          // Customize emphasis/italic rendering
          em: ({ children }) => (
            <em className="italic text-foreground/90">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}