# markdown2img

`markdown2img` is a CLI pipeline that converts a Markdown article into a sequence of fixed-size mobile reading cards rendered as PNG images.

The project is optimized for long-form technical/editorial writing that starts in Markdown and ends as publishable image pages for mobile-first platforms.

## Current product shape

The current renderer produces:
- a **summary-led cover page**
- a sequence of **content pages at `1080×1800`**
- deterministic PNG output in either a timestamped directory or a fixed output directory
- browser-measured pagination using Playwright + Chromium

The visual system is currently a warm, light, editorial reading theme with:
- serif-forward body typography
- a calm paper-like background
- a quote-style cover built from `cover_summary`
- a small signature block with avatar / author / date

---

## Quick start

### Requirements
- Node.js
- npm
- Playwright Chromium runtime

### Install

```bash
npm install
npx playwright install chromium
```

### Build

```bash
npm run build
```

`npm run build` uses `tsup` to compile the TypeScript CLI into `dist/cli.js` and copy required runtime assets into `dist/`.

### Run

```bash
node dist/cli.js article.md -o ./output
```

### Common workflow-oriented CLI flags

```bash
# Directly overwrite a fixed publish directory
node dist/cli.js article.md --output-dir ./publish --overwrite

# Override cover/identity metadata without editing the source markdown
node dist/cli.js article.md \
  --cover-summary "Override summary" \
  --author-name "AI工程Tay" \
  --avatar-path ./assets/avatar.png \
  --date 2026-04-19

# Render only the cover and print machine-readable JSON
node dist/cli.js article.md --cover-only --json --output-dir ./preview --overwrite
```

Supported runtime override flags:
- `--cover-summary <text>`
- `--author-name <text>`
- `--avatar-path <path>`
- `--date <text>`
- `--output-dir <dir>`
- `--overwrite`
- `--cover-only`
- `--json`

### Workflow recipes

#### 1. Normal timestamped render for local review

```bash
node dist/cli.js article.md -o ./output
```

Use this when you want each render preserved in its own timestamped directory.

#### 2. Overwrite a fixed publish directory

```bash
node dist/cli.js article.md --output-dir ./publish --overwrite
```

Use this when another tool or platform already watches a stable folder like `./publish/001.png`, `./publish/002.png`, ...

#### 3. Iterate only on cover copy and identity

```bash
node dist/cli.js article.md \
  --cover-summary "真正让高能力 Agent 在生产环境里失效的，往往不是模型，而是上下文污染、工具背压和观测断裂。" \
  --author-name "AI工程Tay" \
  --avatar-path ./assets/avatar.png \
  --date 2026-04-19 \
  --cover-only \
  --output-dir ./cover-preview \
  --overwrite
```

Use this when you want fast editorial iteration on the cover without rerendering body pages.

#### 4. Run from automation and parse machine-readable output

```bash
node dist/cli.js article.md \
  --output-dir ./render-out \
  --overwrite \
  --json
```

Use this when an agent, shell script, or CI step needs stable stdout JSON and can read progress logs from stderr.

#### 5. Override metadata for one run without editing frontmatter

```bash
node dist/cli.js article.md \
  --author-name "AI工程Tay" \
  --avatar-path ./assets/avatar.png \
  --date 2026-04-19 \
  --cover-summary "Override summary"
```

Use this when the source Markdown should stay untouched but the exported cards need run-specific cover/identity data.

Execution model note:
- the repo workflow is **build first, then run the built CLI**
- `node dist/cli.js ...` runs the last built artifact; it does **not** live-compile TypeScript on each invocation
- if you change source files, run `npm run build` again before rerunning the CLI

Or during development / after install:

```bash
npx markdown2img article.md -o ./output
```

The package bin also points at `./dist/cli.js`, so this is still a built-artifact workflow rather than realtime TypeScript execution.

---

## Agent skill

The repo now includes a portable agent skill here:

- `skills/markdown2img-editorial-rendering/SKILL.md`

### What this skill is for

This skill teaches an agent:
- **when** to use `markdown2img`
- **which files** to edit for cover/body/pagination/image/doc work
- **which commands** to run for build/render/test
- **how to validate output well** with real PNG visual QA
- **what pitfalls** to avoid based on the actual iteration history

It is meant for agents working on this repo/tool, not for generic Markdown rendering tasks.

### Installation / use by agent runtime

#### Hermes
Install by copying or symlinking the skill folder into Hermes' skills tree.

Run these commands from the `markdown2img` repo root.

```bash
mkdir -p ~/.hermes/skills/software-development
ln -s "$(pwd)/skills/markdown2img-editorial-rendering" \
  ~/.hermes/skills/software-development/markdown2img-editorial-rendering
```

Or copy instead of symlink:

```bash
mkdir -p ~/.hermes/skills/software-development
cp -R ./skills/markdown2img-editorial-rendering \
  ~/.hermes/skills/software-development/markdown2img-editorial-rendering
```

Then load/use the skill by name:
- `software-development/markdown2img-editorial-rendering`

