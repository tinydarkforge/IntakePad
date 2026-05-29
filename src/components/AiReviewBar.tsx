"use client"

import { useState } from "react"

interface AiReviewBarProps {
  missingInfo: string[]
  changeSummary: string[]
  providerName: string
  onUndo: () => void
  onEnhanceAgain: () => void
  busy: boolean
}

export function AiReviewBar({ missingInfo, changeSummary, providerName, onUndo, onEnhanceAgain, busy }: AiReviewBarProps) {
  const [showChanges, setShowChanges] = useState(false)

  return (
    <div className="rounded-md border border-accent/30 bg-accent-soft overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <p className="text-xs text-text-secondary flex items-center gap-1.5">
          <SparkIcon />
          AI enhanced this draft with <span className="font-medium text-text">{providerName}</span>.
          Review before creating.
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {changeSummary.length > 0 && (
            <button
              onClick={() => setShowChanges((s) => !s)}
              className="text-xs px-2 py-1 rounded text-text-secondary hover:bg-surface-hover transition-colors"
            >
              {showChanges ? "Hide changes" : "Show changes"}
            </button>
          )}
          <button
            onClick={onEnhanceAgain}
            disabled={busy}
            className="text-xs px-2 py-1 rounded text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-40"
          >
            Enhance again
          </button>
          <button
            onClick={onUndo}
            disabled={busy}
            className="text-xs px-2 py-1 rounded text-accent hover:bg-surface-hover transition-colors disabled:opacity-40 font-medium"
          >
            Undo
          </button>
        </div>
      </div>

      {showChanges && changeSummary.length > 0 && (
        <ul className="px-3 pb-2.5 pt-0.5 space-y-1 border-t border-accent/20">
          {changeSummary.map((c, i) => (
            <li key={i} className="text-xs text-text-secondary flex gap-1.5">
              <span className="text-text-muted">•</span> {c}
            </li>
          ))}
        </ul>
      )}

      {missingInfo.length > 0 && (
        <div className="px-3 pb-2.5 pt-2 border-t border-accent/20">
          <p className="text-xs font-medium text-text mb-1">Missing information</p>
          <ul className="space-y-1">
            {missingInfo.map((m, i) => (
              <li key={i} className="text-xs text-text-secondary flex gap-1.5">
                <span className="text-text-muted">•</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SparkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-accent" aria-hidden="true">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
    </svg>
  )
}
