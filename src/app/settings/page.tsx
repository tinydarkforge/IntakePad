"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { loadSettings, saveSettings, AI_DEFAULTS, type AiShape } from "@/lib/settings"
import { getToken, setToken, getAiKey, setAiKey, clearAiKey } from "@/lib/auth"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function SettingsPage() {
  const [repo, setRepo] = useState("")
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiShape, setAiShape] = useState<AiShape>("anthropic")
  const [aiBaseUrl, setAiBaseUrl] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [aiKey, setAiKeyState] = useState("")
  const [pat, setPat] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const s = loadSettings()
    setRepo(s.repo)
    setAiEnabled(s.aiEnabled)
    setAiShape(s.aiShape)
    setAiBaseUrl(s.aiBaseUrl)
    setAiModel(s.aiModel)
    setPat(getToken() ?? "")
    setAiKeyState(getAiKey() ?? "")
  }, [])

  const handleSave = () => {
    saveSettings({ repo: repo.trim(), aiEnabled, aiShape, aiBaseUrl: aiBaseUrl.trim(), aiModel: aiModel.trim() })
    if (pat.trim()) setToken(pat.trim())
    if (aiKey.trim()) setAiKey(aiKey.trim())
    else clearAiKey()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const shapeDefaults = AI_DEFAULTS[aiShape]

  return (
    <div className="h-screen flex flex-col bg-bg">
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-panel shrink-0">
        <div className="flex items-center">
          <Link href="/" className="text-sm text-text-muted hover:text-text transition-colors">
            &larr; Back
          </Link>
          <span className="text-sm font-semibold text-text ml-4">Settings</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-6 py-8">
          <div className="space-y-8">
            {/* Repository */}
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">GitHub</h2>
              <div>
                <label htmlFor="repo" className="block text-sm font-medium text-text mb-1.5">Repository</label>
                <input
                  id="repo"
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="owner/repo"
                  className="w-full px-3 py-2 text-sm bg-panel border border-border rounded-md outline-none focus:border-accent transition-colors"
                />
                <p className="text-xs text-text-muted mt-1.5">Format: owner/repo (public repository).</p>
              </div>

              <div>
                <label htmlFor="pat" className="block text-sm font-medium text-text mb-1.5">Personal Access Token</label>
                <input
                  id="pat"
                  type="password"
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder="github_pat_..."
                  className="w-full px-3 py-2 text-sm bg-panel border border-border rounded-md outline-none focus:border-accent transition-colors font-mono"
                />
                <p className="text-xs text-text-muted mt-1.5">
                  Create a{" "}
                  <a href="https://github.com/settings/tokens/new?scopes=public_repo&description=IntakePad"
                     target="_blank" rel="noopener noreferrer"
                     className="underline hover:text-accent">classic PAT</a>{" "}
                  with <code className="text-xs bg-surface-hover px-1 py-0.5 rounded">public_repo</code> scope.
                </p>
              </div>
            </section>

            {/* AI enhancement */}
            <section className="space-y-4 pt-6 border-t border-border">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">AI enhancement</h2>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="mt-0.5 accent-[var(--c-accent)]"
                />
                <span className="text-sm text-text">
                  Enable AI enhancement
                  <span className="block text-xs text-text-muted mt-0.5">
                    Adds an &ldquo;Enhance&rdquo; button that cleans up your draft into a structured issue.
                  </span>
                </span>
              </label>

              {aiEnabled && (
                <div className="space-y-4 pl-1">
                  <div>
                    <label htmlFor="shape" className="block text-sm font-medium text-text mb-1.5">Provider</label>
                    <select
                      id="shape"
                      value={aiShape}
                      onChange={(e) => setAiShape(e.target.value as AiShape)}
                      className="w-full px-3 py-2 text-sm bg-panel border border-border rounded-md outline-none focus:border-accent transition-colors"
                    >
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="openai">OpenAI-compatible</option>
                    </select>
                    <p className="text-xs text-text-muted mt-1.5">
                      &ldquo;OpenAI-compatible&rdquo; works with OpenAI, OpenRouter, Groq, Together, or any
                      endpoint exposing <code className="bg-surface-hover px-1 py-0.5 rounded">/chat/completions</code>.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="baseurl" className="block text-sm font-medium text-text mb-1.5">Base URL</label>
                    <input
                      id="baseurl"
                      type="text"
                      value={aiBaseUrl}
                      onChange={(e) => setAiBaseUrl(e.target.value)}
                      placeholder={shapeDefaults.baseUrl}
                      className="w-full px-3 py-2 text-sm bg-panel border border-border rounded-md outline-none focus:border-accent transition-colors font-mono"
                    />
                    <p className="text-xs text-text-muted mt-1.5">Leave blank to use {shapeDefaults.baseUrl}</p>
                  </div>

                  <div>
                    <label htmlFor="model" className="block text-sm font-medium text-text mb-1.5">Model</label>
                    <input
                      id="model"
                      type="text"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder={shapeDefaults.modelPlaceholder}
                      className="w-full px-3 py-2 text-sm bg-panel border border-border rounded-md outline-none focus:border-accent transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="aikey" className="block text-sm font-medium text-text mb-1.5">API key</label>
                    <input
                      id="aikey"
                      type="password"
                      value={aiKey}
                      onChange={(e) => setAiKeyState(e.target.value)}
                      placeholder={aiShape === "anthropic" ? "sk-ant-..." : "sk-..."}
                      className="w-full px-3 py-2 text-sm bg-panel border border-border rounded-md outline-none focus:border-accent transition-colors font-mono"
                    />
                    <p className="text-xs text-text-muted mt-1.5">
                      Stored only in your browser and sent directly to the provider. Because there is no
                      backend, the key is readable by any script on this page — use a scoped, low-limit key.
                      Your provider must allow browser (CORS) requests.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <div className="pt-6 border-t border-border flex items-center gap-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm text-accent-fg bg-accent rounded-md hover:bg-accent-hover transition-colors font-medium"
              >
                {saved ? "Saved!" : "Save settings"}
              </button>
              <Link href="/" className="text-sm text-text-muted hover:text-text transition-colors">
                Done
              </Link>
            </div>

            <p className="text-xs text-text-muted">
              Settings and drafts are saved locally in your browser. No data is sent to any server
              except GitHub and your chosen AI provider.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
