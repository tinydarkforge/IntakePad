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
      <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-panel shrink-0 z-10">
        <div className="flex items-center">
          <Link href="/" className="text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text transition-colors">
            &larr; Back
          </Link>
          <span className="text-sm font-bold tracking-tight text-text ml-6">Settings</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-xl mx-auto px-8 py-10">
          <div className="space-y-10">
            {/* Repository */}
            <section className="space-y-6">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">GitHub Configuration</h2>
              <div className="bg-panel rounded-lg border border-border p-6 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="repo" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Target Repository</label>
                    <input
                      id="repo"
                      type="text"
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                      placeholder="owner/repo"
                      className="w-full px-4 py-2 text-sm bg-bg border border-border rounded-md outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    />
                    <p className="text-[10px] text-text-muted mt-2 font-medium italic">Format: owner/repo (public repository).</p>
                  </div>

                  <div>
                    <label htmlFor="pat" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Personal Access Token</label>
                    <input
                      id="pat"
                      type="password"
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      placeholder="github_pat_..."
                      className="w-full px-4 py-2 text-sm bg-bg border border-border rounded-md outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-mono"
                    />
                    <p className="text-[10px] text-text-muted mt-2 font-medium leading-relaxed">
                      Required to create issues. Create a{" "}
                      <a href="https://github.com/settings/tokens/new?scopes=public_repo&description=IntakePad"
                         target="_blank" rel="noopener noreferrer"
                         className="text-accent hover:underline font-bold">classic PAT</a>{" "}
                      with <code className="text-[10px] bg-accent-soft px-1.5 py-0.5 rounded font-bold text-accent">public_repo</code> scope.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* AI enhancement */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">AI Enhancement Queue</h2>
                <div className="relative" ref={presetsRef}>
                  <button
                    onClick={() => setShowPresets((s) => !s)}
                    className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 bg-accent text-accent-fg rounded-lg hover:opacity-90 transition-all shadow-md shadow-accent/20"
                  >
                    + Add Provider
                  </button>

                  {showPresets && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-panel border border-border rounded-lg shadow-xl py-2 z-20 max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                      <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-text-muted border-b border-border/50 mb-1">Recommended Presets</p>
                      {AI_PRESETS.map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          onMouseDown={() => addFromPreset(preset)}
                          className="block w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors"
                        >
                          <div className="text-xs font-bold text-text">{preset.name}</div>
                          <div className="flex items-center gap-1.5 mt-1 mb-1.5">
                            {preset.tags.map((t) => (
                              <TagBadge key={t} tag={t} />
                            ))}
                          </div>
                          <div className="text-[10px] text-text-muted leading-normal">{preset.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs font-medium text-text-muted leading-relaxed">
                Prioritize your AI providers. IntakePad will attempt to use them in order until one succeeds.
              </p>

              {/* Provider list */}
              <div className="space-y-4">
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
                  <div className="rounded-lg border-2 border-dashed border-border p-12 text-center bg-bg/50">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">No Providers Configured</p>
                    <p className="text-xs text-text-muted mt-2">Add a local or cloud provider to start enhancing issues.</p>
                  </div>
                )}
              </div>
            </section>

            <div className="pt-8 flex items-center gap-4">
              <button
                onClick={handleSave}
                className="px-8 py-3 text-xs font-bold uppercase tracking-widest text-accent-fg bg-accent rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20"
              >
                {saved ? "Settings Saved" : "Save Changes"}
              </button>
              <Link href="/" className="text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text transition-colors">
                Done
              </Link>
            </div>

            <p className="text-[10px] font-medium text-text-muted leading-relaxed italic border-t border-border pt-6">
              Privacy note: Settings and drafts are stored locally in your browser. API keys are only sent to their respective providers.
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
      className="rounded-lg border border-border bg-panel overflow-hidden shadow-sm"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar/50">
        <DragHandle />
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={provider.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="w-4 h-4 accent-accent rounded"
          />
        </label>
        <input
          type="text"
          value={provider.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 text-xs font-bold text-text bg-transparent border-none outline-none focus:text-accent transition-colors"
        />
        <button
          onClick={onRemove}
          className="text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-danger transition-colors shrink-0"
          title="Remove provider"
        >
          Remove
        </button>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 pt-3 flex-wrap">
          {tags.map((t) => (
            <TagBadge key={t} tag={t} />
          ))}
        </div>
      )}

      {/* Fields */}
      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Shape</label>
            <select
              value={provider.shape}
              onChange={(e) => onUpdate({ shape: e.target.value as AiShape })}
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-md outline-none focus:border-accent transition-all"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI-compatible</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Model</label>
            <input
              type="text"
              value={provider.model}
              onChange={(e) => onUpdate({ model: e.target.value })}
              placeholder="e.g. gpt-4o-mini"
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-md outline-none focus:border-accent transition-all font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Base URL</label>
          <input
            type="text"
            value={provider.baseUrl}
            onChange={(e) => onUpdate({ baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
            className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-md outline-none focus:border-accent transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">API key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder={provider.shape === "anthropic" ? "sk-ant-..." : "sk-... or leave blank for local"}
            className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-md outline-none focus:border-accent transition-all font-mono"
          />
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="w-7 h-7 flex items-center justify-center text-xs text-text-muted hover:text-text border border-border rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Move up"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="w-7 h-7 flex items-center justify-center text-xs text-text-muted hover:text-text border border-border rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Move down"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            onClick={onHealthCheck}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 text-text-muted hover:text-text border border-border rounded-md transition-all ml-1"
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
    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${cls}`}>{tag}</span>
  )
}

function deriveTags(provider: AiProvider): string[] {
  const tags: string[] = []
  if (provider.baseUrl.includes("localhost")) tags.push("local")
  if (provider.shape === "anthropic") tags.push("requires key")
  if (provider.shape === "openai") tags.push("OpenAI-compatible")
  return tags
}