#### Claude Code
Claude Code does not share Hermes' native skill loader, so the repo copy should be used as a **project skill/instruction file**.

Recommended approach:
- keep the repo file at `skills/markdown2img-editorial-rendering/SKILL.md`
- attach/load that file in the Claude Code session when working on this repo
- or copy/symlink the same folder into whatever local skill/prompt library your Claude Code setup uses

Minimum portable install target:
- install object = `skills/markdown2img-editorial-rendering/`
- primary file = `skills/markdown2img-editorial-rendering/SKILL.md`

#### Codex
Codex also treats this best as a **repo-local reusable instruction/skill file** unless your wrapper provides a native skills directory.

Recommended approach:
- point Codex at `skills/markdown2img-editorial-rendering/SKILL.md` when working on this repo
- or copy/symlink the folder into your Codex wrapper's prompt/skills library if your setup supports file-based reusable skills

Minimum portable install target:
- install object = `skills/markdown2img-editorial-rendering/`
- primary file = `skills/markdown2img-editorial-rendering/SKILL.md`

#### OpenClaw
For OpenClaw, install the same portable skill folder into the skills area used by your OpenClaw setup, or reference the repo-local file directly if your OpenClaw workflow supports repo-contained skills.

Portable install object:
- `skills/markdown2img-editorial-rendering/`

Portable primary file:
- `skills/markdown2img-editorial-rendering/SKILL.md`

If your OpenClaw instance mirrors Hermes-style skill loading, keep the same category path:
- `software-development/markdown2img-editorial-rendering`

### Recommendation

For this repo, the safest long-term pattern is:
- keep the canonical version in-repo at `skills/markdown2img-editorial-rendering/SKILL.md`
- symlink/copy it into Hermes/OpenClaw skill libraries when needed
- for Claude Code and Codex, load the same repo file as reusable project instruction context

This keeps one source of truth while still allowing different agent runtimes to consume it.

---

## What the pipeline does

```text
Parse -> Validate -> Normalize -> Render HTML -> Measure -> Paginate -> Cover Screenshot -> Content Screenshots
```

At a high level:
1. parse Markdown + YAML frontmatter
2. validate metadata and local assets
3. normalize Markdown into renderable block objects
4. render one tall HTML article document
5. measure real browser layout in Chromium
6. compute page breaks from measured block geometry
7. render a dedicated summary-led cover page
8. clip screenshots for each content page

This design avoids guessing layout in Node.js and keeps output stable across repeated runs on the same machine/runtime.

---

## Frontmatter

### Recommended fields

```md
---
title: 为什么 Agent 基础设施会在第 100 个工作流开始失效
author_name: AI工程Tay
date: 2026-04-18
avatar_path: ./assets/avatar.png
cover_summary: Demo 阶段好用的 Agent，往往在真实流量里先败给上下文污染、工具背压、检索失真和观测断裂，而不是先败给模型智力。
theme: default
---
```

### Supported metadata
- `title`
- `author_name`
- `avatar_path`
- `date`
- `theme`
- `cover_summary`
- `summary` — accepted as an alias source for cover summary derivation
- `cover_image` — currently validated if supplied, but the active cover design is **summary-led**, not image-led

### Current cover behavior
- the cover is generated even without `cover_image`
- CLI `--cover-summary` overrides frontmatter-derived cover summary when provided
- `cover_summary` is preferred when provided
- if `cover_summary` is missing, the validator derives one from:
  1. `summary`
  2. the first meaningful paragraph
  3. the title
- cover summary text is normalized and length-limited before rendering

### Current metadata fallback behavior
- CLI `--author-name`, `--avatar-path`, and `--date` override frontmatter when supplied
- if `avatar_path` is omitted, the pipeline uses the bundled default avatar
- if `author_name` is omitted or blank, validation currently falls back to a placeholder author string instead of failing hard

### Output modes
- `-o, --output <dir>` keeps the original timestamped behavior and writes into `<dir>/<timestamp>/`
- `--output-dir <dir>` writes directly into that exact directory
- `--overwrite` clears existing numbered PNGs in `--output-dir` before rendering
- `--cover-only` renders only the cover page
- `--json` prints structured result data for automation workflows

---

## Supported content blocks

`markdown2img` currently renders these block types:
- H1 / H2 / H3 headings
- paragraphs
- ordered / unordered lists
- blockquotes
- fenced code blocks
- GFM tables
- local images
- Mermaid fenced code blocks

### Inline formatting
- bold
- italic
- inline code
- standard inline links/text formatting supported by the Markdown → HTML pipeline

---

## Asset handling

### Local images
All referenced local images are resolved during validation.

Current behavior:
- missing local assets fail early with an explicit error
- article images are embedded into the rendered HTML as **base64 data URIs**, not `file://` URLs
- avatar images are also embedded for reliable browser rendering

This changed intentionally to make Chromium rendering more robust inside the `page.setContent()` pipeline.

### Mermaid
- Mermaid is bundled locally
- Mermaid diagrams are rendered in Chromium after HTML load
- Mermaid failures surface as explicit CLI errors

