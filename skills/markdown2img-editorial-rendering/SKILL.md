---
name: markdown2img-editorial-rendering
description: Use the markdown2img CLI/repo to turn Markdown articles into mobile editorial reading-card PNGs, especially when iterating on cover/body typography, pagination, images, or docs.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [markdown2img, rendering, playwright, editorial-design, markdown, png, pagination]
---

# markdown2img editorial rendering

Use this skill when the task involves the `markdown2img` repository.

Run all repo commands from the `markdown2img` repository root.

In-repo skill path:

`skills/markdown2img-editorial-rendering/SKILL.md`

This skill is for **using and iterating on this tool**, not for generic Markdown rendering elsewhere.

## When to use

Use this skill if the user wants to:
- render a Markdown article to image pages
- inspect or improve the cover design
- tune body typography, hierarchy, pagination, or reading comfort
- debug missing images, cover rendering, or Mermaid behavior
- update docs/readme/architecture/design/technical docs for this tool
- validate changes with real rendered PNG output

Typical requests:
- “看一下渲染效果”
- “cover 再调一下”
- “正文排版优化一下”
- “为什么图片没显示”
- “把这个工具的用法整理一下”

## When NOT to use

Do not use this skill for:
- generic README/doc writing unrelated to markdown2img
- unrelated Playwright/browser automation tasks
- arbitrary design critique without touching this repo/tool
- other Markdown renderers

---

## Current product reality you must remember

Do **not** rely on older assumptions. Current confirmed behavior:
- page size is **1080×1800**, not 1080×1440
- the cover is **summary-led**, not image-led title-cover by default
- body/article images are embedded as **base64 data URIs**, not `file://` URLs
- the cover uses bundled **Noto Serif SC** via `@font-face`
- output is a timestamped directory of PNG files
- visual QA on rendered PNGs is part of correctness

Key docs to check before major work:
- `README.md`
- `docs/architecture.md`
- `docs/design.md`
- `docs/technical.md`
- `IMPLEMENTATION_LOG.md`

---

## Repository map

Important files:
- `src/cli.ts` — CLI entrypoint
- `src/pipeline.ts` — orchestration
- `src/stages/parse.ts` — Markdown/frontmatter parsing
- `src/stages/validate.ts` — metadata derivation + asset resolution
- `src/stages/normalize.ts` — AST to content blocks
- `src/stages/render-html.ts` — body HTML rendering
- `src/stages/paginate.ts` — measured pagination
- `src/stages/screenshot.ts` — cover rendering + screenshot logic
- `src/templates/theme-default.css` — body theme styling
- `tests/fixtures/with-images/facebook-engineering-style-8-pages.md` — representative long-form fixture

Useful output dir pattern:
- `/tmp/markdown2img-renders/<timestamp>/`

---

## Standard workflow

### 1. Inspect before editing

Always inspect the current state first.

Recommended checks:
```bash
git status --short
```

Read docs or source as needed, especially if the request concerns:
- current visual direction
- current cover behavior
- image handling
- page-size assumptions

### 2. Make the smallest meaningful change

For renderer/design work, change the specific layer that owns the behavior:
- cover composition / quote / summary / signature → `src/stages/screenshot.ts`
- body typography / H1-H3 / lists / tables / general page theme → `src/templates/theme-default.css`
- body HTML structure / block-role logic / Mermaid config → `src/stages/render-html.ts`
- summary derivation / avatar fallback / metadata rules → `src/stages/validate.ts`
- image transport / content block generation → `src/stages/normalize.ts`
- page-break logic / clipping behavior → `src/stages/paginate.ts`

### 3. Rebuild

After code changes:
```bash
npm run build
```

### 4. Render a representative fixture

Preferred regression/preview command:
```bash
node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders
```

This fixture is the default visual QA target because it exercises:
- summary-led cover
- mixed Chinese/English typography
- long-form structure
- local images
- technical/article tone

### 5. Inspect actual PNG output

Do not stop at build success.

You must inspect the rendered PNGs, especially:
- `001.png` for cover changes
- first body page for title/body rhythm
- a middle page for grouping and pagination quality
- the last page for END-marker / clipping behavior

### 6. Log meaningful changes

When a change is real and user-visible, append the result to:
- `IMPLEMENTATION_LOG.md`

