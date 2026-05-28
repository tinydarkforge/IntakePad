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
