import type { Template } from "./templates"
import { getAuthHeaders } from "./auth"
import { parseMarkdownTemplate } from "./templates"

const GITHUB_API = "https://api.github.com"

interface GitHubContentItem {
  name: string
  path: string
  type: string
  download_url: string | null
}

interface GitHubFileContent extends GitHubContentItem {
  content: string
  encoding: string
}

async function fetchApi(url: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    ...getAuthHeaders(),
  }
  const res = await fetch(url, { headers })
  if (res.status === 404) throw new Error("Repository not found or no template directory")
  if (res.status === 403) throw new Error("Rate limited. Try again later or authenticate.")
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  return res
}

export async function loadTemplates(owner: string, repo: string): Promise<Template[]> {
  const dirUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/.github/ISSUE_TEMPLATE`
  const res = await fetchApi(dirUrl)

  if (!res.headers.get("content-type")?.includes("application/json")) {
    return []
  }

  const body = await res.text()
  let items: GitHubContentItem[]
  try {
    items = JSON.parse(body)
  } catch {
    return []
  }

  if (!Array.isArray(items)) return []

  const templateFiles = items.filter(
    (i) => i.type === "file" && (i.name.endsWith(".md") || i.name.endsWith(".MD")),
  )

  const templates: Template[] = []

  for (const file of templateFiles) {
    try {
      const contentRes = await fetch(file.download_url ?? "")
      if (!contentRes.ok) continue
      const raw = await contentRes.text()
      const parsed = parseMarkdownTemplate(raw, file.name)
      if (parsed) templates.push(parsed)
    } catch {
      continue
    }
  }

  return templates
}

export async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body: string,
): Promise<{ number: number; html_url: string }> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/issues`
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ title, body }),
  })
  if (res.status === 401) throw new Error("Authentication required. Connect your GitHub account.")
  if (res.status === 403) throw new Error("You don't have permission to create issues in this repo.")
  if (res.status === 404) throw new Error("Repository not found.")
  if (!res.ok) throw new Error(`Failed to create issue: ${res.status}`)
  return res.json()
}
