"use client"

import { useEffect, useState } from "react"
import { getThemePref, setThemePref, resolveTheme, type ThemePref } from "@/lib/theme"

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>("system")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setPref(getThemePref())
    setMounted(true)
  }, [])

  const resolved = mounted ? resolveTheme(pref) : "light"

  const toggle = () => {
    const next: ThemePref = resolved === "dark" ? "light" : "dark"
    setPref(next)
    setThemePref(next)
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
      aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} theme`}
      title={`Theme: ${pref}`}
    >
      {mounted && resolved === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}
