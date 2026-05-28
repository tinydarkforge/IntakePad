"use client"

import { useState, useEffect, useRef } from "react"
import { isAuthenticated, clearToken, getToken, requestDeviceCode, pollForToken, setToken } from "@/lib/auth"

interface AuthButtonProps {
  onAuthChange: () => void
}

export function AuthButton({ onAuthChange }: AuthButtonProps) {
  const [authed, setAuthed] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [userCode, setUserCode] = useState<string | null>(null)
  const [verificationUri, setVerificationUri] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setAuthed(isAuthenticated())
  }, [])

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    setWaiting(false)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const { device_code, user_code, verification_uri, interval } = await requestDeviceCode()
      setUserCode(user_code)
      setVerificationUri(verification_uri)
      setWaiting(true)

      const token = await pollForToken(device_code, interval, () => {}, controller.signal)
      setToken(token)
      setAuthed(true)
      setUserCode(null)
      setVerificationUri(null)
      onAuthChange()
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError(null)
      } else {
        setError(e instanceof Error ? e.message : "Connection failed")
      }
      setUserCode(null)
      setVerificationUri(null)
    } finally {
      setConnecting(false)
      setWaiting(false)
      abortRef.current = null
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
  }

  const handleDisconnect = () => {
    clearToken()
    setAuthed(false)
    onAuthChange()
  }

  if (connecting && userCode) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">
          Enter code{" "}
          <span className="font-mono font-bold text-accent px-1 py-0.5 bg-accent/10 rounded">
            {userCode}
          </span>{" "}
          at{" "}
          <a
            href={verificationUri ?? "https://github.com/login/device"}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-accent"
          >
            github.com/login/device
          </a>
          {waiting && (
            <span className="ml-1 animate-pulse">Waiting for authorization&hellip;</span>
          )}
        </span>
        <button
          onClick={handleCancel}
          className="text-xs text-text-muted hover:text-red-500 transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (authed) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">GitHub connected</span>
        <button
          onClick={handleDisconnect}
          className="text-xs text-text-muted hover:text-red-500 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="text-xs px-3 py-1.5 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {connecting ? "Connecting..." : "Connect GitHub"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
