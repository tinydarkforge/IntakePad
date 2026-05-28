"use client"

import { useState, useCallback } from "react"
import { TemplateList } from "./TemplateList"
import { IssueEditor } from "./IssueEditor"
import { MOCK_TEMPLATES } from "@/lib/templates"
import type { Template } from "@/lib/templates"

export function AppShell() {
  const [repo, setRepo] = useState("owner/repo")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [editRepo, setEditRepo] = useState(false)
  const [repoInput, setRepoInput] = useState(repo)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleSelectTemplate = useCallback((t: Template) => {
    setSelectedTemplate(t)
  }, [])

  const handleRepoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setRepo(repoInput)
    setEditRepo(false)
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text">IntakePad</span>
          </div>
          {editRepo ? (
            <form onSubmit={handleRepoSubmit} className="flex items-center gap-1">
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                className="text-xs px-2 py-1 border border-border rounded outline-none w-40"
                aria-label="Repository name"
                autoFocus
              />
              <button
                type="submit"
                className="text-xs px-2 py-1 bg-accent text-white rounded hover:bg-accent-hover"
              >
                Set
              </button>
            </form>
          ) : (
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
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="text-xs text-text-muted hover:text-text transition-colors px-2 py-1"
          >
            {sidebarOpen ? "Hide templates" : "Show templates"}
          </button>
          <span className="text-xs text-text-muted">v0.1</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <aside className="w-56 border-r border-border bg-white shrink-0 overflow-y-auto">
            <TemplateList
              templates={MOCK_TEMPLATES}
              selectedId={selectedTemplate?.id ?? null}
              onSelect={handleSelectTemplate}
            />
          </aside>
        )}

        <main className="flex-1 flex flex-col bg-white">
          <IssueEditor template={selectedTemplate} repo={repo} />
        </main>
      </div>
    </div>
  )
}
