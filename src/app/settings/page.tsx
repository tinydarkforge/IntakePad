"use client"

import { useState } from "react"
import Link from "next/link"

export default function SettingsPage() {
  const [repo, setRepo] = useState("owner/repo")
  const [aiEnabled, setAiEnabled] = useState(false)

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
              className="w-full px-3 py-2 text-sm border border-border rounded-md outline-none focus:border-accent"
              aria-label="Repository owner/repo"
            />
            <p className="text-xs text-text-muted mt-1">Format: owner/repo</p>
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
            <p className="text-xs text-text-muted">
              Drafts are saved locally in your browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
