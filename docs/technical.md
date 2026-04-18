# Technical Documentation

This document records the current technical contract of `markdown2img`.

## Runtime stack

- TypeScript
- Node.js
- Commander for CLI parsing
- Unified / remark / rehype for Markdown processing
- Playwright + Chromium for layout and screenshots
- Mermaid for diagram rendering
- tsup for bundling
- Vitest for tests

---

## File and module structure

### Entrypoints
- `src/cli.ts`
- `src/index.ts`
- `src/pipeline.ts`

### Stages
- `src/stages/parse.ts`
- `src/stages/validate.ts`
- `src/stages/normalize.ts`
- `src/stages/render-html.ts`
- `src/stages/paginate.ts`
- `src/stages/screenshot.ts`

### Shared libs
- `src/lib/error.ts`
- `src/lib/browser.ts`
- `src/lib/fs-utils.ts`
- `src/lib/image-handler.ts`
- `src/lib/mermaid-handler.ts`

### Assets/templates
- `src/templates/theme-default.css`
- `src/assets/mermaid.min.js`
- `src/assets/default-avatar.png`
- `src/assets/fonts/NotoSerifSC[wght].ttf`
- `src/assets/fonts/NotoSerifSC-OFL.txt`

---

## Data model

## ParsedArticle
Produced by parsing.

Fields:
- `frontmatter: Record<string, unknown>`
- `mdast: Root`
- `sourcePath: string`
- `sourceDir: string`

## ArticleMeta
Current normalized metadata shape:
- `title: string`
- `author_name: string`
- `avatar_path?: string`
- `date?: string`
- `theme?: string`
- `cover_image?: string`
- `cover_summary?: string`

## RuntimeMetaOverrides
Optional per-run metadata override shape:
- `authorName?: string`
- `avatarPath?: string`
- `date?: string`
- `coverSummary?: string`

These are passed from the CLI into validation so one render can override identity/cover metadata without editing frontmatter.

## PipelineOptions
Current pipeline option shape includes:
- `outputBase?: string`
- `outputDir?: string`
- `overwrite?: boolean`
- `coverOnly?: boolean`
- `json?: boolean`
- `metaOverrides?: RuntimeMetaOverrides`
- `log?: (line: string) => void`

## ValidatedArticle
Produced after metadata derivation and asset resolution.

Fields:
- `meta: ArticleMeta`
- `mdast: Root`
- `sourceDir: string`

## ContentBlock
The normalization stage currently emits one of:
- `heading`
- `paragraph`
- `list`
- `blockquote`
- `code`
- `table`
- `image`
- `mermaid`

Important detail:
- `image.fileUrl` is currently a base64 data URI, not a filesystem URL

## Pagination types
- `BlockMeasurement`
- `PageSpec`
- `PageBreakPlan`

`PageSpec` includes:
- page index
- block range
- `clipY`
- content height
- `contentBottom`
- first/last page flags
- END-marker flag
- `bodyPageNumber`
- `bodyPageCount`

---

## Current layout constants

Defined in `src/types.ts`:

```ts
PAGE_WIDTH = 1080
PAGE_HEIGHT = 1800
PAGE_PADDING = 80
USABLE_HEIGHT = 1640
FIRST_PAGE_IDENTITY = 120
FIRST_PAGE_USABLE = 1520
END_MARKER_HEIGHT = 120
END_MARKER_OFFSET = 72
```

These values affect:
- browser viewport assumptions
- clipping regions
- pagination logic
- cover and body layout
- test expectations tied to fixed output dimensions

---

## Frontmatter contract

### Accepted fields
- `title`
- `author_name`
- `avatar_path`
- `date`
- `theme`
- `cover_summary`
- `summary`
- `cover_image`

### Current derivation rules
`cover_summary` is derived in this order:
1. runtime `coverSummary` override
2. `cover_summary`
3. `summary`
4. first non-image paragraph
5. title

Summary text is normalized and truncated to bounded length.

Other metadata precedence:
- `author_name`: runtime `authorName` override → frontmatter `author_name` → placeholder fallback
- `avatar_path`: runtime `avatarPath` override → frontmatter `avatar_path` → bundled default avatar
- `date`: runtime `date` override → frontmatter `date`

