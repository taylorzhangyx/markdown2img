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

## 2026-04-18 14:26:07 CST

### Cover quote and warm-text cover pass
- Reworked the cover quote treatment in `src/stages/screenshot.ts` so the opening quote now sits near the summary block's upper-left edge instead of floating alone above the text.
- Removed the cover-page title/eyebrow block entirely and kept the cover focused on quote + summary copy, with dynamic summary sizing constrained by min/max font-size bounds.
- Tuned the cover summary and byline colors toward a warmer brown-gray palette so they harmonize with the gold-brown quote accent while preserving readability and the calm editorial mood.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after the cover quote / color updates.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered the fixture to `/tmp/markdown2img-renders/20260418-142536`.
- Visual QA on `001.png` confirmed the quote now reads more like a textual opening mark than a floating ornament, and the cover text color now sits in the same warm palette family as the gold-brown quote accent.

## 2026-04-18 14:31:55 CST

### Stronger cover summary typography pass
- Increased the cover summary's typographic presence in `src/stages/screenshot.ts` by using a stronger serif stack (preferring `Source Han Serif CN SemiBold`) and a larger dynamic summary size range.
- Raised the summary's visual weight, slightly widened the text block, and enlarged the quote mark so the cover reads more like a confident long-form editorial opener while staying within the calm warm palette.
- Rebuilt before validation so the bundled CLI used the updated cover typography.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after the stronger cover typography changes.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered the fixture to `/tmp/markdown2img-renders/20260418-143129`.
- Visual QA on `001.png` confirmed the summary now appears visibly larger and stronger, the serif face feels steadier and more suitable for trust-building editorial reading, and the quote mark is larger while still coordinated with the overall layout.

## 2026-04-18 14:51:55 CST

### Iowan + stronger cover typography preview
- Updated the cover summary typography in `src/stages/screenshot.ts` to use a stronger mixed serif stack led by `Iowan Old Style` for Latin text and `Source Han Serif CN SemiBold` for Chinese, aiming for a more trustworthy, reading-oriented editorial tone.
- Increased the cover summary size/weight again, widened the cover text block slightly, and enlarged the quote mark so the cover reads with more confidence and presence.
- Rebuilt before validation so the bundled CLI rendered the latest cover typography.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after the new cover font-stack / size changes.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered the fixture to `/tmp/markdown2img-renders/20260418-145033`.
- Visual QA on `001.png` confirmed the summary is visibly larger and heavier, the mixed serif stack feels more mature and trustworthy, and the quote is larger; remaining issues now come more from text-block density than from font choice direction.

## 2026-04-18 15:01:09 CST

### Official Chinese cover font integration pass
- Rechecked the cover font mismatch and concluded the remaining disharmony came less from size and more from mixing `Iowan Old Style` with `Source Han Serif` on the same summary block.
- Switched the cover to an official bundled font from Google Fonts / Noto: downloaded `NotoSerifSC[wght].ttf` (plus the OFL license file) into `src/assets/fonts/` so the cover now uses one coherent serif family for both Chinese and inline Latin glyphs.
- Updated `src/stages/screenshot.ts` to register the bundled font via `@font-face`, use it for the cover summary and author line, and explicitly wait for `document.fonts.ready` before capturing the cover screenshot.
- Updated `tsup.config.ts` so the bundled font files are copied into `dist/assets/fonts/` during build, keeping the packaged CLI render path consistent.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after the Noto Serif SC integration.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered the fixture to `/tmp/markdown2img-renders/20260418-150006`.
- Visual QA on `001.png` confirmed the Chinese/English cover typography now feels more unified and official-looking; the main remaining issue is cover text density rather than font mismatch.

## 2026-04-18 15:25:32 CST

### Cover text-density relaxation pass
- Kept the bundled official `Noto Serif SC` cover font, but reduced the cover summary’s visual pressure by increasing line-height, slightly lowering the effective font-weight, and tightening the autosize range so the cover stops maximizing into an overly dense statement block.
- Adjusted the summary stage/frame geometry in `src/stages/screenshot.ts` to give the quote block a bit more breathing room and a calmer vertical placement while preserving the same quote-led editorial structure.
- Softened the quote mark scale/offset slightly so it stays integrated with the paragraph without feeling as heavy as the previous denser version.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after the cover density adjustments.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered the fixture to `/tmp/markdown2img-renders/20260418-152430`.
- Visual QA on `001.png` confirmed the cover now feels less dense and still trustworthy/editorial; the main remaining refinement opportunity is line-break rhythm rather than block pressure.

## 2026-04-18 15:34:01 CST

### Cover size-up pass after summary shortening
- Increased the cover summary size again in `src/stages/screenshot.ts` by nudging up the default autosized scale and min/max size range while keeping the recent density relaxation intact.
- Slightly enlarged the lower-left signature block at the same time: avatar, author name, date, and the internal spacing all grew a little so the signature feels more intentional against the larger cover text.
- Kept the same bundled `Noto Serif SC` cover font and quote-led composition, with only small quote/frame adjustments to preserve balance.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after the cover size-up pass.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered the fixture to `/tmp/markdown2img-renders/20260418-153326`.
- Visual QA on `001.png` confirmed the summary is visibly larger, the signature block is slightly larger, and no obvious layout regression was introduced.

## 2026-04-18 15:38:40 CST

### Overall cover scale-up pass
- Enlarged the cover composition as a whole in `src/stages/screenshot.ts` by reducing the outer cover padding / border inset and letting the summary frame occupy more width, instead of only scaling the text in isolation.
- Increased the cover summary autosize baseline/range again, slightly strengthened the quote mark, and nudged the signature block up one more step so the whole cover now reads larger overall rather than just "bigger text inside the same box".
- Kept the same quote-led Noto Serif SC editorial system and verified the cover still preserves sufficient breathing room.

### Verification results
- `npm run build` ✅ — rebuilt the bundled CLI after the overall cover scale-up pass.
- `node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders` ✅ — rerendered the fixture to `/tmp/markdown2img-renders/20260418-153801`.
- Visual QA on `001.png` confirmed the overall cover composition reads visibly larger while staying balanced, with no obvious crowding or regression.

## 2026-04-18 15:44:24 CST

### Documentation refresh pass
- Updated `README.md` to reflect the current product reality instead of the older 1080×1440 / `file://` / image-led-cover assumptions.
- Added `docs/architecture.md` to document the end-to-end pipeline, module responsibilities, layout constants, and runtime asset flow.
- Added `docs/design.md` to capture the current warm-light editorial design system, summary-led cover rationale, and visual review principles.
- Added `docs/technical.md` to document the runtime stack, data model, frontmatter contract, cover/body rendering behavior, and operational constraints.
- Prepared the repo for a single documentation + approved cover-iteration commit.

