"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { copyToClipboard, formatTimeAgo } from "@/lib/markdown"
import { saveDraft, loadDraft, removeDraft } from "@/lib/storage"
import { createIssue } from "@/lib/github"
import { loadSettings } from "@/lib/settings"
import { getProviderKey, getToken } from "@/lib/auth"
import { enhanceWithQueue } from "@/lib/ai"
import { uploadImage } from "@/lib/uploads"
import type { QueueProvider } from "@/lib/ai"
import { useNow } from "@/lib/useNow"
import { AiReviewBar } from "./AiReviewBar"
import { MarkdownPreview } from "./MarkdownPreview"
import type { Template } from "@/lib/templates"

const TITLE_MAX = 200
const BODY_MAX = 50000

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
  providerName: string
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
  const [uploadingImages, setUploadingImages] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const snapshot = useRef<{ title: string; body: string } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const now = useNow()

  const currentKey = `${repo}:${template?.id ?? "blank"}`

  const refreshAiState = useCallback(() => {
    const s = loadSettings()
    const enabled = s.aiProviders.some((p) => p.enabled)
    if (!enabled) setAiState("off")
    else {
      const anyReady = s.aiProviders.some((p) => {
        if (!p.enabled || !p.model.trim()) return false
        if (p.shape === "anthropic") return !!getProviderKey(p.id)
        return true
      })
      setAiState(anyReady ? "ready" : "setup")
    }
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

    if (body.length > BODY_MAX) {
      setError(`Body exceeds ${BODY_MAX.toLocaleString()} characters (${body.length.toLocaleString()}). Trim before creating.`)
      return
    }

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

    const enabledProviders = s.aiProviders.filter((p) => p.enabled)
    if (enabledProviders.length === 0) {
      refreshAiState()
      return
    }

    const providersWithKeys: QueueProvider[] = enabledProviders.map((p) => ({
      id: p.id,
      name: p.name,
      shape: p.shape,
      baseUrl: p.baseUrl,
      model: p.model,
      apiKey: getProviderKey(p.id) ?? "",
    }))

    setEnhanceError(null)
    setEnhancing(true)
    const snap = { title, body }
    try {
      const result = await enhanceWithQueue({ template, title, body, repo }, providersWithKeys)
      snapshot.current = snap
      setTitle(result.result.title)
      setBody(result.result.body)
      setReview({
        missingInfo: result.result.missingInfo,
        changeSummary: result.result.changeSummary,
        providerName: result.providerName,
      })
    } catch (e) {
      setEnhanceError(e instanceof Error ? e.message : "AI enhancement failed.")
    } finally {
      setEnhancing(false)
    }
  }, [enhancing, title, body, template, repo, refreshAiState])

  const handleUndo = useCallback(() => {
    if (!snapshot.current) return
    setTitle(snapshot.current.title)
    setBody(snapshot.current.body)
    snapshot.current = null
    setReview(null)
  }, [])

  const handleImagePaste = useCallback(async (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"))
    if (files.length === 0) return

    e.preventDefault()

    if (!repo) {
      setError("Set a repository in Settings to paste images.")
      return
    }
    const token = getToken()
    if (!token) {
      setError("Add a GitHub token in Settings to upload images.")
      return
    }

    setUploadingImages(true)
    setError(null)
    const parts = repo.split("/")
    const markdowns: string[] = []
    const errs: string[] = []

    for (const file of files) {
      try {
        const result = await uploadImage(parts[0], parts[1], file, token)
        markdowns.push(`\n![${result.filename}](${result.url})`)
      } catch (e) {
        errs.push(e instanceof Error ? e.message : "Failed to upload image")
      }
    }

    if (markdowns.length > 0) {
      const insert = markdowns.join("")
      const ta = textareaRef.current
      let next: string
      if (ta) {
        const start = ta.selectionStart
        const end = ta.selectionEnd
        next = body.slice(0, start) + insert + body.slice(end)
      } else {
        next = body + insert
      }
      if (next.length > BODY_MAX) {
        errs.push(`Result would exceed ${BODY_MAX.toLocaleString()} character limit`)
      } else {
        setBody(next)
        if (ta) {
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = (ta?.selectionStart ?? 0) + insert.length
            ta.focus()
          })
        }
      }
    }

    if (errs.length > 0 && markdowns.length === 0) {
      setError(errs.join(". "))
    }

    setUploadingImages(false)
  }, [repo, body])

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
      <div className="flex-1 flex flex-col gap-6 px-10 pt-8 pb-4 overflow-auto">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
            {copyOnly
              ? "Drafting: Copy-only mode"
              : template
                ? <><span>Drafting: {template.name}</span><button onClick={() => setBody(template?.body ?? "")} className="underline hover:text-text transition-colors" aria-label="Restore original template body">Reset</button><button onClick={() => setBody("")} className="underline hover:text-text transition-colors ml-2" aria-label="Clear body">Clear</button></>
                : "Drafting: Blank issue"}
          </p>
          <div className="flex items-center gap-0.5 rounded-md border border-border p-1 bg-bg shadow-sm">
            <ViewTab active={view === "edit"} onClick={() => setView("edit")}>Edit</ViewTab>
            <ViewTab active={view === "preview"} onClick={() => setView("preview")}>Preview</ViewTab>
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue title"
          disabled={enhancing}
          maxLength={TITLE_MAX}
          className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-border py-1 disabled:opacity-60"
          aria-label="Issue title"
        />

        {review && (
          <AiReviewBar
            missingInfo={review.missingInfo}
            changeSummary={review.changeSummary}
            providerName={review.providerName}
            onUndo={handleUndo}
            onEnhanceAgain={handleEnhance}
            busy={enhancing}
          />
        )}

        {view === "edit" ? (
          <div className="relative flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onPaste={handleImagePaste}
              placeholder="Paste notes, bug reports, logs, or rough ideas. Screenshots also work."
              disabled={enhancing}
              maxLength={BODY_MAX}
              className="flex-1 w-full bg-transparent border-none outline-none resize-none placeholder:text-text-muted leading-relaxed text-base disabled:opacity-60"
              aria-label="Issue body"
            />
            <div className={`text-right text-[10px] font-medium pt-2 ${body.length > BODY_MAX * 0.95 ? "text-danger-fg" : "text-text-muted"}`}>
              {body.length.toLocaleString()} / {BODY_MAX.toLocaleString()}
            </div>
            {enhancing && (
              <div className="absolute inset-0 flex items-center justify-center bg-panel/60 backdrop-blur-[1px] rounded-md">
                <div className="flex flex-col items-center gap-3 text-sm font-medium text-text-secondary">
                  <Spinner />
                  Improving issue draft…
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-bg/50 rounded-lg border border-border/50 p-6">
            <MarkdownPreview content={buildContent(title, body)} />
          </div>
        )}

        {uploadingImages && (
          <div className="text-xs font-medium text-text-secondary bg-surface-hover px-4 py-3 rounded-md border border-border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
            <Spinner />
            <span>Uploading images to repository…</span>
          </div>
        )}

        {enhanceError && (
          <div className="text-xs font-medium text-danger-fg bg-danger-bg px-4 py-3 rounded-md border border-danger-border flex items-center justify-between gap-3 animate-in shake">
            <span>AI enhancement failed. {enhanceError}</span>
            <button onClick={handleEnhance} className="font-bold underline shrink-0 hover:opacity-80">Retry</button>
          </div>
        )}

        {error && (
          <div className="text-xs font-medium text-danger-fg bg-danger-bg px-4 py-3 rounded-md border border-danger-border">
            {error}
            {!copyOnly && (
              <button onClick={handleCopy} className="font-bold underline ml-2 hover:opacity-80">Copy Markdown instead</button>
            )}
          </div>
        )}
      </div>

      <div className="h-16 border-t border-border px-10 py-3 flex items-center justify-between gap-3 bg-panel/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {lastSaved ? `Auto-saved ${formatTimeAgo(now - lastSaved)}` : "Not saved"}
          </div>
          {(title || body) && (
            <button
              onClick={() => {
                removeDraft(repo, template?.id ?? null)
                setTitle("")
                setBody("")
                setReview(null)
                setError(null)
                setEnhanceError(null)
                setCopied(false)
                snapshot.current = null
                setLastSaved(null)
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-danger transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {aiState === "ready" && (
            <button
              onClick={handleEnhance}
              disabled={enhancing || !body.trim()}
              className="px-4 py-2 text-xs font-bold text-text-secondary border border-border rounded-md hover:bg-surface-hover transition-all disabled:opacity-40 flex items-center gap-2 shadow-sm"
              title="Enhance (⌘E)"
            >
              <SparkIcon />
              {enhancing ? "Enhancing…" : "Enhance"}
            </button>
          )}
          {aiState === "setup" && (
            <Link
              href="/settings"
              className="px-4 py-2 text-xs font-bold text-text-secondary border border-border rounded-md hover:bg-surface-hover transition-all shadow-sm"
            >
              Set up AI
            </Link>
          )}

          <button
            onClick={handleCopy}
            disabled={!title && !body}
            className="px-4 py-2 text-xs font-bold text-text-secondary border border-border rounded-md hover:bg-surface-hover transition-all disabled:opacity-40 shadow-sm"
            title="Copy Markdown (⌘⇧C)"
          >
            {copied ? "Copied!" : "Copy Markdown"}
          </button>

          {!copyOnly && (
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="px-6 py-2 text-xs font-bold text-accent-fg bg-accent rounded-md hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-accent/10"
              title="Create issue (⌘↵)"
            >
              {creating ? "Creating…" : "Create Issue"}
            </button>
          )}
          {!copyOnly && !authed && title && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Add a token in Settings to create</p>
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
      className={`text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-md transition-all ${
        active ? "bg-panel text-text shadow-sm ring-1 ring-border/50" : "text-text-muted hover:text-text"
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
