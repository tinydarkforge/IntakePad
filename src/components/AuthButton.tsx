"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { isAuthenticated, clearToken } from "@/lib/auth"

interface AuthButtonProps {
  onAuthChange: () => void
}

export function AuthButton({ onAuthChange }: AuthButtonProps) {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    setAuthed(isAuthenticated())
  }, [])

  const handleDisconnect = () => {
    clearToken()
    setAuthed(false)
    onAuthChange()
  }

  if (authed) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">GitHub connected</span>
        <button
          onClick={handleDisconnect}
          className="text-xs text-text-muted hover:text-danger transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <Link
      href="/settings"
      className="text-xs px-3 py-1.5 bg-accent text-accent-fg rounded-md hover:bg-accent-hover transition-colors"
    >
      Connect GitHub
    </Link>
  )
}
