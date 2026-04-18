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

This skill is for **using and iterating on the tool**, not for generic Markdown rendering elsewhere.

## When to use

Use this skill if the user wants to:
- render a Markdown article to image pages
- inspect or improve the cover design
- tune body typography, hierarchy, pagination, or reading comfort
- debug missing images, cover rendering, or Mermaid behavior
- update docs/readme/architecture/design/technical docs for this tool
- validate changes with real rendered PNG output

Use it especially when the user asks for things like:
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
- cover main text comes from frontmatter/content derivation, but the CLI can now override it with `--cover-summary`
- the CLI now supports dedicated runtime overrides for `cover_summary`, `author_name`, `avatar_path`, and `date`
- the CLI also supports `--output-dir`, `--overwrite`, `--cover-only`, and `--json` for publish-folder and automation workflows
- body/article images are embedded as **base64 data URIs**, not `file://` URLs
- the cover uses bundled **Noto Serif SC** via `@font-face`
- output can now be either timestamped (`-o`) or fixed-directory (`--output-dir`)
- visual QA on rendered PNGs is part of correctness

Key docs to check before major work:
- `README.md`
- `docs/architecture.md`
- `docs/design.md`
- `docs/technical.md`
- `IMPLEMENTATION_LOG.md`
- in-repo portable skill copy: `skills/markdown2img-editorial-rendering/SKILL.md`

If the repo contains a newer in-repo skill copy than the Hermes-installed copy, prefer syncing from the repo copy so agent-facing instructions stay aligned with the actual project.

For any repo-facing skill/docs/examples intended for public reuse, avoid hardcoded user-specific absolute paths. Prefer repo-relative paths, `$(pwd)`, or neutral placeholders.

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

### 3.5 Execution model

This repo does **not** live-compile TypeScript on every CLI run.

Current behavior:
- `npm run build` uses `tsup` to compile the TypeScript CLI into `dist/cli.js`
- `node dist/cli.js ...` executes that **built artifact**
- the package bin (`markdown2img`) also points at `./dist/cli.js`

Practical implication:
- after source changes, rebuild first or you will be testing stale output
- this repo's normal local workflow is **build first, then run the built CLI**
- if the user asks whether the tool is realtime-compiled, the correct answer is **no** for the current repo workflow

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

## Prefer representative fixtures over toy files

Best default fixture:
```bash
node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders
```

Use toy fixtures only for targeted regression checks.

## Treat visual QA as part of engineering

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

## Think in systems, not isolated knobs

Examples:
- “make cover bigger” usually means changing padding, frame width, autosize bounds, quote size, and signature scale together
- “cover text denser/lighter” is not just font size; it also involves line-height, measure, content length, and quote placement
- “body easier to read” is often grouping/hierarchy/measure, not just color or one font-size bump

## Respect the current style target

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

### B2. Body text feels scattered or Sino-English rhythm feels mechanical
Look at:
- `src/templates/theme-default.css`

Check in this order:
- whether body line-height is too loose for the current size/weight (for this repo, `1.8` can drift into “scattered” on long mobile pages)
- whether body paragraphs are using the sans `--font-ui` stack at a weight that feels too heavy/dense for mixed Chinese-English prose
- whether `text-align: justify` + `text-justify: inter-ideograph` is making mixed-language lines feel stretched or mechanically spaced