### Current asset rules
- referenced local images must exist
- `avatar_path` must exist if provided
- runtime `avatarPath` follows the same source-directory-relative resolution rule as frontmatter `avatar_path`
- otherwise the default bundled avatar is used
- `cover_image` is validated if provided, even though the active cover renderer is summary-led

---

## Output contract

The renderer supports two output modes:

### Timestamped mode
- default when neither `--output-dir` nor `-o` is provided
- also used by `-o, --output <dir>`
- output directory shape: `<base-dir>/<yyyyMMdd-HHmmss>/`

### Fixed-directory mode
- enabled by `--output-dir <dir>`
- output directory shape: exactly the provided directory
- `--overwrite` removes only numbered PNGs matching `^\d{3}\.png$` before rendering
- `--overwrite` is invalid without `--output-dir`

`prepareOutputDir()` in `src/lib/fs-utils.ts` owns this contract.

---

## Body rendering contract

## HTML generation
The article body is rendered as one tall HTML document.

`render-html.ts` is responsible for:
- inlining CSS from `src/templates/theme-default.css`
- injecting body-font `@font-face` rules for bundled `Noto Serif SC`
- inlining Mermaid runtime
- converting normalized blocks into measurable DOM sections
- attaching classes/data attributes for styling and measurement

### Structural role hints
The renderer currently infers some editorial roles from block context, such as:
- `section-opening`
- `subsection-opening`
- `list-intro`
- `list-cluster`
- `takeaway`
- `takeaway-callout`

These roles are emitted as classes/data attributes so CSS can style them without changing the Markdown AST.

---

## Pagination contract

`paginate.ts` currently treats these types as non-splittable:
- `heading`
- `image`
- `mermaid`
- `table`

Behavior notes:
- headings are kept from being orphaned where possible
- END marker is appended to the last page if there is enough room
- otherwise the system may generate a dedicated final END page
- there is no line-level splitting of paragraphs/code blocks
- body pages also carry logical folio metadata (`bodyPageNumber`, `bodyPageCount`) so the screenshot overlay can render quiet page numbers independent of output filenames

---

## Cover rendering contract

The cover is rendered by `renderCoverPage()` in `src/stages/screenshot.ts`.

### Current implementation details
- dedicated HTML page, separate from article body
- bundled `Noto Serif SC` loaded with `@font-face`
- summary text auto-fit by bounded binary search over font size
- `coverReady` DOM flag used to signal completion of autosizing
- Playwright waits for `coverReady`, `document.fonts.ready`, and image completion before screenshotting

### Current visual contract
- no hero image required
- quote-led summary block
- lower-left signature block
- warm paper background and subtle inset frame

---

## Image handling

### Why base64 is used
Body images originally depended on local `file://` URLs in browser-rendered HTML.

The current system instead embeds them as base64 data URIs because this is more reliable with `page.setContent()`.

This same general approach is also used for avatar rendering.

### Supported image types
Handled by `src/lib/image-handler.ts`:
- `.png`
- `.jpg`
- `.jpeg`
- `.gif`
- `.webp`
- `.svg`

Unsupported image extensions raise `asset_resolution_error`.

---

## Mermaid rendering

Mermaid blocks are recognized when fenced code has language `mermaid`.

Technical behavior:
- Mermaid JS is bundled locally
- HTML waits for Mermaid to render in Chromium
- Mermaid theme variables are injected in the render stage
- Mermaid blocks are treated as non-splittable during pagination

---

## Error handling

The project uses a structured error type: `Markdown2ImgError`.

Current error codes include:
- `parse_error`
- `validation_error`
- `asset_resolution_error`
- `mermaid_render_error`
- `layout_render_error`
- `internal_exception`

CLI behavior:
- success exits with `0`
- failure exits with `1`
- structured errors are printed in a stable human-readable format

---

## CLI contract

Current options:
- `-o, --output <dir>`
- `--output-dir <dir>`
- `--overwrite`
- `--cover-only`
- `--author-name <text>`
- `--avatar-path <path>`
- `--date <text>`
- `--cover-summary <text>`
- `--json`
- `-h, --help`
- `-V, --version`

