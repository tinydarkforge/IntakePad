"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { isAuthenticated, clearToken } from "@/lib/auth"

export function AuthButton() {
  const authed = useSyncExternalStore(
    (callback) => {
      window.addEventListener("intakepad-auth", callback)
      window.addEventListener("storage", callback)
      return () => {
        window.removeEventListener("intakepad-auth", callback)
        window.removeEventListener("storage", callback)
      }
    },
    isAuthenticated,
    () => false,
  )

  const handleDisconnect = () => {
    clearToken()
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
      className="text-xs font-bold px-4 py-2 bg-accent text-accent-fg rounded-lg hover:opacity-90 transition-all shadow-sm shadow-accent/20"
    >
      Sign in
    </Link>
  )
}
