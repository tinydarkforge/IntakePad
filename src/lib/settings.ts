import { getOldAiKey, setProviderKey, removeOldAiKey } from "./auth"

const SETTINGS_KEY = "intakepad:settings"
const RECENTS_KEY = "intakepad:recent_repos"

export type AiShape = "openai" | "anthropic"

export interface AiProvider {
  id: string
  name: string
  shape: AiShape
  baseUrl: string
  model: string
  enabled: boolean
  presetKey?: string
}

export interface Settings {
  repo: string
  aiProviders: AiProvider[]
}

export interface AiPreset {
  key: string
  name: string
  shape: AiShape
  baseUrl: string
  model: string
  description: string
  tags: string[]
}

export const AI_PRESETS: AiPreset[] = [
  {
    key: "local-ollama",
    name: "Local (Ollama)",
    shape: "openai",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
    description: "Free, local, privacy-first. Runs on your machine via Ollama.",
    tags: ["local", "OpenAI-compatible", "no key", "privacy best", "CORS risk"],
  },
  {
    key: "local-lm-studio",
    name: "Local (LM Studio)",
    shape: "openai",
    baseUrl: "http://localhost:1234/v1",
    model: "",
    description: "Free, local, privacy-first. Runs on your machine via LM Studio.",
    tags: ["local", "OpenAI-compatible", "no key", "privacy best", "CORS risk"],
  },
  {
    key: "anthropic",
    name: "Anthropic",
    shape: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-haiku-4-5",
    description: "Cloud provider. Requires API key.",
    tags: ["requires key", "CORS risk"],
  },
  {
    key: "openai",
    name: "OpenAI",
    shape: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    description: "Cloud provider. Requires API key.",
    tags: ["requires key", "CORS risk"],
  },
  {
    key: "openrouter",
    name: "OpenRouter",
    shape: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.0-flash-free:free",
    description: "Free tier available. Requires API key.",
    tags: ["free tier", "OpenAI-compatible", "requires key", "CORS risk"],
  },
  {
    key: "groq",
    name: "Groq",
    shape: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    description: "Free tier available. Requires API key.",
    tags: ["free tier", "OpenAI-compatible", "requires key", "CORS risk"],
  },
]

export const PRESET_BY_KEY: Record<string, AiPreset> = Object.fromEntries(
  AI_PRESETS.map((p) => [p.key, p]),
)

function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

export function createProviderFromPreset(preset: AiPreset, enabled?: boolean): AiProvider {
  return {
    id: generateId(),
    name: preset.name,
    shape: preset.shape,
    baseUrl: preset.baseUrl,
    model: preset.model,
    enabled: enabled ?? (preset.key === "local-ollama" || preset.key === "local-lm-studio"),
    presetKey: preset.key,
  }
}

export function createDefaultProviders(): AiProvider[] {
  return AI_PRESETS.map((p) => createProviderFromPreset(p))
}

interface OldSettings {
  repo?: string
  aiEnabled?: boolean
  aiShape?: AiShape
  aiBaseUrl?: string
  aiModel?: string
}

function isOldFormat(raw: unknown): raw is Record<string, unknown> & OldSettings {
  if (typeof raw !== "object" || raw === null) return false
  return "aiShape" in raw || "aiEnabled" in raw
}

function migrateOldSettings(raw: OldSettings): Settings {
  const providers = createDefaultProviders()

  if (raw.aiEnabled && raw.aiShape) {
    const presetKey = raw.aiShape === "anthropic" ? "anthropic" : "openai"
    const idx = providers.findIndex((p) => p.presetKey === presetKey)
    if (idx !== -1) {
      providers[idx] = {
        ...providers[idx],
        enabled: true,
        baseUrl: raw.aiBaseUrl || providers[idx].baseUrl,
        model: raw.aiModel || providers[idx].model,
      }

      const oldKey = getOldAiKey()
      if (oldKey) {
        setProviderKey(providers[idx].id, oldKey)
        removeOldAiKey()
      }
    }
  }

  return {
    repo: raw.repo ?? "",
    aiProviders: providers,
  }
}

const defaults: Settings = {
  repo: "",
  aiProviders: createDefaultProviders(),
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return cloneDefaults()
    const parsed = JSON.parse(raw)

    if (isOldFormat(parsed)) {
      const migrated = migrateOldSettings(parsed)
      saveSettings(migrated)
      return migrated
    }

    return {
      repo: typeof parsed.repo === "string" ? parsed.repo : defaults.repo,
      aiProviders: Array.isArray(parsed.aiProviders)
        ? parsed.aiProviders
        : cloneDefaults().aiProviders,
    }
  } catch {
    return cloneDefaults()
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}

function cloneDefaults(): Settings {
  return {
    repo: defaults.repo,
    aiProviders: defaults.aiProviders.map((p) => ({ ...p })),
  }
}

export function loadRecentRepos(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

export function addRecentRepo(repo: string) {
  if (!repo) return
  try {
    const existing = loadRecentRepos().filter((r) => r !== repo)
    const next = [repo, ...existing].slice(0, 5)
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
  } catch {}
}
