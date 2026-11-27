const store = new Map<string, string>()
const dispatched: string[] = []

export function resetEnv() {
  store.clear()
  dispatched.length = 0
  const globals = globalThis as unknown as Record<string, unknown>
  globals.localStorage = {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    get length() {
      return store.size
    },
  }
  globals.window = {
    dispatchEvent(event: { type: string }) {
      dispatched.push(event.type)
      return true
    },
  }
}

export function setStoredValue(key: string, value: string) {
  store.set(key, value)
}

export function storedKeys(): string[] {
  return [...store.keys()]
}

export function dispatchedEvents(): string[] {
  return [...dispatched]
}