Include:
- what changed
- why it changed
- verification command(s)
- output directory or notable result

### 7. Commit when asked or when finishing an approved batch

Typical pattern:
```bash
git add <files>
git commit -m "feat(rendering): ..."
```

---

## How to use the tool well

### Prefer representative fixtures over toy files

Best default fixture:
```bash
node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders
```

Use toy fixtures only for targeted regression checks.

### Treat visual QA as part of engineering

For this repo, a change is not done if:
- tests pass
- build passes
- but the PNG still looks wrong

“Looks wrong” includes:
- awkward Chinese line breaks
- broken hierarchy
- unreadable cover density
- missing/blank images
- clipped content
- mismatched typography tone

### Think in systems, not isolated knobs

Examples:
- “make cover bigger” usually means changing padding, frame width, autosize bounds, quote size, and signature scale together
- “cover text denser/lighter” is not just font size; it also involves line-height, measure, content length, and quote placement
- “body easier to read” is often grouping/hierarchy/measure, not just color or one font-size bump

### Respect the current style target

The current target is:
- warm light editorial
- trust-building
- calm
- typography-led
- technical essay

Avoid pushing it toward:
- flashy marketing creative
- generic title cover
- over-decorated heading systems
- UI-card/dashboard aesthetics

---

## High-value commands

### Build
```bash
npm run build
```

### Full fixture render
```bash
node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders
```

### Tests
```bash
npm test
```

### Type check
```bash
npx tsc --noEmit
```

### Show working tree
```bash
git status --short
```

---

## Common tasks and where to edit

### A. Cover too title-like / not editorial enough
Look at:
- `src/stages/screenshot.ts`

Likely actions:
- adjust summary frame
- adjust autosize bounds
- tweak quote mark
- change signature scale/placement
- keep summary-led structure

### B. Chinese heading wraps awkwardly
Look at:
- `src/templates/theme-default.css`

Check for:
- `text-wrap: balance`
- overly narrow width constraints
- heading size/weight mismatch

### C. Local image appears broken or blank
Check in this order:
1. does the asset actually exist?
2. is the asset itself visually valid, not a blank placeholder?
3. is the image being normalized to a base64 data URI?
4. rerender and inspect the actual PNG

### D. Cover font feels mismatched across Chinese/English
Look at:
- `src/stages/screenshot.ts`
- bundled font assets under `src/assets/fonts/`
- `tsup.config.ts` for asset copying

### E. Need to document the current state
Update:
- `README.md` for user-facing usage
- `docs/architecture.md` for pipeline/ownership
- `docs/design.md` for style principles
- `docs/technical.md` for contracts/implementation details

---

## Important pitfalls

### 1. Do not trust stale assumptions
Older repo descriptions may mention:
- 1080×1440 pages
- `file://` image loading
- image-led cover behavior

Those are stale. Verify current behavior from code/docs before acting.

### 2. Do not judge renderer correctness from tests alone
For this project, build + tests without visual inspection is incomplete.

### 3. Do not blame layout code before checking source assets
A missing-looking image may actually be:
- a blank 1×1 fixture
- a broken path
- malformed Markdown image syntax

### 4. Do not solve cover problems with font changes alone
The discussion showed that cover quality depends on:
- summary length
- measure
- line-height
- quote placement
- overall composition scale
- signature block scale

### 5. Do not forget bundled assets when introducing new runtime dependencies
If you add fonts or other runtime files, also update build-copy behavior (currently via `tsup.config.ts`).

### 6. Do not skip `IMPLEMENTATION_LOG.md` for meaningful renderer changes
This repo has gone through many iterative visual/engineering decisions. The log is part of project memory.

---

## Preferred quality bar

A solid markdown2img change should satisfy all of these:
- the code path is correct
- build passes
- relevant tests pass (or at minimum nothing obviously regressed)
- representative fixture rerenders successfully
- rendered PNGs actually look better / correct
- docs/logs stay aligned with reality when behavior changes

If any one of these is missing, the task is usually not fully done.

---

## Recommended response style when using this skill

When reporting progress:
- be concrete
- say what file changed
- say what command you ran
- give the exact output directory for new renders
- distinguish clearly between “implemented”, “verified by build/test”, and “verified visually”

That makes future collaboration on this tool much easier.
