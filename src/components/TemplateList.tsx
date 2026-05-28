"use client"

import { formatTimeAgo } from "@/lib/markdown"
import { useNow } from "@/lib/useNow"
import type { Template } from "@/lib/templates"

interface TemplateListProps {
  templates: Template[]
  selectedId: string | null
  blankActive: boolean
  loadedAt: number | null
  refreshing: boolean
  onSelect: (template: Template) => void
  onSelectBlank: () => void
  onRefresh: () => void
}

export function TemplateList({
  templates,
  selectedId,
  blankActive,
  loadedAt,
  refreshing,
  onSelect,
  onSelectBlank,
  onRefresh,
}: TemplateListProps) {
  const now = useNow()
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Templates</h2>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center justify-center w-6 h-6 rounded text-text-muted hover:text-text hover:bg-surface-hover transition-colors disabled:opacity-40"
          aria-label="Refresh templates"
          title="Refresh templates"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={refreshing ? "spin" : ""}>
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 pb-2">
        {templates.length === 0 ? (
          <p className="px-4 py-2 text-xs text-text-muted">No templates found.</p>
        ) : (
          templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className={`w-full text-left px-4 py-2.5 transition-colors border-l-2 ${
                selectedId === t.id
                  ? "bg-accent-soft border-accent"
                  : "border-transparent hover:bg-surface-hover"
              }`}
            >
              <div className="text-sm font-medium text-text truncate">{t.name}</div>
              {t.about && <div className="text-xs text-text-muted mt-0.5 line-clamp-1">{t.about}</div>}
            </button>
          ))
        )}

        <button
          onClick={onSelectBlank}
          className={`w-full text-left px-4 py-2.5 transition-colors border-l-2 ${
            blankActive ? "bg-accent-soft border-accent" : "border-transparent hover:bg-surface-hover"
          }`}
        >
          <div className="text-sm font-medium text-text">Blank issue</div>
          <div className="text-xs text-text-muted mt-0.5">Start from scratch</div>
        </button>
      </div>

      {loadedAt && (
        <div className="px-4 py-2 border-t border-border-light">
          <p className="text-xs text-text-muted">Loaded {formatTimeAgo(now - loadedAt)}</p>
        </div>
      )}
    </div>
  )
}
