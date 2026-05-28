"use client"

import { useEffect, useState } from "react"

/** Returns a timestamp that ticks on an interval, so relative-time labels
 *  ("Saved 2 minutes ago") stay fresh without calling Date.now() during render. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
