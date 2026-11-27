import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import { loadDraft, removeDraft, saveDraft } from "../src/lib/storage"
import { resetEnv, storedKeys } from "./env"

beforeEach(resetEnv)

test("saveDraft persists a draft under its repo and template", () => {
  const before = Date.now()
  saveDraft("acme/api", "bug.md", "Title", "Body")
  const draft = loadDraft("acme/api", "bug.md")

  assert.ok(draft)
  assert.equal(draft.repo, "acme/api")
  assert.equal(draft.templateId, "bug.md")
  assert.equal(draft.title, "Title")
  assert.equal(draft.body, "Body")
  assert.ok(draft.updatedAt >= before && draft.updatedAt <= Date.now())
})

test("blank drafts use the blank key", () => {
  saveDraft("acme/api", null, "Blank title", "Blank body")

  assert.deepEqual(storedKeys(), ["intakepad:draft:acme/api:blank"])
  assert.equal(loadDraft("other/repo", null), null)
  assert.equal(loadDraft("acme/api", "bug.md"), null)
})

test("loadDraft returns null for missing and corrupted drafts", () => {
  assert.equal(loadDraft("acme/api", null), null)

  const globals = globalThis as unknown as Record<string, unknown>
  globals.localStorage = { getItem: () => "not json" }
  assert.equal(loadDraft("acme/api", null), null)
})

test("saveDraft survives storage failures", () => {
  const globals = globalThis as unknown as Record<string, unknown>
  globals.localStorage = {
    setItem() {
      throw new Error("quota exceeded")
    },
  }

  assert.doesNotThrow(() => saveDraft("acme/api", null, "Title", "Body"))
})

test("removeDraft deletes only the selected draft", () => {
  saveDraft("acme/api", "bug.md", "Bug", "Bug body")
  saveDraft("acme/api", "feature.md", "Feature", "Feature body")

  removeDraft("acme/api", "bug.md")

  assert.deepEqual(storedKeys(), ["intakepad:draft:acme/api:feature.md"])
  assert.equal(loadDraft("acme/api", "bug.md"), null)
  assert.equal(loadDraft("acme/api", "feature.md")?.title, "Feature")
})
