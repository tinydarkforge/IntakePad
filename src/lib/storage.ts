export interface Draft {
  repo: string
  templateId: string | null
  title: string
  body: string
  updatedAt: number
}

const DRAFT_PREFIX = "intakepad:draft:"

function draftKey(repo: string, templateId: string | null): string {
  return `${DRAFT_PREFIX}${repo}:${templateId ?? "blank"}`
}

export function saveDraft(repo: string, templateId: string | null, title: string, body: string) {
  const draft: Draft = { repo, templateId, title, body, updatedAt: Date.now() }
  try {
    localStorage.setItem(draftKey(repo, templateId), JSON.stringify(draft))
  } catch {}
}

export function loadDraft(repo: string, templateId: string | null): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(repo, templateId))
    if (!raw) return null
    return JSON.parse(raw) as Draft
  } catch {
    return null
  }
}

export function removeDraft(repo: string, templateId: string | null) {
  localStorage.removeItem(draftKey(repo, templateId))
}

export function getDraftAge(repo: string, templateId: string | null): number | null {
  const draft = loadDraft(repo, templateId)
  if (!draft) return null
  return Date.now() - draft.updatedAt
}
