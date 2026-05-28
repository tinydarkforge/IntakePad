"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { loadSettings, saveSettings } from "@/lib/settings"
import { getToken, setToken } from "@/lib/auth"

export default function SettingsPage() {
  const [repo, setRepo] = useState("")
  const [aiEnabled, setAiEnabled] = useState(false)
  const [pat, setPat] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const s = loadSettings()
    setRepo(s.repo)
    setAiEnabled(s.aiEnabled)
    setPat(getToken() ?? "")
  }, [])

  const handleSave = () => {
    saveSettings({ repo: repo.trim(), aiEnabled })
    if (pat.trim()) setToken(pat.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 border-b border-border flex items-center px-4 bg-white shrink-0">
        <Link href="/" className="text-sm text-text-muted hover:text-text transition-colors">
          &larr; Back
        </Link>
        <span className="text-sm font-semibold text-text ml-4">Settings</span>
      </header>

      <div className="flex-1 overflow-auto p-6 max-w-lg">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Repository</label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo"
              className="w-full px-3 py-2 text-sm border border-border rounded-md outline-none focus:border-accent"
              aria-label="Repository owner/repo"
            />
            <p className="text-xs text-text-muted mt-1">Format: owner/repo (must be a public repository)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">GitHub Personal Access Token</label>
            <input
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="github_pat_..."
              className="w-full px-3 py-2 text-sm border border-border rounded-md outline-none focus:border-accent font-mono"
              aria-label="Personal Access Token"
            />
            <p className="text-xs text-text-muted mt-1">
              Create a{" "}
              <a href="https://github.com/settings/tokens/new?scopes=public_repo&description=IntakePad"
                 target="_blank" rel="noopener noreferrer"
                 className="underline hover:text-accent">classic PAT</a>{" "}
              with <code className="text-xs bg-surface-hover px-1 rounded">public_repo</code> scope
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ai"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="ai" className="text-sm text-text">
              Use AI enhancement when available
            </label>
          </div>

          <div className="pt-4 border-t border-border">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm text-white bg-accent rounded-md hover:bg-accent-hover transition-colors font-medium"
            >
              {saved ? "Saved!" : "Save settings"}
            </button>
          </div>

          <div className="pt-4">
            <p className="text-xs text-text-muted">
              Settings and drafts are saved locally in your browser.
              No data is sent to any server except GitHub.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
