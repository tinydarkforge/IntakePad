"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { TemplateList } from "./TemplateList"
import { IssueEditor } from "./IssueEditor"
import { AuthButton } from "./AuthButton"
import { loadTemplates } from "@/lib/github"
import { loadSettings, saveSettings } from "@/lib/settings"
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

  const loadSettingsFromStore = useCallback(() => {
    const settings = loadSettings()
    if (settings.repo) {
      setRepo(settings.repo)
      setRepoInput(settings.repo)
    }
    setAuthed(isAuthenticated())
  }, [])

  useEffect(() => {
    loadSettingsFromStore()
    const onFocus = () => loadSettingsFromStore()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [loadSettingsFromStore])

  const handleLoadRepo = useCallback(async (ownerRepo: string) => {
    const parts = ownerRepo.split("/")
    if (parts.length !== 2) return

    setRepo(ownerRepo)
    setLoadingState({ type: "loading" })
    setSelectedTemplate(null)

    try {
      const result = await loadTemplates(parts[0], parts[1])
      if (result.length === 0) {
        setLoadingState({ type: "empty", message: "No issue templates found in this repository." })
      } else {
        setLoadingState({ type: "ready" })
      }
      setTemplates(result)
    } catch (e) {
      setLoadingState({
        type: "error",
        message: e instanceof Error ? e.message : "Failed to load templates",
      })
      setTemplates([])
    }
  }, [])

  const handleRepoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = repoInput.trim()
    const current = loadSettings()
    saveSettings({ repo: trimmed, aiEnabled: current.aiEnabled, clientId: current.clientId })
    handleLoadRepo(trimmed)
    setEditRepo(false)
  }

  const handleSelect = useCallback((t: Template) => {
    setSelectedTemplate(t)
  }, [])

  const handleAuthChange = () => {
    setAuthed(isAuthenticated())
  }

  const hasRepo = repo.length > 0

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text">IntakePad</span>
          {hasRepo && !editRepo && (
            <button
              onClick={() => {
                setEditRepo(true)
                setRepoInput(repo)
              }}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              {repo}
            </button>
          )}
          {editRepo && (
            <form onSubmit={handleRepoSubmit} className="flex items-center gap-1">
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="owner/repo"
                className="text-xs px-2 py-1 border border-border rounded outline-none w-40"
                aria-label="Repository name"
                autoFocus
              />
              <button
                type="submit"
                className="text-xs px-2 py-1 bg-accent text-white rounded hover:bg-accent-hover"
              >
                Load
              </button>
            </form>
          )}
          {!hasRepo && !editRepo && (
            <button
              onClick={() => setEditRepo(true)}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              Select repository
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasRepo && (
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              {sidebarOpen ? "Hide" : "Templates"}
            </button>
          )}
          <Link
            href="/settings"
            className="text-xs text-text-muted hover:text-text transition-colors"
          >
            Settings
          </Link>
          <AuthButton onAuthChange={handleAuthChange} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && hasRepo && (
          <aside className="w-56 border-r border-border bg-white shrink-0 overflow-y-auto">
            <TemplateList
              templates={templates}
              selectedId={selectedTemplate?.id ?? null}
              onSelect={handleSelect}
            />
          </aside>
        )}

        <main className="flex-1 flex flex-col bg-white">
          {!hasRepo ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-text-secondary">Choose a repository to load issue templates.</p>
                <button
                  onClick={() => setEditRepo(true)}
                  className="mt-3 text-sm px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover"
                >
                  Select repository
                </button>
              </div>
            </div>
          ) : loadingState.type === "loading" ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-text-muted">Loading templates...</p>
            </div>
          ) : loadingState.type === "error" && !forceEditor ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-xs">
                <p className="text-sm text-text-secondary">{loadingState.message}</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    onClick={() => handleLoadRepo(repo)}
                    className="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-surface-hover"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => setForceEditor(true)}
                    className="text-xs px-3 py-1.5 bg-accent text-white rounded-md hover:bg-accent-hover"
                  >
                    Write blank issue
                  </button>
                </div>
              </div>
            </div>
          ) : loadingState.type === "empty" && !forceEditor ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-xs">
                <p className="text-sm text-text-secondary">{loadingState.message}</p>
                <button
                  onClick={() => setForceEditor(true)}
                  className="mt-3 text-xs px-3 py-1.5 bg-accent text-white rounded-md hover:bg-accent-hover"
                >
                  Write blank issue
                </button>
              </div>
            </div>
          ) : (
            <IssueEditor
              template={selectedTemplate}
              repo={repo}
              authed={authed}
            />
          )}
        </main>
      </div>
    </div>
  )
}
