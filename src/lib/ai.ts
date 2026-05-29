import type { Template } from "./templates"
import type { AiShape } from "./settings"

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

export interface QueueProvider {
  id: string
  name: string
  shape: AiShape
  baseUrl: string
  model: string
  apiKey: string
}

export interface QueueResult {
  result: EnhanceResult
  providerId: string
  providerName: string
}

export interface HealthCheckResult {
  ok: boolean
  message: string
  detail?: string
}

const TIMEOUT_MS = 30_000
const MAX_TOKENS = 2048

const SYSTEM_PROMPT = `You are a technical project coordinator. Turn messy human input (notes, Slack threads, bug reports, logs, feature ideas) into a single clean, actionable GitHub issue.

Rules:
- Preserve the user's original meaning. Preserve exact error messages, numbers, version strings, and concrete details verbatim.
- NEVER invent APIs, files, stack details, user roles, severity, or facts not present in the input. If something important is unknown, list it under missingInfo instead of guessing.
- If a template is provided, use its section headers as the REQUIRED output structure. Fill EVERY section with the most relevant content from the input. If a section has no matching content, write a helpful "[Not provided]" or ask for it in missingInfo. NEVER drop template sections.
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
  parts.push(`\nRaw input to restructure into the template sections above:\n${input.body}`)
  return parts.join("\n")
}

function stripFences(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/)
  if (fenced) return fenced[1].trim()
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

async function safeErr(res: Response): Promise<string> {
  try {
    const data = await res.json()
    const msg = data?.error?.message ?? data?.message
    return typeof msg === "string" ? msg.slice(0, 160) : ""
  } catch {
    return ""
  }
}

function isFatalError(err: Error): boolean {
  const msg = err.message
  if (msg.includes("Invalid or unauthorized")) return true
  return false
}

async function enhanceWithProvider(input: EnhanceInput, provider: QueueProvider): Promise<EnhanceResult> {
  if (!input.body.trim()) throw new Error("Nothing to enhance — the body is empty.")
  if (!provider.model) throw new Error("No AI model configured. Set a model for this provider.")

  const baseUrl = provider.baseUrl.replace(/\/+$/, "")
  const userPrompt = buildUserPrompt(input)
  let text: string

  if (provider.shape === "anthropic") {
    if (!provider.apiKey) throw new Error("Missing API key for Anthropic. Add one in Settings.")
    const res = await postJson(
      `${baseUrl}/messages`,
      {
        "x-api-key": provider.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      {
        model: provider.model,
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
    const headers: Record<string, string> = {}
    if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`
    const res = await postJson(
      `${baseUrl}/chat/completions`,
      headers,
      {
        model: provider.model,
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

export async function enhanceWithQueue(
  input: EnhanceInput,
  providers: QueueProvider[],
): Promise<QueueResult> {
  if (providers.length === 0) throw new Error("No AI providers configured. Add one in Settings.")

  const errors: { providerId: string; providerName: string; error: string }[] = []

  for (const provider of providers) {
    if (provider.shape === "anthropic" && !provider.apiKey) {
      errors.push({ providerId: provider.id, providerName: provider.name, error: "No API key configured" })
      continue
    }
    if (!provider.model) {
      errors.push({ providerId: provider.id, providerName: provider.name, error: "No model configured" })
      continue
    }

    try {
      const result = await enhanceWithProvider(input, provider)
      return { result, providerId: provider.id, providerName: provider.name }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Unknown error"
      errors.push({ providerId: provider.id, providerName: provider.name, error: errMsg })

      if (e instanceof Error && isFatalError(e)) {
        throw new Error(`Enhancement stopped: provider "${provider.name}" returned "${errMsg}"`)
      }
    }
  }

  const last = errors[errors.length - 1]
  const summary = errors.length === 1
    ? `"${last.providerName}" failed: ${last.error}`
    : `All ${errors.length} providers failed. Last error from "${last.providerName}": ${last.error}`
  throw new Error(summary)
}

export async function healthCheck(provider: QueueProvider): Promise<HealthCheckResult> {
  const baseUrl = provider.baseUrl.replace(/\/+$/, "")

  if (provider.shape === "anthropic") {
    if (!provider.apiKey) {
      return { ok: false, message: "No API key configured", detail: "Anthropic requires an API key" }
    }
    try {
      const res = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": provider.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: provider.model || "claude-haiku-4-5",
          max_tokens: 1,
          messages: [{ role: "user", content: "." }],
        }),
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok || res.status === 400) {
        return { ok: true, message: "Endpoint reachable", detail: `Status ${res.status}` }
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: "Authentication failed", detail: "Check your API key" }
      }
      return { ok: false, message: `Unexpected response (${res.status})` }
    } catch (e) {
      return {
        ok: false,
        message: "Could not reach endpoint",
        detail: e instanceof Error ? e.message : "Network error",
      }
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`

  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) {
      return { ok: true, message: "Endpoint reachable", detail: "Models list accessible" }
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "Authentication failed", detail: "Check your API key" }
    }
    if (res.status === 404) {
      try {
        await fetch(baseUrl, { method: "HEAD", signal: AbortSignal.timeout(5_000) })
        return { ok: false, message: "Models endpoint not found", detail: "Base URL reachable but /models missing" }
      } catch {
        return { ok: false, message: "Base URL unreachable", detail: "Check the URL and CORS configuration" }
      }
    }
    return { ok: false, message: `Unexpected response (${res.status})` }
  } catch (e) {
    return {
      ok: false,
      message: "Could not reach endpoint",
      detail: e instanceof Error ? e.message : "Network error",
    }
  }
}
