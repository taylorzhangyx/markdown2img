# Architecture

This document describes the current `markdown2img` system architecture.

## System overview

`markdown2img` is a single-process CLI renderer that turns one Markdown article into a sequence of PNG pages.

The architecture is intentionally linear:

```text
CLI
  -> parse
  -> validate
  -> normalize
  -> render HTML
  -> load page in Chromium
  -> measure blocks
  -> compute page breaks
  -> render cover
  -> screenshot content pages
  -> write PNG files
```

The implementation favors determinism and debuggability over configurability.

---

## High-level module map

### Entry and orchestration
- `src/cli.ts`
  - command-line interface
  - error formatting and process exit codes
- `src/pipeline.ts`
  - orchestration of the full rendering flow
  - browser/page lifecycle
  - output directory creation

### Core stages
- `src/stages/parse.ts`
  - reads source Markdown
  - parses YAML frontmatter + Markdown AST
- `src/stages/validate.ts`
  - validates and derives metadata
  - resolves local assets
  - derives `cover_summary`
  - applies default avatar fallback
- `src/stages/normalize.ts`
  - converts Markdown AST nodes into typed render blocks
  - converts local images to base64 data URIs for body rendering
- `src/stages/render-html.ts`
  - renders the article body as one tall HTML document
  - injects theme CSS and Mermaid runtime
  - annotates some block roles for more editorial styling
- `src/stages/paginate.ts`
  - measures rendered blocks in browser space
  - computes `PageSpec[]` for clipped screenshots
- `src/stages/screenshot.ts`
  - renders the dedicated cover page
  - injects page overlays for author identity and END marker
  - captures the cover and content screenshots

### Shared libraries
- `src/lib/browser.ts`
  - Playwright browser/page creation
- `src/lib/error.ts`
  - structured domain-specific error class
- `src/lib/fs-utils.ts`
  - output path helpers
- `src/lib/image-handler.ts`
  - file URL / base64 image helpers
- `src/lib/mermaid-handler.ts`
  - waits for Mermaid rendering completion

### Shared data model
- `src/types.ts`
  - parsed/validated article types
  - render block types
  - pagination structures
  - layout constants

---

## Processing pipeline

## 1. Parse

Input:
- Markdown file path

Output:
- `ParsedArticle`

Responsibilities:
- read source file
- separate YAML frontmatter from body
- build mdast tree
- preserve source path/source directory for later asset resolution

---

## 2. Validate

Input:
- `ParsedArticle`

Output:
- `ValidatedArticle`

Responsibilities:
- read accepted frontmatter fields
- resolve local asset paths
- derive `cover_summary`
- inject default avatar when omitted
- normalize metadata into `ArticleMeta`
- fail early when referenced local assets are missing

Important current behavior:
- `author_name` currently falls back to a placeholder instead of failing hard
- `cover_summary` may come from explicit frontmatter, `summary`, first paragraph, or title
- `cover_image` is still accepted/validated for compatibility, but the active cover design is summary-led

---

## 3. Normalize

Input:
- `ValidatedArticle`

Output:
- `ContentBlock[]`

Responsibilities:
- convert mdast nodes into a smaller rendering model
- distinguish headings, paragraphs, lists, blockquotes, code, tables, images, and Mermaid
- convert article images into base64 data URIs for robust rendering

Design reason:
- the renderer only needs a limited set of content block types
- using an intermediate block model simplifies pagination and HTML generation

---

## 4. Render body HTML

Input:
- `ArticleMeta`
- `ContentBlock[]`

Output:
- one full HTML document string

Responsibilities:
- inline the theme CSS
- inline Mermaid runtime
- wrap each block with attributes/classes for measurement and styling
- emit a single tall document with `.page-content`

Important design choice:
- the system does **not** render one HTML file per page
- instead it renders once, measures once, then clips screenshots

This significantly reduces drift between measured layout and final capture.

---

## 5. Load in browser

The pipeline loads the rendered HTML into Playwright Chromium via `page.setContent()`.

Before measuring or screenshotting, it waits for:
- `document.fonts.ready`
- all images to complete loading
- Mermaid diagrams to finish rendering

This is one of the key stability guards in the system.

---

## 6. Measure blocks

`measureBlocks()` reads DOM geometry for every `.block` element and collects:
- block index
- block type
- top offset
- total block height including margins
- whether the block is splittable

These measurements are the input to pagination.

---

## 7. Compute page breaks

`computePageBreaks()` converts measured blocks into `PageSpec[]`.

Current pagination strategy:
- use `FIRST_PAGE_USABLE` for the first content page
- use `USABLE_HEIGHT` for later pages
- keep headings from being orphaned at the end of a page where possible
- treat headings/images/Mermaid/tables as non-splittable units
- append an END marker to the last page when space allows

Current limitation:
- paragraphs and code blocks are still treated as block-level units, not line-fragment units

---

## 8. Render cover

The cover is generated separately from the body.

