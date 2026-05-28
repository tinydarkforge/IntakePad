const AUTH_KEY = "intakepad:github_token"

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
