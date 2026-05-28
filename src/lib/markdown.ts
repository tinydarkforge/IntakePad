import type { Template } from "./templates"

export function buildIssueBody(template: Template | null, title: string, body: string): string {
  if (!template) return body
  const cleaned = body.trim()
  if (!cleaned) return template.body
  const hasTemplateContent = template.body && cleaned !== template.body
  if (!hasTemplateContent) return cleaned
  return `## ${title}\n\n${cleaned}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 10) return "just now"
  if (seconds < 60) return `${seconds} seconds ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes === 1) return "1 minute ago"
  return `${minutes} minutes ago`
}
