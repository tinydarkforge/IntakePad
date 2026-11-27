import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { enhanceWithQueue, healthCheck, type EnhanceInput, type QueueProvider } from "../src/lib/ai"

const originalFetch = globalThis.fetch

interface FetchCall {
  url: string
  init?: RequestInit
}

let calls: FetchCall[] = []

function provider(overrides: Partial<QueueProvider> = {}): QueueProvider {
  return {
    id: "p1",
    name: "Provider 1",
    shape: "openai",
    baseUrl: "http://localhost:1234/v1/",
    model: "model-1",
    apiKey: "",
    ...overrides,
  }
}

function input(overrides: Partial<EnhanceInput> = {}): EnhanceInput {
  return { template: null, title: "Original title", body: "messy notes", repo: "acme/api", ...overrides }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function chatResponse(content: string): Response {
  return jsonResponse({ choices: [{ message: { content } }] })
}

function respondWith(...responses: Array<Response | Error>) {
  calls = []
  let index = 0
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    const next = responses[index++]
    if (next instanceof Error) throw next
    return next ?? new Response("unexpected extra request", { status: 500 })
  }) as unknown as typeof fetch
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

test("enhanceWithQueue returns the first provider's result", async () => {
  respondWith(chatResponse(JSON.stringify({
    title: "Clean title",
    body: "## Summary\nFixed",
    missingInfo: ["version"],
    changeSummary: ["Added title"],
  })))

  const result = await enhanceWithQueue(input(), [provider()])

  assert.equal(result.providerId, "p1")
  assert.equal(result.providerName, "Provider 1")
  assert.deepEqual(result.result, {
    title: "Clean title",
    body: "## Summary\nFixed",
    missingInfo: ["version"],
    changeSummary: ["Added title"],
  })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "http://localhost:1234/v1/chat/completions")
  const payload = JSON.parse(String(calls[0].init?.body)) as {
    response_format: { type: string }
    messages: { role: string }[]
  }
  assert.equal(payload.response_format.type, "json_object")
  assert.deepEqual(payload.messages.map((m) => m.role), ["system", "user"])
})

test("enhanceWithQueue unwraps fenced JSON and falls back to the original title", async () => {
  respondWith(chatResponse('```json\n{"body":"Clean body","missingInfo":"wrong type"}\n```'))

  const result = await enhanceWithQueue(input(), [provider()])

  assert.deepEqual(result.result, {
    title: "Original title",
    body: "Clean body",
    missingInfo: [],
    changeSummary: [],
  })
})

test("enhanceWithQueue falls back after a retryable error", async () => {
  respondWith(
    jsonResponse({ error: { message: "slow down" } }, 429),
    chatResponse(JSON.stringify({ title: "Second", body: "Second body" })),
  )

  const result = await enhanceWithQueue(input(), [
    provider(),
    provider({ id: "p2", name: "Provider 2" }),
  ])

  assert.equal(result.providerId, "p2")
  assert.equal(result.result.title, "Second")
  assert.equal(calls.length, 2)
})

test("enhanceWithQueue stops on an auth error", async () => {
  respondWith(
    jsonResponse({ error: { message: "bad key" } }, 401),
    chatResponse(JSON.stringify({ title: "Should not run", body: "Body" })),
  )

  await assert.rejects(
    enhanceWithQueue(input(), [
      provider(),
      provider({ id: "p2", name: "Provider 2" }),
    ]),
    /Enhancement stopped: provider "Provider 1" returned "Invalid or unauthorized API key\."/,
  )
  assert.equal(calls.length, 1)
})

test("enhanceWithQueue summarizes failures from every provider", async () => {
  respondWith(
    jsonResponse({ error: { message: "boom" } }, 500),
    jsonResponse({ error: { message: "bang" } }, 500),
  )

  await assert.rejects(
    enhanceWithQueue(input(), [
      provider(),
      provider({ id: "p2", name: "Provider 2" }),
    ]),
    /All 2 providers failed\. Last error from "Provider 2": AI provider error \(500\): bang/,
  )
  assert.equal(calls.length, 2)
})

test("enhanceWithQueue skips providers without keys or models", async () => {
  respondWith(chatResponse(JSON.stringify({ title: "Valid", body: "Body" })))

  const result = await enhanceWithQueue(input(), [
    provider({ id: "anthropic", name: "Anthropic", shape: "anthropic" }),
    provider({ id: "no-model", name: "No model", model: "" }),
    provider({ id: "valid", name: "Valid" }),
  ])

  assert.equal(result.providerId, "valid")
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "http://localhost:1234/v1/chat/completions")
})

test("enhanceWithQueue handles the Anthropic shape", async () => {
  respondWith(jsonResponse({
    content: [
      { type: "text", text: "ignore " },
      { type: "text", text: JSON.stringify({ title: "Anthropic title", body: "Anthropic body" }) },
    ],
  }))

  const result = await enhanceWithQueue(input(), [
    provider({ shape: "anthropic", apiKey: "sk-ant", baseUrl: "https://api.anthropic.com/v1" }),
  ])

  assert.equal(result.result.title, "Anthropic title")
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages")
  const init = calls[0].init as { headers: Record<string, string>; body: string }
  assert.equal(init.headers["x-api-key"], "sk-ant")
  assert.equal(init.headers["anthropic-version"], "2023-06-01")
  const payload = JSON.parse(init.body) as { system: string }
  assert.match(payload.system, /technical project coordinator/)
})

test("enhanceWithQueue requires input, providers and a model", async () => {
  respondWith()

  await assert.rejects(enhanceWithQueue(input(), []), /No AI providers configured/)
  await assert.rejects(
    enhanceWithQueue(input({ body: "   " }), [provider()]),
    /Nothing to enhance — the body is empty/,
  )
  assert.equal(calls.length, 0)
})

test("healthCheck reports reachable OpenAI-compatible endpoints", async () => {
  respondWith(jsonResponse({ data: [] }))

  assert.deepEqual(await healthCheck(provider()), {
    ok: true,
    message: "Endpoint reachable",
    detail: "Models list accessible",
  })
  assert.equal(calls[0].url, "http://localhost:1234/v1/models")
})

test("healthCheck reports auth failures", async () => {
  respondWith(jsonResponse({}, 401))

  assert.deepEqual(await healthCheck(provider({ apiKey: "bad" })), {
    ok: false,
    message: "Authentication failed",
    detail: "Check your API key",
  })
})

test("healthCheck accepts a 400 from Anthropic as a reachable endpoint", async () => {
  respondWith(jsonResponse({ error: { message: "invalid model" } }, 400))

  assert.deepEqual(await healthCheck(provider({ shape: "anthropic", apiKey: "sk-ant" })), {
    ok: true,
    message: "Endpoint reachable",
    detail: "Status 400",
  })
})

test("healthCheck requires an Anthropic key without a request", async () => {
  respondWith()

  assert.deepEqual(await healthCheck(provider({ shape: "anthropic" })), {
    ok: false,
    message: "No API key configured",
    detail: "Anthropic requires an API key",
  })
  assert.equal(calls.length, 0)
})

test("healthCheck probes the base URL when /models is missing", async () => {
  respondWith(jsonResponse({}, 404), new Response(null, { status: 200 }))

  assert.deepEqual(await healthCheck(provider()), {
    ok: false,
    message: "Models endpoint not found",
    detail: "Base URL reachable but /models missing",
  })
  assert.equal(calls[1].init?.method, "HEAD")
})
