# Security Policy

## Supported versions

IntakePad is a static site: there is no installed release to patch. The `main` branch and the published GitHub Pages deployment receive security fixes.

## Reporting a vulnerability

Email **daniel.oceno@gmail.com** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Any suggested fix (optional)

**Response SLA:** 72 hours acknowledgement; fix timeline communicated in that response.

Please do not open a public GitHub issue for security vulnerabilities.

## Scope

Issues in these areas are in scope:

- Browser storage of the GitHub PAT and AI provider keys
- GitHub REST requests and issue creation
- AI provider request handling and the fallback queue
- Markdown preview rendering and sanitization
- Static export and GitHub Pages deploy workflow

Out of scope: vulnerabilities in third-party AI providers and in upstream dependencies that have no available fix.

## Threat model

IntakePad has **no backend**. Tokens, AI keys, and drafts are stored in the browser's `localStorage` and never touch a server we run. No analytics and no tracking.

Other visitors to the site cannot see your data — `localStorage` is private to your browser and origin. Keys leave the browser only when *you* act: AI keys go directly to your chosen provider on **Enhance**; the GitHub PAT goes directly to GitHub on **Load / Create**. Nowhere else.

### `localStorage` is not a vault

`localStorage` is **not encrypted or sandboxed** — any JavaScript running on the page can read it. That includes:

- a malicious or compromised **browser extension**
- a poisoned **npm dependency** in the app bundle (supply chain)
- an **XSS** flaw, if one ever lands
- anyone with access to **your machine / browser profile** (a shared or public computer)

### Use safely

- Use a **scoped, low-limit, revocable** key — not your main full-access one.
- Cap spend on the AI key; keep the PAT at `public_repo` only.
- **Revoke** keys when you're done.
- Don't enter keys on a shared or public machine.

### Data handling by provider choice

- **Local providers** (Ollama, LM Studio) keep all text on your machine. No data leaves your network.
- **Cloud providers** (Anthropic, OpenAI, OpenRouter, Groq) receive pasted text directly from your browser. Check each provider's data usage policy.
- Each provider gets its own API key, stored separately in `localStorage`.

The root cause of the key-storage tradeoff is the static-site model. A small server-side proxy would keep keys off the client and add rate limiting, but it would replace the pure GitHub Pages deploy. This was evaluated in [#15](https://github.com/tinydarkforge/IntakePad/issues/15) and deferred until real usage justifies it.
