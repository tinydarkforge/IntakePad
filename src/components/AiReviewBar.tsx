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
    <div className="rounded-xl border border-accent/20 bg-accent-soft overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <SparkIcon />
          <p className="text-xs font-medium text-text-secondary leading-tight">
            Enhanced with <span className="font-bold text-accent">{providerName}</span>. Review the changes below.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {changeSummary.length > 0 && (
            <button
              onClick={() => setShowChanges((s) => !s)}
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md text-text-secondary hover:bg-surface-hover transition-all"
            >
              {showChanges ? "Hide details" : "Show details"}
            </button>
          )}
          <button
            onClick={onEnhanceAgain}
            disabled={busy}
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md text-text-secondary hover:bg-surface-hover transition-all disabled:opacity-40"
          >
            Refine
          </button>
          <button
            onClick={onUndo}
            disabled={busy}
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md bg-accent text-accent-fg hover:opacity-90 transition-all disabled:opacity-40 shadow-sm shadow-accent/20"
          >
            Undo
          </button>
        </div>
      </div>

      {showChanges && changeSummary.length > 0 && (
        <div className="px-4 pb-4 pt-1 border-t border-accent/10 animate-in fade-in slide-in-from-top-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">Improvements</p>
          <ul className="space-y-1.5">
            {changeSummary.map((c, i) => (
              <li key={i} className="text-xs text-text-secondary flex gap-2 leading-relaxed">
                <span className="text-accent/50 mt-1">•</span> {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {missingInfo.length > 0 && (
        <div className="px-4 pb-4 pt-4 border-t border-accent/10 bg-accent-soft/50 animate-in fade-in slide-in-from-top-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-danger-fg mb-2">Needs your attention</p>
          <ul className="space-y-1.5">
            {missingInfo.map((m, i) => (
              <li key={i} className="text-xs text-text-secondary flex gap-2 leading-relaxed">
                <span className="text-danger-fg/50 mt-1">•</span> {m}
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
