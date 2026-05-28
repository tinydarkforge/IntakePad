const AUTH_KEY = "intakepad:github_token"
const AI_KEY = "intakepad:ai_key"

export function getAiKey(): string | null {
  try {
    return localStorage.getItem(AI_KEY)
  } catch {
    return null
  }
}

export function setAiKey(key: string) {
  try {
    localStorage.setItem(AI_KEY, key)
  } catch {}
}

export function clearAiKey() {
  try {
    localStorage.removeItem(AI_KEY)
  } catch {}
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(AUTH_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(AUTH_KEY, token)
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(AUTH_KEY)
  } catch {}
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}
