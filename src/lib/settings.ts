const SETTINGS_KEY = "intakepad:settings"

export interface Settings {
  repo: string
  aiEnabled: boolean
}

const defaults: Settings = {
  repo: "",
  aiEnabled: false,
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
