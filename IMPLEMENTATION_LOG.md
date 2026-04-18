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

## 2026-04-18 00:51:00 CST

### Default author profile configured
- Added a bundled default avatar at `src/assets/default-avatar.png` and wired `tsup` to copy it into `dist/assets/`.
- `validateArticle()` now falls back to `author_name: AI 工程 Tay` when frontmatter omits or empties `author_name`.
- `validateArticle()` now also applies the bundled default avatar when `avatar_path` is omitted.
- Explicit `avatar_path` values still validate normally and still fail with `asset_resolution_error` if the file is missing.

### Regression coverage updated
- Updated stage and e2e tests to verify default author/avatar fallback behavior instead of expecting `validation_error` on missing/empty author.
- Re-ran full verification after updating pagination expectations affected by earlier clip offset changes.

### Verification results
- `npm test` ✅ — 10 test files passed, 32 tests passed.
- `npm run build` ✅ — build succeeded and now copies `default-avatar.png` into `dist/assets/`.

## 2026-04-18 10:34:09 CST

### Body hierarchy and grouping pass
- Strengthened body-page structure in `src/templates/theme-default.css` to make H2 sections read as clearer editorial modules: larger H2 scale, top rule, stronger top spacing, and tighter heading-to-opening rhythm.
- Added a more explicit H3 system with UI-font treatment, lighter color, and a short accent rule so subsection headings no longer read like ordinary bold paragraphs.
- Introduced block-role-aware styling for section openings, subsection openings, list intros, grouped list clusters, and takeaways so opening copy, example lists, and payoff paragraphs read as one coherent section instead of a flat markdown flow.
- Updated `src/stages/render-html.ts` to emit `data-block-role` metadata derived from adjacent block structure, enabling CSS-only grouping without changing pagination semantics.
- Added regression coverage in `tests/stages/render-html.test.ts` for the new structural roles and hierarchy classes.

### Verification plan
- Re-run targeted render-html tests plus the full test/build pipeline.
- Re-render the article fixture and visually inspect the updated body pages for grouped block feel, H2/H3 separation, and opener/list/takeaway relationships.

### Verification results
- `npm test -- --run tests/stages/render-html.test.ts` ✅ — 2 tests passed after adding structural-role coverage.
- `npm run build` ✅ — bundled CLI rebuilt successfully after the render/CSS pass.
- `npm test` ✅ — 10 test files passed, 35 tests passed.
- `node dist/cli.js tests/fixtures/agent-memory-design-comprehensive.md -o /tmp/markdown2img-renders` ✅ — rendered 10 PNG pages to `/tmp/markdown2img-renders/20260418-103946` for visual QA.
- Visual QA on `003.png` and `004.png` confirmed clearer grouped sections, stronger opening/list/takeaway flow, and improved H3 legibility, with remaining room to tighten heading-to-section binding further.

## 2026-04-18 10:43:00 CST

### Body density and first-page rhythm tuning
- Reduced perceived line density in `src/templates/theme-default.css` by narrowing the editorial text measure from `928px` to `864px` for heading/paragraph/list/blockquote blocks.
- Increased core body sizing slightly (`30px` body copy, `34px` section-opening lead, `31px` subsection-opening lead) so the page reads a touch larger without changing the overall system.
- Added extra separation below the first H1 block (`.block-heading-level-1`) so the opening paragraphs on body page 1 have a clearer paragraph break from the headline.

### Verification plan
- Rebuild and rerender the article fixture to confirm lower line density and better title-to-body spacing on page 2.

## 2026-04-18 10:55:00 CST

### Additional first-page readability tuning
- Tightened the editorial measure again in `src/templates/theme-default.css` from `864px` to `848px` so each body line carries fewer Chinese characters.
- Increased the base body sizing one more notch (`31px` body, `35px` section-opening lead, `32px` subsection-opening lead) to keep the page feeling slightly larger and easier to scan.
- Increased the first body page H1 separation again by moving `.block-heading-level-1` bottom margin from `22px` to `34px`.

### Verification plan
- Rebuild and rerender the article fixture and inspect `002.png` to confirm the extra breathing room under the title and the slightly larger body copy.

## 2026-04-18 11:09:00 CST

