import assert from "node:assert/strict"
import { afterEach, beforeEach, test } from "node:test"
import { createIssue, loadTemplates } from "../src/lib/github"
import { resetEnv, setStoredValue } from "./env"

const originalFetch = globalThis.fetch

interface FetchCall {
  url: string
  init?: RequestInit
}

let calls: FetchCall[] = []

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  })
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

beforeEach(() => {
  resetEnv()
  setStoredValue("intakepad:github_token", "ghp_test")
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

test("loadTemplates reads and parses Markdown templates", async () => {
  respondWith(
    jsonResponse([
      { name: "bug.md", path: ".github/ISSUE_TEMPLATE/bug.md", type: "file", download_url: "x" },
      { name: "config.yml", path: ".github/ISSUE_TEMPLATE/config.yml", type: "file", download_url: "x" },
      { name: "README.md", path: ".github/ISSUE_TEMPLATE/README.md", type: "file", download_url: "x" },
      { name: "nested", path: ".github/ISSUE_TEMPLATE/nested", type: "dir", download_url: null },
    ]),
    new Response('---\nname: Bug\nlabels: ["bug", "triage"]\n---\n\n## Summary', { status: 200 }),
    new Response("No frontmatter here", { status: 200 }),
  )

  const templates = await loadTemplates("acme", "api")

  assert.deepEqual(templates, [{
    id: "bug.md",
    name: "Bug",
    about: "",
    body: "## Summary",
    labels: ["bug", "triage"],
  }])
  assert.equal(calls.length, 3)
  assert.equal(calls[0].url, "https://api.github.com/repos/acme/api/contents/.github/ISSUE_TEMPLATE")
  const dirHeaders = calls[0].init?.headers as Record<string, string>
  assert.equal(dirHeaders.Accept, "application/vnd.github.v3+json")
  assert.equal(dirHeaders.Authorization, "Bearer ghp_test")
  assert.equal(calls[1].url, "https://api.github.com/repos/acme/api/contents/.github/ISSUE_TEMPLATE/bug.md")
  const fileHeaders = calls[1].init?.headers as Record<string, string>
  assert.equal(fileHeaders.Accept, "application/vnd.github.v3.raw")
})

test("loadTemplates returns an empty list for non-array or invalid directory data", async () => {
  respondWith(new Response("not json", { status: 200 }))
  assert.deepEqual(await loadTemplates("acme", "api"), [])
  assert.equal(calls.length, 1)

  respondWith(jsonResponse({ message: "unexpected" }))
  assert.deepEqual(await loadTemplates("acme", "api"), [])
})

test("loadTemplates maps GitHub directory errors", async () => {
  respondWith(jsonResponse({}, 404))
  await assert.rejects(loadTemplates("acme", "api"), /Repository not found or no template directory/)

  respondWith(jsonResponse({}, 403))
  await assert.rejects(loadTemplates("acme", "api"), /Rate limited\. Try again later or authenticate\./)

  respondWith(jsonResponse({}, 500))
  await assert.rejects(loadTemplates("acme", "api"), /GitHub API error: 500/)
})

test("createIssue posts the draft with labels only when present", async () => {
  const issue = { number: 42, html_url: "https://github.com/acme/api/issues/42" }
  respondWith(jsonResponse(issue), jsonResponse({ ...issue, number: 43 }))

  assert.deepEqual(await createIssue("acme", "api", "Title", "Body"), issue)
  assert.equal(calls[0].url, "https://api.github.com/repos/acme/api/issues")
  assert.equal(calls[0].init?.method, "POST")
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { title: "Title", body: "Body" })

  await createIssue("acme", "api", "Title", "Body", ["bug", "triage"])
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), {
    title: "Title",
    body: "Body",
    labels: ["bug", "triage"],
  })
  const headers = calls[0].init?.headers as Record<string, string>
  assert.equal(headers.Authorization, "Bearer ghp_test")
})

test("createIssue maps API errors", async () => {
  respondWith(jsonResponse({}, 401))
  await assert.rejects(createIssue("acme", "api", "Title", "Body"), /Authentication required/)

  respondWith(jsonResponse({}, 403))
  await assert.rejects(createIssue("acme", "api", "Title", "Body"), /You don't have permission/)

  respondWith(jsonResponse({}, 404))
  await assert.rejects(createIssue("acme", "api", "Title", "Body"), /Repository not found\./)

  respondWith(jsonResponse({}, 500))
  await assert.rejects(createIssue("acme", "api", "Title", "Body"), /Failed to create issue: 500/)
})
