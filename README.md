# IntakePad

Messy notes in. Clean GitHub issue out.

Turn messy notes, Slack threads, bug reports, and rough ideas into clean GitHub issues — fast. Browser-native. No install. No terminal.

**Live:** https://tinydarkforge.github.io/IntakePad/ (after first deploy completes)

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or `/IntakePad` with basePath).

## Setup: GitHub OAuth App (required for issue creation)

IntakePad uses GitHub's [device authorization flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow) to authenticate. This works without a server — perfect for GitHub Pages.

1. Go to **Settings → Developer settings → [OAuth Apps](https://github.com/settings/developers)** (org-level: `https://github.com/organizations/{org}/settings/developers`)
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** `IntakePad`
   - **Homepage URL:** `https://tinydarkforge.github.io/IntakePad/` (or your dev URL)
   - **Authorization callback URL:** `https://tinydarkforge.github.io/IntakePad/` (the device flow doesn't use this for redirects, but GitHub requires a valid URL)
4. Click **Register application**
5. Copy the **Client ID**
6. Open `src/config.ts` and replace the placeholder:

```ts
export const GITHUB_CLIENT_ID = "your_client_id_here"
```

> **Why device flow?** IntakePad is a static site (GitHub Pages). There's no server to handle an OAuth callback. Device flow lets users authorize by entering a code at github.com/login/device — no server required, no PAT needed.

## Usage

1. Open IntakePad
2. Type an `owner/repo` and press Load
3. Select a template from the sidebar
4. Paste messy notes into the editor
5. Click **Connect GitHub** and follow the device code prompt
6. Click **Create issue** — the issue appears on GitHub

No account needed to browse templates from public repos. Auth is only required for creating issues.

## Architecture

```
src/
  config.ts              — GitHub OAuth client ID
  components/
    AppShell.tsx          — Main layout, repo input, state orchestration
    AuthButton.tsx        — GitHub device flow connect/disconnect
    IssueEditor.tsx       — Title, body, autosave, create/copy
    TemplateList.tsx      — Template sidebar
  lib/
    auth.ts              — Device flow OAuth (polling, token storage)
    github.ts            — GitHub REST API: template loading, issue creation
    markdown.ts          — Clipboard copy, time formatting
    settings.ts          — localStorage settings persistence
    storage.ts           — localStorage draft persistence
    templates.ts         — Template types, YAML frontmatter parser
  app/
    page.tsx             — Main screen
    settings/page.tsx    — Settings screen
```

## Stack

- **Next.js 16** (static export)
- **TypeScript**
- **Tailwind CSS**
- **GitHub REST API** (v3)
- **GitHub Device Flow** (OAuth)
- **localStorage** (drafts, settings, auth token)

No database. No server. No background workers. Zero operational cost.

## Deploy

Pushing to `main` triggers a GitHub Actions workflow that builds the static export and deploys to GitHub Pages. Configuration is in `.github/workflows/deploy.yml`.

## Roadmap

| Phase | What | Status |
|-------|------|--------|
| M0 | Layout, mock templates, editor, autosave | ✅ Done |
| M1 | Real GitHub template loading | ✅ Done |
| M2 | Real issue creation via API | ✅ Done |
| M3 | Optional AI enhancement | ⏳ Next |
| M4 | Hardening, tests, polish | ⏳ Planned |
