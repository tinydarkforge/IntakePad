"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { TemplateList } from "./TemplateList"
import { IssueEditor } from "./IssueEditor"
import { AuthButton } from "./AuthButton"
import { ThemeToggle } from "./ThemeToggle"
import { loadTemplates } from "@/lib/github"
import { loadSettings, saveSettings, loadRecentRepos, addRecentRepo } from "@/lib/settings"
import { isAuthenticated } from "@/lib/auth"
import type { Template } from "@/lib/templates"

interface LoadingState {
  type: "loading" | "error" | "ready" | "empty"
  message?: string
}

export function AppShell() {
  const [repo, setRepo] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [loadingState, setLoadingState] = useState<LoadingState>({ type: "ready" })
  const [editRepo, setEditRepo] = useState(false)
  const [repoInput, setRepoInput] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [forceEditor, setForceEditor] = useState(false)
  const [copyOnly, setCopyOnly] = useState(false)
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const [recents, setRecents] = useState<string[]>([])

  useEffect(() => {
    const refresh = () => {
      setRecents(loadRecentRepos())
      setAuthed(isAuthenticated())
    }
    refresh()
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [])

  const handleLoadRepo = useCallback(async (ownerRepo: string) => {
    const parts = ownerRepo.split("/")
    if (parts.length !== 2 || !parts[0] || !parts[1]) return

    setCopyOnly(false)
    setForceEditor(false)
    setRepo(ownerRepo)
    setLoadingState({ type: "loading" })
    setSelectedTemplate(null)

    try {
      const result = await loadTemplates(parts[0], parts[1])
      setTemplates(result)
      setLoadedAt(Date.now())
      addRecentRepo(ownerRepo)
      setRecents(loadRecentRepos())
      if (result.length === 0) {
        setLoadingState({ type: "empty", message: "No issue templates found in this repository." })
      } else {
        setLoadingState({ type: "ready" })
      }
    } catch (e) {
      setLoadingState({
        type: "error",
        message: e instanceof Error ? e.message : "Failed to load templates",
      })
      setTemplates([])
    }
  }, [])

  // On mount (incl. returning from Settings), reload templates for the saved repo.
  useEffect(() => {
    const saved = loadSettings().repo
    if (saved) {
      setRepoInput(saved)
      handleLoadRepo(saved)
    }
  }, [handleLoadRepo])

  const handleRepoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = repoInput.trim()
    if (!trimmed) return
    const current = loadSettings()
    saveSettings({ ...current, repo: trimmed })
    handleLoadRepo(trimmed)
    setEditRepo(false)
  }

  const pickRecent = (r: string) => {
    setRepoInput(r)
    const current = loadSettings()
    saveSettings({ ...current, repo: r })
    handleLoadRepo(r)
    setEditRepo(false)
  }

  const handleSelect = useCallback((t: Template) => {
    setSelectedTemplate(t)
    setForceEditor(true)
  }, [])

  const handleSelectBlank = useCallback(() => {
    setSelectedTemplate(null)
    setForceEditor(true)
  }, [])

  const handleAuthChange = () => setAuthed(isAuthenticated())

  const hasRepo = repo.length > 0
  const showEditor = copyOnly || (hasRepo && (forceEditor || loadingState.type === "ready"))

  return (
    <div className="h-screen flex flex-col bg-bg">
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-panel shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text">IntakePad</span>

          {copyOnly ? (
            <span className="text-xs text-text-muted px-2 py-1 rounded-md bg-surface-hover">Copy-only mode</span>
          ) : editRepo ? (
            <form onSubmit={handleRepoSubmit} className="flex items-center gap-1 relative">
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                onBlur={() => setTimeout(() => setEditRepo(false), 150)}
                placeholder="owner/repo"
                className="text-xs px-2 py-1 bg-panel border border-border rounded outline-none focus:border-accent w-44"
                aria-label="Repository name"
                autoFocus
              />
              <button type="submit" className="text-xs px-2 py-1 bg-accent text-accent-fg rounded hover:bg-accent-hover">
                Load
              </button>
              {recents.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-panel border border-border rounded-md shadow-md py-1 z-10">
                  <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-text-muted">Recent</p>
                  {recents.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onMouseDown={() => pickRecent(r)}
                      className="block w-full text-left px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover truncate"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </form>
          ) : hasRepo ? (
            <button
              onClick={() => { setEditRepo(true); setRepoInput(repo) }}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors"
            >
              {repo}
              <ChevronDown />
            </button>
          ) : (
            <button
              onClick={() => setEditRepo(true)}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              Select repository
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasRepo && !copyOnly && (
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              {sidebarOpen ? "Hide" : "Templates"}
            </button>
          )}
          {copyOnly && (
            <button
              onClick={() => setCopyOnly(false)}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              Exit copy-only
            </button>
          )}
          <Link href="/settings" className="text-xs text-text-muted hover:text-text transition-colors">
            Settings
          </Link>
          <ThemeToggle />
          <AuthButton onAuthChange={handleAuthChange} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && hasRepo && !copyOnly && (
          <aside className="w-60 border-r border-border bg-panel shrink-0">
            <TemplateList
              templates={templates}
              selectedId={selectedTemplate?.id ?? null}
              blankActive={showEditor && selectedTemplate === null}
              loadedAt={loadedAt}
              refreshing={loadingState.type === "loading"}
              onSelect={handleSelect}
              onSelectBlank={handleSelectBlank}
              onRefresh={() => handleLoadRepo(repo)}
            />
          </aside>
        )}

        <main className="flex-1 flex flex-col bg-panel overflow-hidden">
          {showEditor ? (
            <IssueEditor
              template={selectedTemplate}
              repo={copyOnly ? "" : repo}
              authed={authed}
              copyOnly={copyOnly}
            />
          ) : !hasRepo ? (
            <FirstRun onSelectRepo={() => setEditRepo(true)} onCopyOnly={() => setCopyOnly(true)} />
          ) : loadingState.type === "loading" ? (
            <Centered><p className="text-sm text-text-muted">Loading templates…</p></Centered>
          ) : loadingState.type === "error" ? (
            <Centered>
              <p className="text-sm text-text-secondary mb-3">{loadingState.message}</p>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => handleLoadRepo(repo)} className="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-surface-hover">Retry</button>
                <button onClick={() => setForceEditor(true)} className="text-xs px-3 py-1.5 bg-accent text-accent-fg rounded-md hover:bg-accent-hover">Write blank issue</button>
              </div>
            </Centered>
          ) : (
            <Centered>
              <p className="text-sm text-text-secondary mb-3">{loadingState.message}</p>
              <button onClick={() => setForceEditor(true)} className="text-xs px-3 py-1.5 bg-accent text-accent-fg rounded-md hover:bg-accent-hover">Write blank issue</button>
            </Centered>
          )}
        </main>
      </div>
    </div>
  )
}

function FirstRun({ onSelectRepo, onCopyOnly }: { onSelectRepo: () => void; onCopyOnly: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h1 className="text-base font-semibold text-text">Create better GitHub issues from messy notes.</h1>
        <p className="text-sm text-text-secondary mt-2">Choose a repository to load its issue templates, or start without one.</p>
        <div className="flex items-center justify-center gap-2 mt-5">
          <button onClick={onSelectRepo} className="text-sm px-4 py-2 bg-accent text-accent-fg rounded-md hover:bg-accent-hover font-medium">
            Select repository
          </button>
          <button onClick={onCopyOnly} className="text-sm px-4 py-2 border border-border rounded-md hover:bg-surface-hover text-text-secondary">
            Try copy-only mode
          </button>
        </div>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-xs">{children}</div>
    </div>
  )
}

function ChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