### Font-weight and column-balance pass
- Inspected locally available Chinese sans/黑体-style fonts on this machine and confirmed the best installed candidates are `Source Han Sans CN VF`, `Source Han Sans SC`, `Noto Sans CJK`, `PingFang SC`, `Hiragino Sans GB`, and `STHeiti`.
- Updated `src/templates/theme-default.css` so body paragraphs/lists/tables switch to the sans stack (preferring `Source Han Sans CN VF`) at `font-weight: 500`, giving technical long-form copy a denser, more stable reading texture than the previous thinner serif body.
- Darkened paragraph text slightly and deepened strong-emphasis color so body copy and highlighted phrases hold up better on the warm paper background.
- Centered all major content blocks and constrained wide blocks with a centered max-width so left/right whitespace no longer feels left-heavy with a large dead zone on the right.

### Verification plan
- Rebuild, rerender, and visually inspect the first body page for heavier body text, a more comfortable centered reading column, and lower left/right whitespace imbalance.

## 2026-04-18 11:15:20 CST

### Title-font and justified-edge pass
- Switched the title stack in `src/templates/theme-default.css` to prefer `Source Han Serif CN`, which is installed locally and reads more like a deliberate editorial headline face than the previous generic serif fallback.
- Softened first-page H1 presence by reducing it from `58px/600` to `54px/550` and slightly relaxing the color/letterspacing so the title remains authoritative without overpowering the body copy.
- Applied `text-align: justify` with `text-justify: inter-ideograph` to paragraph and list text so the main reading column presents cleaner left/right edges instead of a ragged right side.

### Verification plan
- Rebuild, rerender, and visually inspect the first body page for a calmer title and more even left/right text edges.

## 2026-04-18 11:31:30 CST

### Pagination cleanup and taller-page pass
- Fixed screenshot masking in `src/stages/screenshot.ts` so overlay masks use the page's full resolved background (including gradient) instead of only `backgroundColor`, which removed the stray bottom-edge bleed-through text visible on body page 2/3.
- Added a small bottom-mask overscan when capturing pages so the next block's top edge cannot peek through as a clipped sliver.
- Increased the canonical page height in `src/types.ts` and theme CSS from `1440` to `1640`, raising usable body capacity from `1280` to `1480` (`1160` to `1360` on the first body page), which gives roughly 3–4 extra lines of content per page and reduced the full article from 11 pages back down to 10.
- Updated cover rendering and pagination/CLI tests to follow the taller page size.

### Verification results
- `npm test` ✅ — 10 test files passed, 35 tests passed after updating pagination and CLI expectations.
- `node dist/cli.js tests/fixtures/agent-memory-design-comprehensive.md -o /tmp/markdown2img-renders` ✅ — rendered 10 PNG pages to `/tmp/markdown2img-renders/20260418-113112`.
- Visual QA confirmed the previous bottom-edge stray text on page `003.png` is gone, and the later section pages now start cleanly without the earlier clipped/missing-text feeling near the top.

## 2026-04-18 11:58:00 CST

### Embedded in-article image fix
- Diagnosed the in-article image failure on the latest render: the article page showed a broken-image icon plus alt text instead of the local reference image, meaning layout was fine but browser loading of the local asset inside article HTML was not.
- Updated `src/stages/normalize.ts` so article image blocks embed local images as base64 data URIs instead of `file://` URLs, matching the already-stable avatar strategy and removing dependence on browser local-file loading behavior inside `page.setContent()`.
- Updated normalize/render regression tests to assert embedded `data:image/...;base64,...` sources for in-article images.

### Verification plan
- Rerender the full representative article and visually confirm that the embedded local image displays actual content instead of a broken placeholder.

### Verification results
- `npm test -- --run tests/stages/normalize.test.ts tests/stages/render-html.test.ts` ✅ — 6 targeted tests passed after switching article images to embedded data URIs.
- `npm run build` ✅ — bundled CLI rebuilt successfully.
- `node dist/cli.js tests/fixtures/agent-memory-design-comprehensive.md -o /tmp/markdown2img-renders` ✅ — rendered 9 PNG pages to `/tmp/markdown2img-renders/20260418-121544`.
- Visual QA on `007.png` confirmed the article-embedded local image now renders actual image content instead of a broken-image placeholder plus alt text.

## 2026-04-18 12:44:47 CST

