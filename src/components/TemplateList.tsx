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
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Templates</h2>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center justify-center w-6 h-6 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors disabled:opacity-40"
          aria-label="Refresh templates"
          title="Refresh templates"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={refreshing ? "spin" : ""}>
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-1 px-3 pb-4">
        {templates.length === 0 ? (
          <p className="px-3 py-2 text-xs text-text-muted italic">No templates found.</p>
        ) : (
          templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className={`w-full text-left px-3 py-2.5 rounded-md transition-all ${
                selectedId === t.id
                  ? "bg-panel shadow-sm ring-1 ring-border text-accent"
                  : "text-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <div className="text-xs font-bold truncate">{t.name}</div>
              {t.about && <div className="text-[10px] opacity-70 mt-0.5 line-clamp-1">{t.about}</div>}
            </button>
          ))
        )}

        <div className="h-px bg-border/50 my-2 mx-3"></div>

        <button
          onClick={onSelectBlank}
          className={`w-full text-left px-3 py-2.5 rounded-md transition-all ${
            blankActive && selectedId === null
              ? "bg-panel shadow-sm ring-1 ring-border text-accent"
              : "text-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          <div className="text-xs font-bold">Blank issue</div>
          <div className="text-[10px] opacity-70 mt-0.5">Start from scratch</div>
        </button>
      </div>

      {loadedAt && (
        <div className="px-6 py-3 border-t border-border-light bg-sidebar/30">
          <p className="text-[10px] font-medium text-text-muted">Synced {formatTimeAgo(now - loadedAt)}</p>
        </div>
      )}
    </div>
  )
}
