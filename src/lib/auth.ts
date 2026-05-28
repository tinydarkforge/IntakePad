import { getClientId } from "@/config"

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

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  interval: number
}

interface AccessTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const body = new URLSearchParams({ client_id: getClientId(), scope: "public_repo" })
  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: { Accept: "application/json" },
    body,
  })
  if (!res.ok) throw new Error("Failed to start device authorization")
  return res.json()
}

export async function pollForToken(
  deviceCode: string,
  interval: number,
  onPoll: () => void,
  signal?: AbortSignal,
): Promise<string> {
  while (!signal?.aborted) {
    await new Promise((r) => setTimeout(r, interval * 1000))
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
    onPoll()
    const body = new URLSearchParams({
      client_id: getClientId(),
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    })
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json" },
      body,
    })
    const data: AccessTokenResponse = await res.json()
    if (data.access_token) return data.access_token
    if (data.error === "authorization_pending") continue
    if (data.error === "slow_down") {
      interval += 5
      continue
    }
    throw new Error(data.error_description ?? "Authorization failed")
  }
  throw new DOMException("Aborted", "AbortError")
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}
