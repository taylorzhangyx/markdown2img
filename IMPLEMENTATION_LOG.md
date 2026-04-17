# Markdown2Img Implementation Log

## 2026-04-17 20:10:03 CST

### Session start
- Working repo: `/Users/taylorzyx/workspace/github-taylorzhangyx/markdown2img`
- Remote: `git@github.com:taylorzhangyx/markdown2img.git`
- Branch: `main`
- Starting state: clean working tree, essentially empty repo (`README.md` only)

### Source documents
- PRD: `01 Inbox/dev-project/markdown2img_prd.md`
- Tech spec: `01 Inbox/dev-project/markdown2img_tech_spec_v2.md`
- Implementation plan: `01 Inbox/dev-project/markdown2img_implementation_plan.md`

### Critical constraints extracted
- Pipeline order: Parse -> Validate -> Normalize -> Render HTML -> Paginate -> Screenshot
- Use single-render + clip screenshot strategy on one Playwright page
- Use `file://` URLs for article images; avatar may use base64 data URI as an exception
- Pin Mermaid to `11.14.0`
- No line-level block splitting in v1

### Environment checks
- Node: `v25.6.1`
- npm: `11.9.0`
- Codex available: `/usr/local/bin/codex`

### Next actions
1. Break implementation plan into execution phases.
2. Scaffold the project and dependencies.
3. Implement by phase with verification after each stage.

## 2026-04-17 20:18:06 CST

### Phases 0-3 completed
- Phase 0 scaffolded the TypeScript CLI project with `package.json`, runtime/dev dependencies, Chromium install, `tsconfig.json`, `tsup.config.ts`, source/test directories, and a minimal `src/cli.ts` entrypoint.
- Phase 1 added shared pipeline types in `src/types.ts` and the `Markdown2ImgError` error system in `src/lib/error.ts`.
- Phase 2 implemented `parseArticle()` and `validateArticle()` with YAML frontmatter extraction, required `author_name` validation, frontmatter asset resolution, referenced image existence checks, and absolute-path rewriting for markdown image nodes.
- Phase 3 implemented `src/lib/image-handler.ts` and `normalizeArticle()` to emit normalized content blocks, including mermaid detection and paragraph-wrapped markdown images becoming `image` blocks with `file://` URLs.

### Tests and fixtures added
- Added markdown fixtures for: basic article, missing author, mermaid content, valid local-image article, and missing-image article.
- Added image fixture: `tests/fixtures/with-images/sample.png`.
- Added stage tests for parse, validate, and normalize coverage with `vitest`.

### Verification results
- `npm test` ✅ — 3 test files passed, 8 tests passed.
- `npm run build` ✅ — `tsup` ESM build and DTS build succeeded.
- `npx tsc --noEmit` ✅ — full typecheck succeeded.
- `node dist/cli.js --help` ✅ — CLI help rendered with `<input>` argument and `-o, --output <dir>` option.

### Open issues
- Later pipeline phases are still unimplemented: render-html, paginate, screenshot, full pipeline orchestration, and mermaid browser rendering.
- `tsup` currently builds the CLI entry only, which is sufficient for this phase range but may need expanding once library/package outputs are defined in later phases.

## 2026-04-17 20:29:15 CST

### Phases 4-6 completed
- Phase 4 added a default article theme in `src/templates/theme-default.css`, bundled local Mermaid 11.14.0 in `src/assets/mermaid.min.js`, implemented `renderHtml()` to output one tall HTML document with inline CSS/script, `data-block-index`, `data-block-type`, `file://` article images, and Mermaid `<pre class="mermaid">` blocks.
- Phase 4 also added `tests/fixtures/full-article.md` plus `tests/stages/render-html.test.ts` to cover full-article HTML generation including table, image, code, and Mermaid output.
- Phase 5 implemented filesystem helpers in `src/lib/fs-utils.ts` and Chromium helpers in `src/lib/browser.ts` with the planned launch args and 1080×1440 viewport.
- Phase 5 added `tests/stages/browser-smoke.test.ts`, which renders the generated HTML in Playwright, waits for Mermaid, writes a full-page PNG to a temp directory, and verifies the file exists with non-zero size.
- Phase 6 implemented Mermaid render waiting/error detection in `src/lib/mermaid-handler.ts`, browser block measurement plus greedy pagination in `src/stages/paginate.ts`, and pagination unit coverage in `tests/stages/paginate.test.ts` including heading orphan handling and END-marker edge cases.
- Added `remark-gfm` to the parse pipeline so markdown tables in the full-article fixture normalize/render as actual table blocks.

### Verification results
- `npx vitest run` ✅ — 6 test files passed, 16 tests passed.
- `npm run build` ✅ — `tsup` CLI build and DTS build succeeded.
- `npx tsc --noEmit` ✅ — full typecheck succeeded.

### Open issues
- `src/stages/screenshot.ts` and `src/pipeline.ts` remain stubs because they belong to later phases beyond the requested 4-6 scope.
- `tsup` still only builds the CLI entry; runtime asset copying for non-CLI packaged library entrypoints may need refinement in a later packaging phase.

## 2026-04-17 20:45:00 CST

### Phases 7-10 completed
- Phase 7 implemented `src/stages/screenshot.ts` with per-page overlay injection, first-page identity block, END marker, page scrolling plus clipped screenshots, cover-page rendering, output numbering offsets, and avatar base64 helper reuse.
- Phase 8 implemented `src/pipeline.ts` orchestration and a real `src/cli.ts` entrypoint with success/error exit codes, formatted CLI errors, and timestamped output reporting.
- Phase 8 also hardened built-runtime behavior by teaching `renderHtml()` to resolve assets from both source and bundled layouts, and updated `tsup.config.ts` to copy CSS/Mermaid assets into `dist/` so `node dist/cli.js ...` works from the repo after build.
- Phase 9 added practical error-path coverage for missing input, empty author, missing avatar, missing cover, bad mermaid, mermaid timeout / no SVG, screenshot failures, and CLI internal-exception formatting.
- Phase 10 added byte-level determinism coverage, a real `.gitignore`, a brief README, extra fixtures, and build-ready e2e CLI verification.

### Tests and fixtures added
- Added e2e tests: `tests/e2e/full-pipeline.test.ts`, `tests/e2e/cli.test.ts`, `tests/e2e/error-paths.test.ts`, and `tests/e2e/determinism.test.ts`.
- Added PNG header helper `tests/helpers/png.ts`.
- Added fixtures for empty author, bad mermaid, missing avatar, and missing cover-image cases.

### Verification results
- `npm test` ✅ — 10 test files passed, 30 tests passed.
- `npm run build` ✅ — `tsup` build succeeded and copied runtime assets into `dist/`.
- `npm exec tsc -- --noEmit` ✅ — full typecheck succeeded.
- `node dist/cli.js tests/fixtures/full-article.md -o /tmp/markdown2img-final-check` ✅ — rendered 3 PNG pages successfully.
- `node dist/cli.js nonexistent.md` ✅ — exited non-zero with `[ERROR] parse_error: ...`.
- `node dist/cli.js tests/fixtures/missing-author.md` ✅ — exited non-zero with `[ERROR] validation_error: ...`.

### Remaining open issues
- Manual visual inspection of generated PNG aesthetics is still best-effort; automated tests now cover dimensions, sequencing, determinism, cover-page generation, and core error boundaries.
- Cross-machine pixel-level determinism remains explicitly out of scope per the spec.
