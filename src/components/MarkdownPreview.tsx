"use client"

import { useMemo } from "react"
import { marked } from "marked"
import DOMPurify from "dompurify"

interface MarkdownPreviewProps {
  content: string
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    if (!content.trim()) return ""
    const raw = marked.parse(content, { async: false, gfm: true, breaks: true }) as string
    return DOMPurify.sanitize(raw)
  }, [content])

  if (!html) {
    return <p className="text-sm text-text-muted">Nothing to preview yet.</p>
  }

  return <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
}
