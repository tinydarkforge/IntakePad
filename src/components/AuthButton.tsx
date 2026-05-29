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
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Connected</span>
        <button
          onClick={handleDisconnect}
          className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-danger transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <Link
      href="/settings"
      className="text-xs font-bold px-4 py-2 bg-accent text-accent-fg rounded-full hover:opacity-90 transition-all shadow-sm shadow-accent/20"
    >
      Sign in
    </Link>
  )
}