Current cover architecture:
- a dedicated HTML document is built in `renderCoverPage()`
- the cover uses bundled `Noto Serif SC`
- the summary text autosizes within bounded min/max font sizes
- a `coverReady` flag is set after autosizing completes
- Playwright waits for `coverReady` and `document.fonts.ready` before capture

Current cover composition:
- quote-led summary block
- no hero image
- lower-left author signature block
- warm light editorial palette

---

## 9. Screenshot content pages

For body pages, the pipeline does not re-render separate HTML pages.

Instead it:
- scrolls/clips the single tall document
- injects an overlay for page-level masking and metadata
- captures a fixed-size `1080×1800` PNG per page

Overlay responsibilities:
- hide content outside the current page frame
- inject first-page identity row on content page 1
- inject END marker on the last page

---

## Layout constants

Current layout constants live in `src/types.ts`:

- `PAGE_WIDTH = 1080`
- `PAGE_HEIGHT = 1800`
- `PAGE_PADDING = 80`
- `USABLE_HEIGHT = 1640`
- `FIRST_PAGE_IDENTITY = 120`
- `FIRST_PAGE_USABLE = 1520`
- `END_MARKER_HEIGHT = 120`

These constants are coupled to:
- pagination math
- screenshot clipping
- cover sizing
- visual tests that assume fixed dimensions

Changing page height/width requires a coordinated update across code, screenshots, and tests.

---

## Why the architecture is shaped this way

## Browser-measured layout instead of Node-side guessing
Benefits:
- real typography measurement
- robust handling of lists/tables/code/Mermaid
- less custom text metrics code

Trade-off:
- depends on a browser runtime and its rendering behavior

## Single render + clip instead of per-page regeneration
Benefits:
- lower layout drift
- simpler reasoning about pagination
- one measurement source of truth

Trade-off:
- page overlays/masking become part of screenshot logic

## Intermediate block model instead of raw mdast everywhere
Benefits:
- smaller render surface area
- easier pagination logic
- cleaner stage boundaries

Trade-off:
- only supported block types survive normalization

---

## Important engineering decisions from the full iteration

This section records the highest-value engineering conclusions that emerged from the full debugging/design loop.

### 1. Render correctness must be judged in the browser, not only in tests
For this project, structural tests are necessary but not sufficient.

Why:
- line wrapping
- heading rhythm
- image visibility
- cover balance
- pagination quality

all ultimately depend on the rendered PNG, not only on AST or HTML correctness.

### 2. Image transport needed to become data-URI based
A key engineering shift was moving local article images away from `file://` loading inside `page.setContent()` and toward base64 data URIs.

Why this mattered:
- it eliminated a fragile runtime dependency in Chromium content loading
- it aligned body image transport with avatar embedding
- it made the screenshot pipeline much more reliable

### 3. Cover rendering needed to be its own system
The discussion proved that the cover could not be treated like a slightly different first content page.

Architecturally, this led to:
- dedicated cover HTML
- dedicated font loading
- dedicated autosizing logic
- dedicated readiness signaling before screenshot

### 4. Typography and pagination are coupled system concerns
Changes that look purely visual often affect:
- page count
- clip positions
- perceived section integrity
- screenshot artifact risk

That means typography changes cannot be treated as isolated CSS polish; they are architectural inputs to the renderer.

### 5. Bundled runtime assets are part of the architecture, not just packaging
The final cover system depends on assets being shipped with the build:
- font files
- Mermaid runtime
- theme CSS
- default avatar

That makes asset copying/build configuration part of the rendering architecture itself.

---

## Value delivered by the current architecture

### Determinism value
The system is now less sensitive to ad hoc local browser asset behavior because critical assets are embedded or bundled.

### Debuggability value
The pipeline has clearer stage boundaries, making it easier to isolate failures to parsing, validation, normalization, rendering, pagination, or screenshoting.

### Product value
The renderer can now support a much stronger editorial cover system without introducing a second app/UI surface.

### Maintenance value
Important design decisions were implemented as explicit pipeline behavior, not as hidden designer intuition. That makes future iteration safer.

---

## Runtime assets

Bundled assets currently include:
- `src/templates/theme-default.css`
- `src/assets/mermaid.min.js`
- `src/assets/default-avatar.png`
- `src/assets/fonts/NotoSerifSC[wght].ttf`
- `src/assets/fonts/NotoSerifSC-OFL.txt`

`tsup.config.ts` copies these assets into `dist/` after build.

---

## Testing layers

The repository uses multiple validation layers:
- unit tests for parsing/validation/normalization/pagination
- browser smoke/e2e tests
- representative long-form fixtures for visual iteration
- manual visual QA through rendered PNG inspection

For this project, code-level correctness alone is not enough; rendered images are part of the acceptance surface.

---

## Known architectural constraints

- single built-in visual theme as the main supported path
- no remote asset fetching
- no interactive preview/editor
- no line-level splitting inside long paragraphs/code blocks
- not designed for arbitrary HTML publishing workflows
- output determinism is strongest when runtime/browser/fonts stay aligned
