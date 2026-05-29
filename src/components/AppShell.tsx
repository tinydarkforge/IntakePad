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
  const [bladeOpen, setBladeOpen] = useState(false)
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
      <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-panel shrink-0 z-10">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold tracking-tight text-accent flex items-center gap-2"><IntakePadIcon />IntakePad</span>
          <div className="h-4 w-px bg-border"></div>

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
                className="text-xs px-3 py-1.5 bg-panel border border-border rounded-md outline-none focus:border-accent w-48 transition-all"
                aria-label="Repository name"
                autoFocus
              />
              <button type="submit" className="text-xs px-3 py-1.5 bg-accent text-accent-fg rounded-md hover:bg-accent-hover font-semibold">
                Load
              </button>
              {recents.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-panel border border-border rounded-lg shadow-lg py-1.5 z-20">
                  <p className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-text-muted">Recent</p>
                  {recents.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onMouseDown={() => pickRecent(r)}
                      className="block w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover truncate"
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
              className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text transition-colors"
            >
              {repo}
              <ChevronDown />
            </button>
          ) : (
            <button
              onClick={() => setEditRepo(true)}
              className="text-xs font-medium text-text-muted hover:text-text transition-colors"
            >
              Select repository
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {copyOnly && (
            <button
              onClick={() => setCopyOnly(false)}
              className="text-xs font-semibold text-text-muted hover:text-text transition-colors"
            >
              Exit copy-only
            </button>
          )}
          <AuthButton onAuthChange={handleAuthChange} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {hasRepo && !copyOnly && (
          <aside 
            className={`border-r border-border bg-sidebar shrink-0 flex flex-col transition-all duration-300 ease-in-out ${
              sidebarOpen ? "w-64" : "w-16"
            }`}
          >
            <div className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
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
            </div>

            {/* Bottom blade */}
            <div className="border-t border-border shrink-0 p-3 bg-sidebar/50">
              <div className={`flex items-center ${sidebarOpen ? "justify-between" : "justify-center"}`}>
                <div className={`flex items-center gap-1 ${sidebarOpen ? "" : "hidden"}`}>
                  <button
                    onClick={() => setBladeOpen((o) => !o)}
                    className="p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                    title="Settings"
                  >
                    <GearIcon />
                  </button>
                  {bladeOpen && (
                    <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-left-2 duration-200">
                      <ThemeToggle />
                      <Link
                        href="/settings"
                        className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                        title="Advanced Settings"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                      </Link>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                  title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  <SidebarIcon />
                </button>
              </div>
            </div>
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
    <div className="flex-1 flex items-center justify-center p-8 bg-bg/50">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold tracking-tight text-text leading-tight">Create better GitHub issues <br/> from messy notes.</h1>
        <p className="text-sm font-medium text-text-secondary mt-4 leading-relaxed">Choose a repository to load its issue templates, <br/> or start drafting without one.</p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <button 
            onClick={onSelectRepo} 
            className="text-sm font-bold px-6 py-2.5 bg-accent text-accent-fg rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20"
          >
            Select repository
          </button>
          <button 
            onClick={onCopyOnly} 
            className="text-sm font-bold px-6 py-2.5 border border-border rounded-lg hover:bg-surface-hover text-text-secondary transition-all"
          >
            Try copy-only mode
          </button>
        </div>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-bg/50">
      <div className="text-center max-w-sm">{children}</div>
    </div>
  )
}

function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function SidebarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </svg>
  )
}

function IntakePadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 5h18l-7 10v4h-4v-4L3 5z" fill="var(--c-accent)"/>
      <rect x="10" y="19" width="4" height="1.5" rx="0.75" fill="var(--c-accent)"/>
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