Important lesson from real article review:
- a page can be readable yet still feel too loose for trust-building editorial prose
- mixed Chinese/English discomfort may come more from rhythm/justification than from outright bad font selection
- restore paragraph cohesion first, then revisit font-family strategy
- if the prose still feels fluent-but-not-smooth after spacing fixes, inspect text texture mismatch: Chinese may feel denser/heavier while inline English still reads lighter/UI-like even when the font pairing is not obviously wrong
- a successful next pass can be: keep left-aligned prose, move body copy from a heavy sans stack to the serif body stack, raise body size slightly, then tighten line-height and reduce weight so the larger serif body gains warmth without drifting back into heaviness
- after that pass, the main remaining issue is often long inline English phrases drawing too much attention; solve those with measure/phrase handling before making the whole body bigger again
- if the serif body still feels too thin on phones or the inline English seems to sit slightly higher/lighter than adjacent Chinese, suspect local fallback behavior rather than only CSS sizing
- in that case, prefer a controlled bundled body font via `@font-face` in `src/stages/render-html.ts` (mirroring the cover strategy) so article prose stops depending on local `Songti SC` / `STSong` fallback differences
- for this repo's current goals, Google Fonts candidates worth considering are `Noto Serif SC` and `Noto Sans SC`; for warm editorial long-form body prose, `Noto Serif SC` is the default better fit, while `Noto Sans SC` is the fallback option if the user wants a more product-like, modern, less literary body tone
- when increasing mobile readability late in the tuning cycle, change variables in this order: (1) control the font source, (2) increase body weight slightly if prose still looks too thin on real phone screenshots, (3) only then increase body size / tweak content width / first-page top reserve, because larger body size can easily trigger new title-wrap or page-count regressions
- when the user asks for roughly one fewer Chinese character per line, the most reliable small-step move is a combined pass: nudge `--font-size-body` up by about 1px and tighten `--content-width` modestly, then visually verify title wrapping and total page count before accepting the change
- if the user says mixed Chinese/English lines still feel unlevel, the problem may be uncontrolled local serif fallbacks rather than size alone; inspect whether body prose is still relying on `Songti SC` / `STSong` / local stacks while the cover already uses a bundled controlled font
- for this repo, Google Fonts candidates worth testing for body prose are mainly `Noto Serif SC` and `Noto Sans SC`; for the current warm editorial / trust-building target, prefer `Noto Serif SC` first and treat `Noto Sans SC` as a fallback if serif warmth proves too delicate or product voice is preferred
- a high-value fix is to inject `@font-face` for the bundled `NotoSerifSC[wght].ttf` in body-page HTML (not just the cover), then point `--font-body` at that controlled family so Chinese and inline English share one stable source instead of OS-dependent fallback behavior
- once controlled `Noto Serif SC` is in place, mobile readability can usually be improved safely by nudging body weight upward and darkening body text slightly, but do not keep increasing weight indefinitely; there is a clear boundary where editorial elegance starts turning into dark, over-inked text blocks
- when a user asks for "roughly one fewer Chinese character per line", do not only increase body font size; pair a small body-size bump with a small reduction in `--content-width` so the density change is noticeable without destabilizing the whole layout

- Google Fonts research for this project converged on `Noto Serif SC` as the strongest body candidate for warm, trust-building technical/editorial prose; `Noto Sans SC` is a viable fallback only if the user wants a more product/documentation tone
- practical implementation pattern: inject a body `@font-face` in `src/stages/render-html.ts`, point it at the bundled `NotoSerifSC[wght].ttf`, update `--font-body` in `src/templates/theme-default.css` to prefer that controlled family, then slightly raise weight if the prose still feels too thin on screen
- after that pass, the main remaining issue is often long inline English phrases drawing too much attention; solve those with measure/phrase handling before making the whole body bigger again

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

### F. Regenerate a real Obsidian article and overwrite its published PNGs
Use this when the user gives you an Obsidian note path/title and says things like:
- “再生成一次，覆盖原来的 img 文件”
- “用新版样式把这篇文章重渲染一遍”
- “把 Writing 目录里的那组图替换掉”

Recommended workflow:
1. Resolve the active vault first (`obsidian-cli print-default --path-only`) instead of guessing the vault path.
2. Locate the exact source note with `search_files(target='files')` using the article title/path.
3. Inspect whether the existing exported PNGs already live next to the note or in the intended target directory. Do not assume their location.
4. If the target is a known publish directory, prefer `--output-dir <target> --overwrite` for direct in-place regeneration.
5. If the target is uncertain or risky, render to a temp output base first, e.g. `/tmp/markdown2img-renders`, and capture the exact timestamped output directory.
6. Only if you used the temp-output path, replace the target `001.png`, `002.png`, ... files after the render succeeds.
7. Verify replacement by listing the numbered PNGs and checking that the expected files exist with non-zero sizes.

Why this workflow matters:
- `--output-dir` + `--overwrite` is now the native direct-overwrite path for publish-folder workflows
- rendering to temp first is still safer when the destination is ambiguous or when you want a manual review checkpoint before replacement
- users may refer to “original img files” loosely, so target discovery must happen before deletion/copying

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

### 6. Do not skip IMPLEMENTATION_LOG.md for meaningful renderer changes
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

When reporting progress to the user:
- be concrete
- say what file changed
- say what command you ran
- give the exact output directory for new renders
- distinguish clearly between “implemented”, “verified by build/test”, and “verified visually”

That makes future collaboration on this tool much easier.
