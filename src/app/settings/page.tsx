"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import {
  loadSettings,
  saveSettings,
  AI_PRESETS,
  PRESET_BY_KEY,
  createProviderFromPreset,
  type AiProvider,
  type AiShape,
  type Settings,
  type AiPreset,
} from "@/lib/settings"
import { getToken, setToken, getProviderKey, setProviderKey, clearProviderKey } from "@/lib/auth"
import { healthCheck, type HealthCheckResult } from "@/lib/ai"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function SettingsPage() {
  const [repo, setRepo] = useState("")
  const [providers, setProviders] = useState<AiProvider[]>([])
  const [pat, setPat] = useState("")
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [healthChecks, setHealthChecks] = useState<Record<string, "loading" | HealthCheckResult>>({})
  const presetsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const s = loadSettings()
    setRepo(s.repo)
    setProviders(s.aiProviders)
    setPat(getToken() ?? "")

    const keys: Record<string, string> = {}
    for (const p of s.aiProviders) {
      const k = getProviderKey(p.id)
      if (k) keys[p.id] = k
    }
    setProviderKeys(keys)
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresets(false)
      }
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const updateProvider = useCallback((id: string, patch: Partial<AiProvider>) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }, [])

  const updateKey = useCallback((id: string, key: string) => {
    setProviderKeys((prev) => ({ ...prev, [id]: key }))
  }, [])

  const moveProvider = useCallback((from: number, to: number) => {
    setProviders((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  const removeProvider = useCallback((id: string) => {
    setProviders((prev) => prev.filter((p) => p.id !== id))
    clearProviderKey(id)
    setProviderKeys((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const addFromPreset = useCallback((preset: AiPreset) => {
    const p = createProviderFromPreset(preset)
    setProviders((prev) => [...prev, p])
    setShowPresets(false)
  }, [])

  const handleSave = () => {
    const settings: Settings = { repo: repo.trim(), aiProviders: providers }
    saveSettings(settings)
    if (pat.trim()) setToken(pat.trim())

    for (const [id, key] of Object.entries(providerKeys)) {
      if (key.trim()) setProviderKey(id, key.trim())
      else clearProviderKey(id)
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const runHealthCheck = useCallback(
    async (provider: AiProvider) => {
      const id = provider.id
      setHealthChecks((prev) => ({ ...prev, [id]: "loading" }))
      try {
        const result = await healthCheck({
          id: provider.id,
          name: provider.name,
          shape: provider.shape,
          baseUrl: provider.baseUrl,
          model: provider.model,
          apiKey: providerKeys[provider.id] ?? "",
        })
        setHealthChecks((prev) => ({ ...prev, [id]: result }))
      } catch {
        setHealthChecks((prev) => ({
          ...prev,
          [id]: { ok: false, message: "Health check failed", detail: "Unexpected error" },
        }))
      }
    },
    [providerKeys],
  )

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

              <p className="text-xs text-text-muted">
                Configure a prioritized queue of AI providers. The first enabled provider that
                succeeds will enhance your draft. Local providers are tried first by default.
              </p>

              {/* Provider list */}
              <div className="space-y-2">
                {providers.map((provider, idx) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    index={idx}
                    total={providers.length}
                    apiKey={providerKeys[provider.id] ?? ""}
                    healthCheck={healthChecks[provider.id] ?? null}
                    draggable
                    onUpdate={(patch) => updateProvider(provider.id, patch)}
                    onKeyChange={(key) => updateKey(provider.id, key)}
                    onMoveUp={() => moveProvider(idx, idx - 1)}
                    onMoveDown={() => moveProvider(idx, idx + 1)}
                    onRemove={() => removeProvider(provider.id)}
                    onHealthCheck={() => runHealthCheck(provider)}
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (dragIdx !== null && dragIdx !== idx) {
                        moveProvider(dragIdx, idx)
                        setDragIdx(idx)
                      }
                    }}
                    onDragEnd={() => setDragIdx(null)}
                  />
))}

                {providers.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-text-muted">No providers configured. Add one below.</p>
                  </div>
                )}
              </div>

              {/* Add provider */}
              <div className="relative" ref={presetsRef}>
                <button
                  onClick={() => setShowPresets((s) => !s)}
                  className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-surface-hover text-text-secondary transition-colors"
                >
                  + Add provider
                </button>

                {showPresets && (
                  <div className="absolute left-0 top-full mt-1 w-72 bg-panel border border-border rounded-md shadow-md py-1 z-10 max-h-72 overflow-y-auto">
                    {AI_PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onMouseDown={() => addFromPreset(preset)}
                        className="block w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors"
                      >
                        <div className="text-sm text-text">{preset.name}</div>
                        <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {preset.tags.map((t) => (
                            <TagBadge key={t} tag={t} />
                          ))}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
              except GitHub and your chosen AI provider(s).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Provider Card ─── */

interface ProviderCardProps {
  provider: AiProvider
  index: number
  total: number
  apiKey: string
  healthCheck: "loading" | HealthCheckResult | null
  draggable: boolean
  onUpdate: (patch: Partial<AiProvider>) => void
  onKeyChange: (key: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onHealthCheck: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function ProviderCard({
  provider,
  index,
  total,
  apiKey,
  healthCheck: hc,
  draggable,
  onUpdate,
  onKeyChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  onHealthCheck,
  onDragStart,
  onDragOver,
  onDragEnd,
}: ProviderCardProps) {
  const tags = provider.presetKey ? (PRESET_BY_KEY[provider.presetKey]?.tags ?? []) : deriveTags(provider)

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className="rounded-md border border-border bg-panel overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-hover">
        <DragHandle />
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={provider.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="accent-[var(--c-accent)]"
          />
        </label>
        <input
          type="text"
          value={provider.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 text-sm font-medium text-text bg-transparent border-none outline-none"
        />
        <button
          onClick={onRemove}
          className="text-xs text-text-muted hover:text-danger transition-colors shrink-0"
          title="Remove provider"
        >
          Remove
        </button>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 pt-2 flex-wrap">
          {tags.map((t) => (
            <TagBadge key={t} tag={t} />
          ))}
        </div>
      )}

      {/* Fields */}
      <div className="px-3 py-2 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs text-text-muted mb-1">Shape</label>
            <select
              value={provider.shape}
              onChange={(e) => onUpdate({ shape: e.target.value as AiShape })}
              className="w-full px-2 py-1.5 text-sm bg-panel border border-border rounded-md outline-none focus:border-accent transition-colors"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI-compatible</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Model</label>
            <input
              type="text"
              value={provider.model}
              onChange={(e) => onUpdate({ model: e.target.value })}
              placeholder="e.g. gpt-4o-mini"
              className="w-full px-2 py-1.5 text-sm bg-panel border border-border rounded-md outline-none focus:border-accent transition-colors font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">Base URL</label>
          <input
            type="text"
            value={provider.baseUrl}
            onChange={(e) => onUpdate({ baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
            className="w-full px-2 py-1.5 text-sm bg-panel border border-border rounded-md outline-none focus:border-accent transition-colors font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">API key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder={provider.shape === "anthropic" ? "sk-ant-..." : "sk-... or leave blank for local"}
            className="w-full px-2 py-1.5 text-sm bg-panel border border-border rounded-md outline-none focus:border-accent transition-colors font-mono"
          />
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between px-3 pb-2.5">
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="px-2 py-1 text-xs text-text-muted hover:text-text border border-border rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move up"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="px-2 py-1 text-xs text-text-muted hover:text-text border border-border rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move down"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            onClick={onHealthCheck}
            className="text-xs px-2 py-1 text-text-muted hover:text-text border border-border rounded transition-colors"
          >
            {hc && hc !== "loading" ? "Check again" : "Health check"}
          </button>
        </div>

        <HealthStatus result={hc} />
      </div>
    </div>
  )
}

function HealthStatus({ result }: { result: "loading" | HealthCheckResult | null }) {
  if (!result) return null
  if (result === "loading") {
    return <span className="text-xs text-text-muted flex items-center gap-1"><Spinner />Checking…</span>
  }
  if (result.ok) {
    return (
      <span className="text-xs text-success flex items-center gap-1">
        <CheckMark /> {result.message}
      </span>
    )
  }
  return (
    <span className="text-xs text-danger-fg flex items-center gap-1" title={result.detail}>
      ✕ {result.message}
    </span>
  )
}

function Spinner() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="spin text-text-muted" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function CheckMark() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function DragHandle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted shrink-0 cursor-grab" aria-hidden="true">
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  )
}

function TagBadge({ tag }: { tag: string }) {
  const colors: Record<string, string> = {
    local: "text-green-700 bg-green-100",
    "no key": "text-green-700 bg-green-100",
    "privacy best": "text-green-700 bg-green-100",
    "free tier": "text-blue-700 bg-blue-100",
    "OpenAI-compatible": "text-gray-600 bg-gray-100",
    "requires key": "text-amber-700 bg-amber-100",
    "CORS risk": "text-red-700 bg-red-100",
  }
  const cls = colors[tag] ?? "text-gray-600 bg-gray-100"
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cls}`}>{tag}</span>
  )
}

function deriveTags(provider: AiProvider): string[] {
  const tags: string[] = []
  if (provider.baseUrl.includes("localhost")) tags.push("local")
  if (provider.shape === "anthropic") tags.push("requires key")
  if (provider.shape === "openai") tags.push("OpenAI-compatible")
  return tags
}
