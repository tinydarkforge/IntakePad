import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import {
  clearProviderKey,
  clearToken,
  getAuthHeaders,
  getOldAiKey,
  getProviderKey,
  getToken,
  isAuthenticated,
  removeOldAiKey,
  setProviderKey,
  setToken,
} from "../src/lib/auth"
import { dispatchedEvents, resetEnv, storedKeys } from "./env"

beforeEach(resetEnv)

test("GitHub token round trip and auth state", () => {
  assert.equal(getToken(), null)
  assert.equal(isAuthenticated(), false)

  setToken("ghp_test")

  assert.equal(getToken(), "ghp_test")
  assert.equal(isAuthenticated(), true)
  assert.deepEqual(getAuthHeaders(), { Authorization: "Bearer ghp_test" })

  clearToken()

  assert.equal(getToken(), null)
  assert.equal(isAuthenticated(), false)
  assert.deepEqual(getAuthHeaders(), {})
})

test("token changes notify subscribers", () => {
  setToken("ghp_test")
  clearToken()

  assert.deepEqual(dispatchedEvents(), ["intakepad-auth", "intakepad-auth"])
})

test("provider keys are stored per provider", () => {
  setProviderKey("anthropic", "sk-ant")
  setProviderKey("openai", "sk-openai")

  assert.equal(getProviderKey("anthropic"), "sk-ant")
  assert.equal(getProviderKey("openai"), "sk-openai")
  assert.equal(getProviderKey("groq"), null)
  assert.deepEqual(storedKeys(), ["intakepad:ai_key:anthropic", "intakepad:ai_key:openai"])

  clearProviderKey("anthropic")

  assert.equal(getProviderKey("anthropic"), null)
  assert.equal(getProviderKey("openai"), "sk-openai")
})

test("legacy AI key uses its own storage slot", () => {
  const globals = globalThis as unknown as Record<string, unknown>
  globals.localStorage = { getItem: () => "sk-old" }
  assert.equal(getOldAiKey(), "sk-old")

  let removed: string | null = null
  globals.localStorage = {
    removeItem(key: string) {
      removed = key
    },
  }
  removeOldAiKey()
  assert.equal(removed, "intakepad:ai_key")
})

test("storage failures return null", () => {
  const globals = globalThis as unknown as Record<string, unknown>
  globals.localStorage = { getItem: () => { throw new Error("blocked") } }

  assert.equal(getToken(), null)
  assert.equal(getProviderKey("openai"), null)
  assert.equal(getOldAiKey(), null)
})