### Heading-wrap control pass
- Updated `src/templates/theme-default.css` so `text-wrap: balance` now applies only to body-page `h1`, and no longer applies to `h2`/`h3` headings.
- This change was made after diagnosing that balanced wrapping on narrow Chinese technical headings could force unnatural mid-phrase breaks despite visible whitespace remaining in the line box.
- Rebuilt the bundled CLI before validation so the rerender used the latest CSS from `dist/`.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after the CSS change.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered 8 pages to `/tmp/markdown2img-renders/20260418-124352`.
- Visual QA on `003.png` confirmed the earlier `成功 / 率高` split is gone; the heading no longer breaks inside `成功率高` after removing balanced wrapping from `h2`.
- The new wrap point moved to the title tail (`工作流稳 / 定`), which is better than the previous mid-phrase split but still indicates a follow-up typography decision may be needed if we want fully controlled Chinese heading breaks.

## 2026-04-18 13:31:09 CST

### Calm editorial heading pass
- Updated `src/templates/theme-default.css` to push H2/H3 toward a calmer, more trust-building editorial hierarchy instead of a component-like heading system.
- H2 now uses a shorter pre-title rule rather than a full-width section divider, with slightly lighter typography (`40px`, `540`) and more deliberate section spacing so chapter starts feel quieter and more typographic.
- H3 removed the left decorative rule entirely and now relies on sans-serif weight, color, and spacing alone, aiming for a more natural subsection lead that feels integrated with the prose.
- Rebuilt before validation so the rerender picked up the latest CSS changes from `dist/`.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after the H2/H3 style changes.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered the fixture to `/tmp/markdown2img-renders/20260418-132934`; page count dropped from 8 to 7 after the typography/spacing pass.
- Visual QA on `003.png` found H2 now reads calmer and more editorial, with the short rule feeling less like a system divider and more like a quiet chapter cue.
- Visual QA on `004.png` found H3 is more natural and more trustworthy without the left-side decoration, though it may still want another small reduction in visual weight if we continue refining.

## 2026-04-18 13:39:31 CST

### Removed section-opening lead styling
- Removed the enlarged `section-opening` / `subsection-opening` paragraph treatment from `src/templates/theme-default.css` after user feedback that the first paragraph under headings felt confusingly larger than the rest of the body copy.
- Kept the structural roles in HTML for future use, but the theme no longer changes paragraph size or color based on those roles; body paragraphs now stay visually uniform.
- Rebuilt before validation so the bundled CLI used the updated CSS.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after removing the section-opening lead styles.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered the fixture to `/tmp/markdown2img-renders/20260418-133857`.
- Visual QA on `007.png` confirmed the `结语` first paragraph no longer appears larger than the following paragraphs; the body copy now reads as uniform prose instead of a lead-paragraph pattern.

## 2026-04-18 13:48:59 CST

### Replaced placeholder inline image with a real test asset
- Verified the earlier `sample.png` issue was not a renderer failure but a fixture problem: the repo's old sample image was only `1×1` and effectively blank when stretched into the article image slot.
- Copied the user-provided visible JPEG from the Obsidian vault into `tests/fixtures/with-images/harness-test-image.jpeg` to use as a real inline-image fixture asset.
- Updated `tests/fixtures/with-images/facebook-engineering-style-8-pages.md` to reference `./harness-test-image.jpeg` instead of the blank `./sample.png` placeholder.
- Rebuilt before validation so the rerender used the current image embedding pipeline.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after swapping in the real test image.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered the fixture to `/tmp/markdown2img-renders/20260418-134835`.
- Visual QA on `004.png` confirmed the inline image now renders actual visible content (a warm hand-drawn scaffold/stack illustration) instead of a blank white placeholder.

## 2026-04-18 13:57:23 CST

### Removed H1 balanced wrapping
- Removed `text-wrap: balance` from body-page `h1` in `src/templates/theme-default.css` after the user reported that the remaining H1 wrapping still felt balanced/artificial.
- This change keeps H1 under the normal width constraint but lets the browser wrap it as ordinary text instead of rebalancing line lengths.
- Rebuilt before validation so the latest CSS was used by the bundled CLI.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after removing H1 balanced wrapping.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered the fixture to `/tmp/markdown2img-renders/20260418-135645`.
- Visual QA on `001.png` confirmed the first body-page H1 no longer reads like an intentionally balanced two-line title; the wrap now looks more like normal automatic line breaking.
