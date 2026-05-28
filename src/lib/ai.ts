import type { Template } from "./templates"
import type { AiShape } from "./settings"

export interface AiConfig {
  shape: AiShape
  baseUrl: string
  model: string
  apiKey: string
}

export interface EnhanceInput {
  template: Template | null
  title: string
  body: string
  repo: string
}

export interface EnhanceResult {
  title: string
  body: string
  missingInfo: string[]
  changeSummary: string[]
}

const TIMEOUT_MS = 30_000
const MAX_TOKENS = 2048

const SYSTEM_PROMPT = `You are a technical project coordinator. Turn messy human input (notes, Slack threads, bug reports, logs, feature ideas) into a single clean, actionable GitHub issue.

Rules:
- Preserve the user's original meaning. Preserve exact error messages, numbers, version strings, and concrete details verbatim.
- NEVER invent APIs, files, stack details, user roles, severity, or facts not present in the input. If something important is unknown, list it under missingInfo instead of guessing.
- If a template is provided, follow its section structure. Only use sections that fit the input.
- Write a concise, specific title (no "[Bug]" prefixes unless the template uses them).
- Prefer sections like Summary, Context, Steps to reproduce, Expected vs actual, Acceptance criteria — only when supported by the input.
- Keep the body under ~700 words, scannable, developer-friendly Markdown. No corporate fluff, no over-expansion of small requests, no implementation plans unless asked.
- changeSummary: short bullet strings describing what you changed (e.g. "Inferred title from the performance complaint", "Added acceptance criteria").

Respond with ONLY a JSON object, no prose, no code fences:
{"title": string, "body": string, "missingInfo": string[], "changeSummary": string[]}`

function buildUserPrompt(input: EnhanceInput): string {
  const parts: string[] = []
  parts.push(`Repository: ${input.repo || "(none)"}`)
  if (input.template) {
    parts.push(`\nSelected template "${input.template.name}":\n${input.template.body || "(empty)"}`)
  } else {
    parts.push(`\nNo template selected — produce a sensible general issue structure.`)
  }
  parts.push(`\nCurrent title: ${input.title || "(empty)"}`)
  parts.push(`\nRaw input to clean up:\n${input.body}`)
  return parts.join("\n")
}

function stripFences(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/)
  if (fenced) return fenced[1].trim()
  // Fall back to the first {...} block if the model added stray prose.
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

function coerceResult(raw: unknown, fallbackTitle: string): EnhanceResult {
  const obj = (raw ?? {}) as Record<string, unknown>
  const toStrArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  const body = typeof obj.body === "string" ? obj.body : ""
  if (!body.trim()) throw new Error("AI returned an empty body.")
  return {
    title: typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : fallbackTitle,
    body,
    missingInfo: toStrArray(obj.missingInfo),
    changeSummary: toStrArray(obj.changeSummary),
  }
}

async function postJson(url: string, headers: Record<string, string>, payload: unknown): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("AI request timed out. Try again.")
    }
    throw new Error("Could not reach the AI provider. Check the base URL and that it allows browser (CORS) requests.")
  } finally {
    clearTimeout(timer)
  }
}

function mapStatusError(status: number, detail: string): Error {
  if (status === 401 || status === 403) return new Error("Invalid or unauthorized API key.")
  if (status === 429) return new Error("Rate limited by the AI provider. Wait a moment and retry.")
  if (status === 404) return new Error("Model or endpoint not found. Check the base URL and model name.")
  return new Error(`AI provider error (${status})${detail ? `: ${detail}` : ""}`)
}

export async function enhance(input: EnhanceInput, cfg: AiConfig): Promise<EnhanceResult> {
  if (!cfg.apiKey) throw new Error("No AI API key configured. Add one in Settings.")
  if (!cfg.model) throw new Error("No AI model configured. Add one in Settings.")
  if (!input.body.trim()) throw new Error("Nothing to enhance — the body is empty.")

  const baseUrl = cfg.baseUrl.replace(/\/+$/, "")
  const userPrompt = buildUserPrompt(input)

  let text: string

  if (cfg.shape === "anthropic") {
    const res = await postJson(
      `${baseUrl}/messages`,
      {
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      {
        model: cfg.model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      },
    )
    if (!res.ok) throw mapStatusError(res.status, await safeErr(res))
    const data = await res.json()
    text = Array.isArray(data?.content)
      ? data.content.filter((b: { type?: string }) => b?.type === "text").map((b: { text?: string }) => b.text ?? "").join("")
      : ""
  } else {
    const res = await postJson(
      `${baseUrl}/chat/completions`,
      { Authorization: `Bearer ${cfg.apiKey}` },
      {
        model: cfg.model,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      },
    )
    if (!res.ok) throw mapStatusError(res.status, await safeErr(res))
    const data = await res.json()
    text = data?.choices?.[0]?.message?.content ?? ""
  }

  if (!text.trim()) throw new Error("AI returned an empty response.")

  let parsed: unknown
  try {
    parsed = JSON.parse(stripFences(text))
  } catch {
    throw new Error("Could not parse the AI response. Try again or pick a stronger model.")
  }
  return coerceResult(parsed, input.title)
}

async function safeErr(res: Response): Promise<string> {
  try {
    const data = await res.json()
    const msg = data?.error?.message ?? data?.message
    return typeof msg === "string" ? msg.slice(0, 160) : ""
  } catch {
    return ""
  }
}

export function getAiConfig(
  settings: { aiShape: AiShape; aiBaseUrl: string; aiModel: string },
  apiKey: string | null,
  defaults: Record<AiShape, { baseUrl: string }>,
): AiConfig {
  return {
    shape: settings.aiShape,
    baseUrl: settings.aiBaseUrl.trim() || defaults[settings.aiShape].baseUrl,
    model: settings.aiModel.trim(),
    apiKey: apiKey ?? "",
  }
}

export function isAiReady(
  settings: { aiEnabled: boolean; aiModel: string },
  apiKey: string | null,
): boolean {
  return settings.aiEnabled && !!apiKey && !!settings.aiModel.trim()
}
