export interface Template {
  id: string
  name: string
  about: string
  body: string
}

interface Frontmatter {
  name?: string
  about?: string
  title?: string
  labels?: string
}

export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: raw.trim() }

  const yaml = match[1]
  const body = match[2].trim()
  const frontmatter: Frontmatter = {}

  for (const line of yaml.split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (kv) {
      const val = kv[2].trim().replace(/^["']|["']$/g, "")
      frontmatter[kv[1] as keyof Frontmatter] = val
    }
  }

  return { frontmatter, body }
}

export function parseMarkdownTemplate(raw: string, filename: string): Template | null {
  const { frontmatter, body } = parseFrontmatter(raw)
  if (!frontmatter.name) return null
  return {
    id: filename,
    name: frontmatter.name,
    about: frontmatter.about ?? "",
    body,
  }
}
