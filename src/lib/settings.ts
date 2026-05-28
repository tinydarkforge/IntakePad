const SETTINGS_KEY = "intakepad:settings"
const RECENTS_KEY = "intakepad:recent_repos"

export type AiShape = "openai" | "anthropic"

export interface Settings {
  repo: string
  aiEnabled: boolean
  aiShape: AiShape
  aiBaseUrl: string
  aiModel: string
}

const defaults: Settings = {
  repo: "",
  aiEnabled: false,
  aiShape: "anthropic",
  aiBaseUrl: "",
  aiModel: "",
}

export const AI_DEFAULTS: Record<AiShape, { baseUrl: string; modelPlaceholder: string }> = {
  anthropic: { baseUrl: "https://api.anthropic.com/v1", modelPlaceholder: "claude-haiku-4-5" },
  openai: { baseUrl: "https://api.openai.com/v1", modelPlaceholder: "gpt-4o-mini" },
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...defaults }
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return { ...defaults }
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
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