Validation rules currently enforced in `src/cli.ts`:
- `--output` and `--output-dir` cannot be used together
- `--overwrite` requires `--output-dir`

`--json` behavior:
- structured result JSON is written to stdout
- progress logs are routed to stderr
- on non-JSON runs, progress logs go to stdout

Current JSON result shape returned from the pipeline:
- `outputMode: 'timestamped' | 'fixed'`
- `outputDir: string`
- `files: string[]`
- `pageCount: number`
- `renderedCover: boolean`
- `renderedBody: boolean`

---

## Build and distribution

### Build command

```bash
npm run build
```

### Bundling
`tsup.config.ts` bundles the CLI and then copies runtime assets into `dist/`, including:
- theme CSS
- Mermaid runtime
- default avatar
- bundled Noto Serif SC font files

This is important because the built CLI relies on these assets at runtime.

### Execution model
The current repo workflow is **prebuild, then execute**:
- `npm run build` compiles TypeScript into `dist/cli.js`
- `node dist/cli.js ...` runs that built file
- the package bin (`markdown2img`) also points at `./dist/cli.js`

So for local development, this tool is **not** recompiling TypeScript live on every run. If source files change, the CLI must be rebuilt before the next execution.

---

## Testing expectations

Useful commands:

```bash
npm test
npm run build
npx tsc --noEmit
```

### What to verify for renderer changes
For meaningful renderer changes, technical validation should usually include:
1. build succeeds
2. tests still pass or at least impacted tests pass
3. a representative article rerenders successfully
4. the generated PNGs are visually inspected

This project is unusual in that visual QA is part of the technical validation surface.

---

## Important engineering points captured from the full discussion

### 1. Visual bugs often come from data and assets, not only from layout code
A recurring lesson was that apparently broken rendering can come from:
- blank placeholder assets
- path syntax problems
- mismatched font sources
- invalid assumptions about browser file loading

So technical debugging must inspect both rendering code and the underlying content/asset reality.

### 2. Cover quality depends on content length control as much as CSS
The cover system improved not only because of CSS/font changes, but also because the test `cover_summary` was iteratively shortened and normalized.

Technical implication:
- content contract and renderer behavior are co-designed
- cover tuning should consider both summary text and layout code

### 3. Font loading is an implementation concern, not just a design preference
Switching to an official bundled font required:
- sourcing a redistributable font
- shipping the font in source and dist
- loading it via `@font-face`
- waiting for `document.fonts.ready`

That is an engineering workflow, not just a design choice.

### 4. “Bigger” needed to be modeled as system scale, not just text size
The later cover iterations showed that making the cover feel larger required coordinated changes across:
- outer padding
- frame width
- autosize bounds
- quote mark sizing
- signature block sizing

This is a useful implementation lesson for future renderer changes: perceived scale is multi-parameter, not single-parameter.

### 5. Documentation must track the real product, not the original prototype
By the end of the iteration, some earlier docs were stale in key ways:
- page size
- asset-loading method
- cover design model
- metadata behavior

A technical lesson here is that rendering systems evolve quickly, and stale docs become operational bugs for future work.

---

## Value points

### Engineering value
The current implementation reduced a class of flaky rendering issues by embedding/bundling critical assets and by waiting on explicit browser readiness conditions.

### Workflow value
The renderer now supports a more realistic Markdown-to-publishable-cards workflow, especially for technical long-form content.

### Design-system value
Important visual decisions are now encoded in code and docs instead of living only in iterative chat feedback.

### Future-iteration value
The project now has a clearer baseline for what counts as regression:
- more reading friction
- worse Chinese wrapping
- weaker mixed-language typography
- less trustworthy cover behavior

---

## Known technical constraints

- local-file workflow only
- one main built-in theme
- no browser UI / live preview
- no remote asset fetching
- output determinism depends on aligned browser/font/runtime environment
- block-level pagination only; no fine-grained line fragmentation across pages

---

## Recommended representative fixture

For current visual and technical QA, the most useful fixture is:

```text
tests/fixtures/with-images/facebook-engineering-style-8-pages.md
```

It exercises:
- summary-led cover behavior
- mixed Chinese/English typography
- long-form technical prose
- headings/lists/code/blockquote structure
- local visible image rendering
