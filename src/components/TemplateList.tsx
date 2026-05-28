"use client"

import type { Template } from "@/lib/templates"

interface TemplateListProps {
  templates: Template[]
  selectedId: string | null
  onSelect: (template: Template) => void
}

export function TemplateList({ templates, selectedId, onSelect }: TemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <p className="text-sm text-text-secondary">No issue templates found.</p>
        <p className="text-xs text-text-muted mt-1">You can still write a blank issue.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 py-2">
      <div className="px-4 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Templates
        </h2>
      </div>
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t)}
          className={`w-full text-left px-4 py-2.5 transition-colors ${
            selectedId === t.id
              ? "bg-accent/10 border-l-2 border-accent"
              : "border-l-2 border-transparent hover:bg-surface-hover"
          }`}
        >
          <div className="text-sm font-medium text-text">{t.name}</div>
          <div className="text-xs text-text-muted mt-0.5 line-clamp-1">{t.about}</div>
        </button>
      ))}
    </div>
  )
}
