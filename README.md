<div align="center">

# IntakePad

**Messy notes in. Clean GitHub issue out.**

Turn Slack threads, bug reports, meeting notes, and rough ideas into well-structured GitHub issues — in under a minute. Browser-native, no install, no terminal, no backend.

[**→ Open IntakePad**](https://tinydarkforge.github.io/IntakePad/)

</div>

---

## What it does

Paste unstructured text, optionally clean it up with AI, review, then create the issue on GitHub or copy the Markdown. It reads a repository's own `.github/ISSUE_TEMPLATE/` files so the output matches how the team already files issues.

- **Templates from the repo** — loads real issue templates via the GitHub API.
- **AI enhancement with provider queue** — configure multiple AI providers. IntakePad tries them in priority order and falls back automatically. Supports local models, free tiers, and cloud providers.
- **Review before anything ships** — see what the AI changed, what's missing, undo in one click. Nothing is auto-submitted.
- **Create or copy** — push straight to GitHub, or copy Markdown as a fallback.
- **Local drafts** — autosaved per repo + template, restored on return.
- **Light / dark** — themed, no flash on load.
- **Markdown preview**, **keyboard shortcuts**, **copy-only mode** (no repo needed).

---

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000

```bash
npm run build   # static export → ./out
npm run lint
```

---

## Setup

Everything is configured in **Settings** (top-right). Nothing is required to browse public-repo templates or use copy-only mode.

### 1. Create GitHub issues (optional)

1. Settings → **Personal Access Token**
2. Create a [classic PAT](https://github.com/settings/tokens/new?scopes=public_repo&description=IntakePad) with **`public_repo`** scope
3. Paste it, set your `owner/repo`, **Save**

> Auth is PAT-based (not OAuth). Because IntakePad is a static site with no backend, a PAT is the simplest token the browser can use to call the GitHub REST API directly.

### 2. AI enhancement (optional)

1. Settings → **AI enhancement**
2. Enable providers you want to use. Local presets (Ollama, LM Studio) are enabled by default — they work on your machine with no API key.
3. For cloud providers (Anthropic, OpenAI, OpenRouter, Groq): fill in the API key.
4. Drag or use ↑/↓ buttons to reorder by priority.
5. Use **Health check** per provider to verify the endpoint is reachable and CORS allows browser use.
6. **Save**

> The queue tries each enabled provider in order. If one fails (timeout, rate limit, CORS error, etc.), the next provider is tried automatically.

### Default provider order

| Priority | Provider | Type | Key needed | Note |
|----------|----------|------|------------|------|
| 1 | Local (Ollama) | local | No | Privacy-first, works offline |
| 2 | Local (LM Studio) | local | No | Privacy-first, works offline |
| 3 | Anthropic | cloud | Yes | |
| 4 | OpenAI | cloud | Yes | |
| 5 | OpenRouter | cloud | Yes | Free tier models available |
| 6 | Groq | cloud | Yes | Free tier available |

---

## Provider queue: how it works

When you click **Enhance**, IntakePad:

1. Walks your enabled providers in order.
2. Tries the first one with your input.
3. If it succeeds → applies the result and records which provider was used.
4. If it fails with a **retryable error** (timeout, rate limit, CORS/network failure, empty response, bad JSON, transient 5xx) → tries the next provider.
5. If it fails with a **fatal error** (401/403, unsupported shape) → stops immediately with a clear message.
6. If all providers fail → preserves the original draft and shows a summary of the last error.

The successful provider name is shown in the review bar so you know which backend handled your draft.

---

## Browser CORS limits for local providers

AI providers are called directly from your browser (no backend). This means:

- **Local endpoints** (localhost) must have **CORS enabled**. Ollama and LM Studio both require configuration to allow browser requests:
  - **Ollama**: set `OLLAMA_ORIGINS=*` or `OLLAMA_ORIGINS=https://tinydarkforge.github.io` environment variable.
  - **LM Studio**: enable CORS in Settings → Local Server → CORS.
- **HTTPS pages** calling **HTTP localhost** may be blocked by mixed-content policies. On the GitHub Pages deployment, local providers must use `http://localhost` — which works in most modern browsers but may show a console warning.
- **Cloud providers** listed in Settings have known CORS support. Custom OpenAI-compatible endpoints may not allow browser CORS — test with the Health check button.

---

## Security & privacy

**Read this before pasting a key.**

IntakePad has **no backend**. Your tokens, AI keys, and drafts are stored in your browser's **`localStorage`** and never touch a server we run.

**Not public.** Other visitors to the site cannot see your data — `localStorage` is private to your browser and origin. Keys leave your browser only when *you* act: AI keys go directly to your chosen provider on **Enhance**; the GitHub PAT goes directly to GitHub on **Load / Create**. Nowhere else.

**But not a vault.** `localStorage` is **not encrypted or sandboxed** — any JavaScript running on the page can read it. That includes:

- a malicious or compromised **browser extension**
- a poisoned **npm dependency** in the app bundle (supply chain)
- an **XSS** flaw, if one ever lands
- anyone with access to **your machine / browser profile** (a shared or public computer)

**Use safely:**

- Use a **scoped, low-limit, revocable** key — not your main full-access one.
- Cap spend on the AI key; keep the PAT at `public_repo` only.
- **Revoke** keys when you're done.
- Don't enter keys on a shared or public machine.

**Privacy by provider choice:**

- **Local providers** (Ollama, LM Studio) keep all text on your machine. No data leaves your network.
- **Cloud providers** (Anthropic, OpenAI, OpenRouter, Groq) receive pasted text directly from your browser. Check each provider's data usage policy.
- Each provider gets its own API key, stored separately in `localStorage`.

The root cause of the key-storage tradeoff is the static-site model. A small server-side proxy would keep keys off the client and add rate limiting — tracked in [#15](https://github.com/tinydarkforge/IntakePad/issues/15). Until then, browser-stored BYO keys are the accepted tradeoff.

No data is sent anywhere except GitHub and your chosen AI providers. No analytics. No tracking.

---

## Usage

1. Enter an `owner/repo` (or **Try copy-only mode**)
2. Pick a template, or **Blank issue**
3. Paste your messy notes
4. **Enhance** (if AI is on) → review changes, provider info, missing info, undo if needed
5. **Create issue** or **Copy Markdown**

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘/Ctrl + Enter` | Create issue |
| `⌘/Ctrl + E` | Enhance |
| `⌘/Ctrl + S` | Save draft |
| `⌘/Ctrl + Shift + C` | Copy Markdown |

---

## Architecture

```
src/
  app/
    page.tsx              — Main screen
    settings/page.tsx     — Settings (GitHub + AI provider queue + theme)
    layout.tsx            — Root layout, fonts, no-flash theme script
    globals.css           — Theme tokens (light/dark), markdown styles
  components/
    AppShell.tsx          — Layout, repo picker, recents, copy-only mode
    TemplateList.tsx      — Template sidebar, refresh, blank entry
    IssueEditor.tsx       — Title/body, autosave, queue-based enhance, preview, create/copy
    AiReviewBar.tsx       — Post-enhance review: provider name, changes, missing info, undo
    MarkdownPreview.tsx   — marked + DOMPurify rendered preview
    AuthButton.tsx        — Connect/disconnect (PAT)
    ThemeToggle.tsx       — Light/dark toggle
  lib/
    ai.ts                 — Queue runner, per-shape adapters, fallback policy, health checks
    github.ts             — GitHub REST: template loading, issue creation
    auth.ts               — Per-provider API keys + GitHub token storage
    settings.ts           — Provider queue, presets, migration from single-provider format
    storage.ts            — Per-repo/template draft persistence
    templates.ts          — Template types, frontmatter parser
    theme.ts              — Theme preference + no-flash init script
    markdown.ts           — Clipboard, relative-time formatting
    useNow.ts             — Ticking clock for live timestamps
```

---

## Stack

- **Next.js 16** — static export, App Router
- **TypeScript**
- **Tailwind CSS v4**
- **GitHub REST API** (v3) — direct from the browser
- **marked + DOMPurify** — Markdown preview
- **localStorage** — drafts, settings, tokens, per-provider API keys

No database. No server. No background workers. Zero operational cost.

---

## Deploy

Pushing to `main` runs the GitHub Actions workflow in `.github/workflows/` that builds the static export and publishes to GitHub Pages. `next.config.ts` sets `output: "export"`, `basePath: "/IntakePad"`, and `trailingSlash: true`.

---

## Roadmap

| Phase | What | Status |
|---|---|---|
| M0 | Layout, templates, editor, autosave, copy | ✅ Done |
| M1 | Real GitHub template loading | ✅ Done |
| M2 | Real issue creation via API | ✅ Done |
| M3 | AI enhancement with provider queue, fallback, health checks | ✅ Done |
| M4 | Hardening — tests, rate/size limits, polish | ⏳ Planned ([#6](https://github.com/tinydarkforge/IntakePad/issues/6)) |

---

<div align="center">
<sub>Messy notes in. Clean GitHub issue out.</sub>
</div>
