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
- **AI enhancement (optional, BYO key)** — one click turns messy input into a structured issue. Provider-agnostic: Anthropic or any OpenAI-compatible endpoint.
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

1. Settings → **Enable AI enhancement**
2. **Provider:** Anthropic, or *OpenAI-compatible* (OpenAI, OpenRouter, Groq, Together, local…)
3. **Base URL** — leave blank for the provider default
4. **Model** — e.g. `claude-haiku-4-5` or `gpt-4o-mini`
5. **API key** → Save

---

## 🔒 Security & privacy

**Read this before pasting a key.**

IntakePad has **no backend**. Your tokens, AI key, and drafts are stored in your browser's **`localStorage`** and never touch a server we run.

**Not public.** Other visitors to the site cannot see your data — `localStorage` is private to your browser and origin. Keys leave your browser only when *you* act: the AI key goes directly to your chosen provider on **Enhance**; the GitHub PAT goes directly to GitHub on **Load / Create**. Nowhere else.

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

The root cause is the static-site model. A small server-side proxy would keep keys off the client and add rate limiting — tracked in [#15](https://github.com/tinydarkforge/IntakePad/issues/15). Until then, browser-stored BYO keys are the accepted tradeoff.

No data is sent anywhere except GitHub and your chosen AI provider. No analytics. No tracking.

---

## Usage

1. Enter an `owner/repo` (or **Try copy-only mode**)
2. Pick a template, or **Blank issue**
3. Paste your messy notes
4. **Enhance** (if AI is on) → review changes, missing info, undo if needed
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
    settings/page.tsx     — Settings (GitHub + AI config + theme)
    layout.tsx            — Root layout, fonts, no-flash theme script
    globals.css           — Theme tokens (light/dark), markdown styles
  components/
    AppShell.tsx          — Layout, repo picker, recents, copy-only mode
    TemplateList.tsx      — Template sidebar, refresh, blank entry
    IssueEditor.tsx       — Title/body, autosave, enhance, preview, create/copy
    AiReviewBar.tsx       — Post-enhance review: undo / changes / missing info
    MarkdownPreview.tsx   — marked + DOMPurify rendered preview
    AuthButton.tsx        — Connect/disconnect (PAT)
    ThemeToggle.tsx       — Light/dark toggle
  lib/
    ai.ts                 — Provider-agnostic enhance (Anthropic + OpenAI shapes)
    github.ts             — GitHub REST: template loading, issue creation
    auth.ts               — Token + AI key storage
    settings.ts           — Settings + recent repos
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
- **localStorage** — drafts, settings, tokens

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
| M3 | Optional AI enhancement | ✅ Done |
| M4 | Hardening — tests, rate/size limits, polish | ⏳ Planned ([#6](https://github.com/tinydarkforge/IntakePad/issues/6)) |

---

<div align="center">
<sub>Messy notes in. Clean GitHub issue out.</sub>
</div>
