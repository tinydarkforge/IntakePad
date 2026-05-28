"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { copyToClipboard, formatTimeAgo } from "@/lib/markdown"
import { saveDraft, loadDraft, getDraftAge } from "@/lib/storage"
import type { Template } from "@/lib/templates"

interface IssueEditorProps {
  template: Template | null
  repo: string
}

export function IssueEditor({ template, repo }: IssueEditorProps) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentKey = `${repo}:${template?.id ?? "blank"}`

  useEffect(() => {
    const draft = loadDraft(repo, template?.id ?? null)
    const age = getDraftAge(repo, template?.id ?? null)
    if (draft) {
      setTitle(draft.title)
      setBody(draft.body)
      setLastSaved(draft.updatedAt)
    } else {
      setTitle(template?.body ? "" : "")
      setBody(template?.body ?? "")
      setLastSaved(null)
    }
  }, [currentKey])

  const handleSave = useCallback(() => {
    saveDraft(repo, template?.id ?? null, title, body)
    setLastSaved(Date.now())
  }, [repo, template?.id, title, body])

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(handleSave, 800)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [title, body, handleSave])

  const handleCopy = async () => {
    const content = template
      ? `## ${title}\n\n${body}`
      : title
        ? `## ${title}\n\n${body}`
        : body
    const ok = await copyToClipboard(content)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCreate = () => {
    const content = template
      ? `## ${title}\n\n${body}`
      : title
        ? `## ${title}\n\n${body}`
        : body
    if (repo) {
      const url = `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(content)}`
      window.open(url, "_blank")
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col gap-4 p-6 overflow-auto">
        {!template ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-sm text-text-secondary">Choose a template</p>
              <p className="text-xs text-text-muted mt-1">or start with a blank issue.</p>
            </div>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short issue title"
              className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-text-muted py-1"
              aria-label="Issue title"
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste notes, bug reports, Slack threads, customer feedback, logs, or rough ideas."
              className="flex-1 w-full bg-transparent border-none outline-none resize-none placeholder:text-text-muted leading-relaxed text-sm"
              aria-label="Issue body"
            />
          </>
        )}
      </div>

      <div className="border-t border-border px-6 py-3 flex items-center justify-between">
        <div className="text-xs text-text-muted">
          {lastSaved ? `Saved ${formatTimeAgo(Date.now() - lastSaved)} ago` : "Not saved yet"}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!title && !body}
            className="px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-surface-hover transition-colors disabled:opacity-40"
          >
            {copied ? "Copied!" : "Copy Markdown"}
          </button>
          <button
            onClick={handleCreate}
            disabled={!title && !body}
            className="px-4 py-1.5 text-sm text-white bg-accent rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 font-medium"
          >
            Create issue
          </button>
        </div>
      </div>
    </div>
  )
}
