import assert from "node:assert/strict"
import { test } from "node:test"
import { parseFrontmatter, parseMarkdownTemplate } from "../src/lib/templates"

test("parseFrontmatter trims a plain body", () => {
  assert.deepEqual(parseFrontmatter("\n  Raw notes  \n"), {
    frontmatter: {},
    body: "Raw notes",
  })
})

test("parseFrontmatter reads quoted scalar values", () => {
  const raw = '---\nname: "Bug report"\nabout: Something broke\nlabels: bug\n---\n\n## Steps'
  const { frontmatter, body } = parseFrontmatter(raw)

  assert.deepEqual(frontmatter, {
    name: "Bug report",
    about: "Something broke",
    labels: "bug",
  })
  assert.equal(body, "## Steps")
})

test("parseMarkdownTemplate returns null without a name", () => {
  assert.equal(parseMarkdownTemplate("---\nabout: No name\n---\nBody", "bug.md"), null)
  assert.equal(parseMarkdownTemplate("Random notes", "bug.md"), null)
})

test("parseMarkdownTemplate parses labels and keeps the filename as id", () => {
  const raw = '---\nname: Bug\nabout: Report a bug\nlabels: ["bug", "triage", ]\n---\n\n## Summary\nDetails'
  const template = parseMarkdownTemplate(raw, "bug.md")

  assert.deepEqual(template, {
    id: "bug.md",
    name: "Bug",
    about: "Report a bug",
    body: "## Summary\nDetails",
    labels: ["bug", "triage"],
  })
})

test("parseMarkdownTemplate defaults about and labels", () => {
  assert.deepEqual(parseMarkdownTemplate("---\nname: Blank\n---\nBody", "blank.md"), {
    id: "blank.md",
    name: "Blank",
    about: "",
    body: "Body",
    labels: [],
  })
})