---

## Output

The renderer now supports two output modes:

### Timestamped mode
Used by default and by `-o, --output <dir>`.

```text
<base-dir>/YYYYMMDD-HHmmss/
  001.png
  002.png
  003.png
  ...
```

Rules:
- default base directory is the source Markdown file's directory
- `-o, --output <dir>` changes the base directory but still creates a timestamped child folder

### Fixed-directory mode
Used by `--output-dir <dir>`.

```text
<exact-output-dir>/
  001.png
  002.png
  003.png
  ...
```

Rules:
- files are written directly into the exact directory you pass
- `--overwrite` removes existing numbered PNGs (`001.png`, `002.png`, ...) in that directory before rendering
- `--overwrite` is valid only with `--output-dir`

Current output rules shared by both modes:
- every page is exactly `1080×1800`
- `001.png` is the dedicated cover page
- content pages start after the cover
- the last content page may include an `END` marker

---

## CLI

```bash
markdown2img <input> [options]
```

### Arguments
- `<input>`: source Markdown file

### Options
- `-o, --output <dir>`: output base directory for timestamped child-dir mode
- `--output-dir <dir>`: write directly into this exact output directory
- `--overwrite`: remove existing numbered PNGs in `--output-dir` before rendering
- `--cover-only`: render only the cover page
- `--author-name <text>`: override `author_name` at runtime
- `--avatar-path <path>`: override `avatar_path` at runtime
- `--date <text>`: override `date` at runtime
- `--cover-summary <text>`: override cover summary derivation at runtime
- `--json`: print machine-readable JSON to stdout and route progress logs to stderr
- `-h, --help`: help
- `-V, --version`: version

### Examples

```bash
node dist/cli.js tests/fixtures/full-article.md -o /tmp/markdown2img-check
```

```bash
node dist/cli.js article.md
```

```bash
node dist/cli.js article.md \
  --output-dir ./publish \
  --overwrite \
  --author-name "AI工程Tay" \
  --cover-summary "CLI override summary" \
  --cover-only \
  --json
```

---

## Rendering model

### One tall HTML document
The article body is rendered once as a tall HTML page.

Why this matters:
- less page-to-page layout drift
- one browser layout pass for measurement
- screenshot clipping stays consistent with measured geometry

### Browser-measured pagination
Pagination is based on actual DOM measurements collected in Playwright.

Current rules include:
- headings are not left orphaned at the bottom of a page when avoidable
- images, Mermaid blocks, and tables are treated as non-splittable blocks
- paragraphs/lists/code are measured as block units
- the system does **not** do line-level cross-page splitting inside a single paragraph or code block

### Dedicated cover rendering
The cover is rendered separately from body pages.

Current cover design characteristics:
- summary-led quote composition
- bundled Noto Serif SC for cover typography
- autosized summary text within bounded min/max sizes
- warm editorial palette
- lower-left signature block with avatar / author / date

---

## Error format

Errors are printed like this:

```text
[ERROR] <error_code>: <message>
Detail: <detail>
```

Current error codes include:
- `parse_error`
- `validation_error`
- `asset_resolution_error`
- `mermaid_render_error`
- `layout_render_error`
- `internal_exception`

Exit codes:
- success: `0`
- failure: `1`

---

## Development

### Useful commands

```bash
npm test
npm run build
npx tsc --noEmit
```

### Representative fixture

```bash
node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders
```

### Important source files
- `src/cli.ts` — CLI entrypoint
- `src/pipeline.ts` — orchestration pipeline
- `src/stages/parse.ts` — Markdown + frontmatter parsing
- `src/stages/validate.ts` — metadata derivation + asset resolution
- `src/stages/normalize.ts` — Markdown AST → content blocks
- `src/stages/render-html.ts` — body HTML generation
- `src/stages/paginate.ts` — measured block pagination
- `src/stages/screenshot.ts` — cover rendering + page screenshot logic
- `src/templates/theme-default.css` — body theme CSS

---

## Documentation

Additional docs:
- `docs/architecture.md` — system architecture and pipeline stages
- `docs/design.md` — visual/design system and current editorial principles
- `docs/technical.md` — data model, assets, runtime behavior, and implementation notes
- `IMPLEMENTATION_LOG.md` — chronological debugging and iteration log

---

## Current scope and limitations

### In scope
- one primary default theme
- local-file workflow
- deterministic PNG generation
- technical-article-friendly blocks
- summary-led editorial cover design

### Out of scope
- interactive editor / live preview UI
- remote asset fetching
- arbitrary HTML authoring
- PDF / PPT export
- user-configurable theme builder
- line-level paragraph splitting across pages
- cross-machine pixel-perfect guarantees without runtime alignment

---

## Status

The project already includes:
- unit tests for parsing, validation, normalization, rendering, and pagination
- browser-oriented smoke/e2e coverage
- realistic fixtures for images, Mermaid, and long-form technical content

If you want the implementation trail instead of the stable docs, read `IMPLEMENTATION_LOG.md`.
