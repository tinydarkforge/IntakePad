export interface Template {
  id: string
  name: string
  about: string
  body: string
}

export const MOCK_TEMPLATES: Template[] = [
  {
    id: "bug_report.md",
    name: "Bug report",
    about: "Report a reproducible bug",
    body: "## Summary\n\nA clear and concise description of the bug.\n\n## Steps to reproduce\n\n1. \n2. \n3. \n\n## Expected behavior\n\nWhat should happen.\n\n## Actual behavior\n\nWhat actually happens.\n\n## Environment\n\n- Browser/OS:\n- Version:\n\n## Screenshots / Logs\n\n",
  },
  {
    id: "feature_request.md",
    name: "Feature request",
    about: "Suggest a new feature or improvement",
    body: "## Problem statement\n\nWhat problem does this solve?\n\n## Proposed solution\n\nDescribe the desired behavior.\n\n## Alternatives considered\n\nWhat else have you considered?\n\n## Additional context\n\n",
  },
  {
    id: "ux_ui_request.md",
    name: "UX/UI request",
    about: "Design or usability improvement",
    body: "## Current experience\n\nWhat does the user see/do now?\n\n## Desired experience\n\nWhat should the user see/do instead?\n\n## Mockups / References\n\n",
  },
  {
    id: "research_task.md",
    name: "Research task",
    about: "Investigation, exploration, or decision research",
    body: "## Research question\n\n## Background\n\n## Approach\n\n## Expected output\n\n## Deadline\n\n",
  },
  {
    id: "backend_task.md",
    name: "Backend task",
    about: "API, data, or server-side work",
    body: "## Context\n\n## Requirements\n\n## API changes\n\n## Database changes\n\n## Testing notes\n\n",
  },
  {
    id: "frontend_task.md",
    name: "Frontend task",
    about: "UI component or client-side work",
    body: "## Context\n\n## Design references\n\n## Acceptance criteria\n\n- [ ]\n- [ ]\n- [ ]\n\n## Notes\n\n",
  },
]
