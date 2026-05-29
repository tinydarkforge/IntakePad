const AUTH_KEY = "intakepad:github_token"
const OLD_AI_KEY = "intakepad:ai_key"
const AI_KEY_PREFIX = "intakepad:ai_key:"

export function getProviderKey(providerId: string): string | null {
  try {
    return localStorage.getItem(`${AI_KEY_PREFIX}${providerId}`)
  } catch {
    return null
  }
}

export function setProviderKey(providerId: string, key: string) {
  try {
    localStorage.setItem(`${AI_KEY_PREFIX}${providerId}`, key)
  } catch {}
}

export function clearProviderKey(providerId: string) {
  try {
    localStorage.removeItem(`${AI_KEY_PREFIX}${providerId}`)
  } catch {}
}

export function getOldAiKey(): string | null {
  try {
    return localStorage.getItem(OLD_AI_KEY)
  } catch {
    return null
  }
}

export function removeOldAiKey() {
  try {
    localStorage.removeItem(OLD_AI_KEY)
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
