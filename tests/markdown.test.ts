import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { copyToClipboard, formatTimeAgo } from "../src/lib/markdown"

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator")

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText } },
  })
}

afterEach(() => {
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator)
  else delete (globalThis as unknown as Record<string, unknown>).navigator
})

test("copyToClipboard returns true when the write succeeds", async () => {
  const written: string[] = []
  stubClipboard(async (text) => {
    written.push(text)
  })

  assert.equal(await copyToClipboard("## Issue"), true)
  assert.deepEqual(written, ["## Issue"])
})

test("copyToClipboard returns false when the write fails", async () => {
  stubClipboard(async () => {
    throw new Error("denied")
  })

  assert.equal(await copyToClipboard("## Issue"), false)
})

test("formatTimeAgo covers the second and minute boundaries", () => {
  assert.equal(formatTimeAgo(9_999), "just now")
  assert.equal(formatTimeAgo(10_000), "10 seconds ago")
  assert.equal(formatTimeAgo(59_000), "59 seconds ago")
  assert.equal(formatTimeAgo(60_000), "1 minute ago")
  assert.equal(formatTimeAgo(120_000), "2 minutes ago")
})
