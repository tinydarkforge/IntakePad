"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { copyToClipboard, formatTimeAgo } from "@/lib/markdown"
import { saveDraft, loadDraft, removeDraft } from "@/lib/storage"
import { createIssue } from "@/lib/github"
import { loadSettings, AI_DEFAULTS } from "@/lib/settings"
import { getAiKey } from "@/lib/auth"
import { enhance, getAiConfig, isAiReady } from "@/lib/ai"
import { useNow } from "@/lib/useNow"
import { AiReviewBar } from "./AiReviewBar"
import { MarkdownPreview } from "./MarkdownPreview"
import type { Template } from "@/lib/templates"

interface IssueEditorProps {
  template: Template | null
  repo: string
  authed: boolean
  copyOnly?: boolean
}

type AiState = "off" | "setup" | "ready"

interface Review {
  missingInfo: string[]
  changeSummary: string[]
}

export function IssueEditor({ template, repo, authed, copyOnly = false }: IssueEditorProps) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ number: number; url: string } | null>(null)
  const [view, setView] = useState<"edit" | "preview">("edit")
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [aiState, setAiState] = useState<AiState>("off")
  const snapshot = useRef<{ title: string; body: string } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const now = useNow()

  const currentKey = `${repo}:${template?.id ?? "blank"}`

  const refreshAiState = useCallback(() => {
    const s = loadSettings()
    if (!s.aiEnabled) setAiState("off")
    else if (isAiReady(s, getAiKey())) setAiState("ready")
    else setAiState("setup")
  }, [])

  useEffect(() => {
    refreshAiState()
    window.addEventListener("focus", refreshAiState)
    return () => window.removeEventListener("focus", refreshAiState)
  }, [refreshAiState])

  useEffect(() => {
    const draft = loadDraft(repo, template?.id ?? null)
    if (draft) {
      setTitle(draft.title)
      setBody(draft.body)
      setLastSaved(draft.updatedAt)
    } else {
      setTitle("")
      setBody(template?.body ?? "")
      setLastSaved(null)
    }
    setCreated(null)
    setError(null)
    setReview(null)
    setEnhanceError(null)
    snapshot.current = null
    setView("edit")
  }, [currentKey, template?.body, repo, template?.id])

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

  const handleCopy = useCallback(async () => {
    const content = buildContent(title, body)
    if (!content) return
    const ok = await copyToClipboard(content)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [title, body])

  const canCreate = !!title && authed && !creating && !copyOnly

  const handleCreate = useCallback(async () => {
    if (!title || !authed || creating || copyOnly) return
    setError(null)
    setCreating(true)
    const parts = repo.split("/")
    try {
      const result = await createIssue(parts[0], parts[1], title, body, template?.labels ?? [])
      setCreated({ number: result.number, url: result.html_url })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create issue")
    } finally {
      setCreating(false)
    }
  }, [title, body, authed, creating, copyOnly, repo, template?.labels])

  const handleEnhance = useCallback(async () => {
    if (enhancing || !body.trim()) return
    const s = loadSettings()
    const key = getAiKey()
    if (!isAiReady(s, key)) {
      setAiState(s.aiEnabled ? "setup" : "off")
      return
    }
    setEnhanceError(null)
    setEnhancing(true)
    const snap = { title, body }
    try {
      const cfg = getAiConfig(s, key, AI_DEFAULTS)
      const result = await enhance({ template, title, body, repo }, cfg)
      snapshot.current = snap
      setTitle(result.title)
      setBody(result.body)
      setReview({ missingInfo: result.missingInfo, changeSummary: result.changeSummary })
    } catch (e) {
      setEnhanceError(e instanceof Error ? e.message : "AI enhancement failed.")
    } finally {
      setEnhancing(false)
    }
  }, [enhancing, title, body, template, repo])

  const handleUndo = useCallback(() => {
    if (!snapshot.current) return
    setTitle(snapshot.current.title)
    setBody(snapshot.current.body)
    snapshot.current = null
    setReview(null)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === "enter") {
        e.preventDefault()
        handleCreate()
      } else if (k === "s") {
        e.preventDefault()
        handleSave()
      } else if (k === "e" && !e.shiftKey) {
        e.preventDefault()
        if (aiState === "ready") handleEnhance()
      } else if (k === "c" && e.shiftKey) {
        e.preventDefault()
        handleCopy()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleCreate, handleSave, handleEnhance, handleCopy, aiState])

  if (created) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--c-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text">Issue created</p>
          <a
            href={created.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-1 text-sm text-accent hover:underline"
          >
            #{created.number} &middot; Open in GitHub &rarr;
          </a>
          <div>
            <button
              onClick={() => {
                removeDraft(repo, template?.id ?? null)
                setCreated(null)
                setTitle("")
                setBody("")
                setReview(null)
                snapshot.current = null
              }}
              className="mt-5 text-xs text-text-muted hover:text-text transition-colors"
            >
              Create another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col gap-3 px-6 pt-5 pb-3 overflow-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            {copyOnly
              ? "Copy-only mode — write or paste, then copy the Markdown."
              : template
                ? `Template: ${template.name}`
                : "Blank issue"}
          </p>
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-panel">
            <ViewTab active={view === "edit"} onClick={() => setView("edit")}>Edit</ViewTab>
            <ViewTab active={view === "preview"} onClick={() => setView("preview")}>Preview</ViewTab>
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short issue title"
          disabled={enhancing}
          className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-text-muted py-1 disabled:opacity-60"
          aria-label="Issue title"
        />

        {review && (
          <AiReviewBar
            missingInfo={review.missingInfo}
            changeSummary={review.changeSummary}
            onUndo={handleUndo}
            onEnhanceAgain={handleEnhance}
            busy={enhancing}
          />
        )}

        {view === "edit" ? (
          <div className="relative flex-1 flex">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste notes, bug reports, Slack threads, customer feedback, logs, or rough ideas."
              disabled={enhancing}
              className="flex-1 w-full bg-transparent border-none outline-none resize-none placeholder:text-text-muted leading-relaxed text-sm disabled:opacity-60"
              aria-label="Issue body"
            />
            {enhancing && (
              <div className="absolute inset-0 flex items-center justify-center bg-panel/60 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Spinner />
                  Improving issue draft…
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <MarkdownPreview content={buildContent(title, body)} />
          </div>
        )}

        {enhanceError && (
          <div className="text-xs text-danger-fg bg-danger-bg px-3 py-2 rounded-md border border-danger-border flex items-center justify-between gap-3">
            <span>AI enhancement failed. Your draft is unchanged. {enhanceError}</span>
            <button onClick={handleEnhance} className="underline shrink-0 hover:opacity-80">Try again</button>
          </div>
        )}

        {error && (
          <div className="text-xs text-danger-fg bg-danger-bg px-3 py-2 rounded-md border border-danger-border">
            {error}
            {!copyOnly && (
              <button onClick={handleCopy} className="underline ml-2 hover:opacity-80">Copy Markdown instead</button>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border px-6 py-3 flex items-center justify-between gap-3">
        <div className="text-xs text-text-muted">
          {lastSaved ? `Saved ${formatTimeAgo(now - lastSaved)}` : "Not saved yet"}
        </div>

        <div className="flex items-center gap-2">
          {aiState === "ready" && (
            <button
              onClick={handleEnhance}
              disabled={enhancing || !body.trim()}
              className="px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-surface-hover transition-colors disabled:opacity-40 flex items-center gap-1.5"
              title="Enhance (⌘E)"
            >
              <SparkIcon />
              {enhancing ? "Enhancing…" : "Enhance"}
            </button>
          )}
          {aiState === "setup" && (
            <Link
              href="/settings"
              className="px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-surface-hover transition-colors"
            >
              Set up AI
            </Link>
          )}

          <button
            onClick={handleCopy}
            disabled={!title && !body}
            className="px-3 py-1.5 text-sm text-text-secondary border border-border rounded-md hover:bg-surface-hover transition-colors disabled:opacity-40"
            title="Copy Markdown (⌘⇧C)"
          >
            {copied ? "Copied!" : "Copy Markdown"}
          </button>

          {!copyOnly && (
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="px-4 py-1.5 text-sm text-accent-fg bg-accent rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 font-medium"
              title="Create issue (⌘↵)"
            >
              {creating ? "Creating…" : "Create issue"}
            </button>
          )}
          {!copyOnly && !authed && title && (
            <p className="text-xs text-text-muted">Add a token in Settings to create</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ViewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded transition-colors ${
        active ? "bg-surface-hover text-text font-medium" : "text-text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="spin text-accent" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
    </svg>
  )
}

function buildContent(title: string, body: string): string {
  if (title && body) return `## ${title}\n\n${body}`
  if (title) return title
  return body
}
