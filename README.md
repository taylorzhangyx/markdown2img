# markdown2img

`markdown2img` is a CLI tool that converts a structured Markdown article into a sequence of fixed-size `1080×1440` PNG images for mobile reading.

It is designed for a specific publishing workflow: write in Markdown, run one command, and get a deterministic set of image pages that are easy to preview, share, or publish on mobile-first platforms.

## Project background

A lot of strong long-form content starts life as Markdown: engineering notes, explainers, tutorials, internal writeups, and social-post drafts. But turning that content into polished image cards is usually still manual.

Typical pain points:
- copying text into design tools page by page
- inconsistent typography and spacing across posts
- awkward handling of long articles
- poor support for code, tables, diagrams, and technical blocks
- too much manual layout work for repeat publishing

`markdown2img` solves this with a CLI-first rendering pipeline:

```text
Parse -> Validate -> Normalize -> Render HTML -> Paginate -> Screenshot
```

The implementation prioritizes:
- readability on iPhone-class screens
- deterministic output
- stable rendering through Chromium / Playwright
- explicit validation and debuggable failure modes

## What this project does

Given a Markdown file, `markdown2img` will:
- parse frontmatter and body content
- validate required metadata and local assets
- normalize supported Markdown blocks into a renderable structure
- render the full article as one tall HTML page
- measure real browser layout in Chromium
- compute page breaks for `1080×1440` output pages
- inject page decorations like author identity and END marker
- export sequential PNGs into a timestamped output directory

## Core features

### 1. Mobile-first fixed-size output
- every page is rendered at exactly `1080×1440`
- suitable for iPhone-oriented reading and image-post workflows
- timestamped output directories make repeated runs easy to manage

### 2. Deterministic browser-based rendering
- rendering is done in Chromium via Playwright
- layout is measured in the browser, not guessed in Node.js
- pagination uses real rendered heights, which is much more stable for technical content

### 3. Single-render + clip screenshot strategy
Instead of generating separate HTML for each page, the tool renders the article once and takes multiple clipped screenshots from the same page.

This reduces layout drift and keeps pagination behavior stable.

### 4. Structured article metadata
Supports YAML frontmatter for article-level metadata, including:
- `title`
- `author_name` (required)
- `date`
- `avatar_path`
- `cover_image`

### 5. Technical-content friendly blocks
The renderer supports common content types used in technical articles:
- headings
- paragraphs
- lists
- blockquotes
- fenced code blocks
- GFM tables
- local images
- Mermaid diagrams

### 6. Publishing-oriented decorations
- optional cover page when `cover_image` is provided
- first-page identity block with author / avatar / date
- END marker on the last page

### 7. Explicit error handling
The CLI returns structured, human-readable errors for common failure cases such as:
- missing input file
- missing `author_name`
- missing local images / avatar / cover
- Mermaid render failure
- screenshot / layout failure

## Installation

### Requirements
- Node.js
- npm
- Playwright Chromium runtime

### Install dependencies

```bash
npm install
npx playwright install chromium
```

### Build

```bash
npm run build
```

## Supported commands and options

The CLI currently exposes one main command:

```bash
markdown2img <input> [options]
```

### Positional argument
- `<input>`: path to the source Markdown file

### Options
- `-o, --output <dir>`: output base directory
- `-h, --help`: show help
- `-V, --version`: show version

### Examples

Run directly in a dev environment:

```bash
npx markdown2img article.md -o ./output
```

Run the built CLI:

```bash
node dist/cli.js article.md -o ./output
```

Write output next to the source file:

```bash
node dist/cli.js article.md
```

## Frontmatter example

```md
---
title: My Article
author_name: Taylor Zhang
date: 2026-04-17
avatar_path: ./assets/avatar.png
cover_image: ./assets/cover.png
---

# Main Heading

This is the article body.
```

## Supported Markdown features

### Metadata
- YAML frontmatter
- recognized fields:
  - `title`
  - `author_name`
  - `date`
  - `avatar_path`
  - `cover_image`
- unknown frontmatter fields are ignored

### Block types
- H1 / H2 / H3 headings
- paragraphs
- ordered lists
- unordered lists
- blockquotes
- fenced code blocks
- GFM tables
- local images via `file://`
- Mermaid fenced code blocks rendered in Chromium

### Inline formatting
- bold
- italic
- inline code

## Output format

Each run creates a timestamped directory like:

```text
YYYYMMDD-HHmmss/
  001.png
  002.png
  003.png
```

Output behavior:
- pages are sequentially numbered
- every PNG is exactly `1080×1440`
- if `cover_image` is present, the cover becomes `001.png`
- content pages follow after the cover page
- if `-o` is omitted, output is written next to the input file

## Rendering behavior

### Pagination
- pagination is based on measured browser layout
- headings are prevented from being orphaned at the bottom of a page
- images, Mermaid blocks, and tables are treated as non-splittable blocks
- v1 does **not** support line-level splitting inside a paragraph or code block

### Images
- article images are loaded as local `file://` URLs
- missing image assets fail validation before rendering

### Mermaid
- Mermaid is bundled locally and rendered in Chromium
- Mermaid failures are surfaced as explicit CLI errors

## Error output

Errors are printed in this format:

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

## Development

### Useful commands

```bash
npm test
npm run build
npx tsc --noEmit
```

### End-to-end example

```bash
node dist/cli.js tests/fixtures/full-article.md -o /tmp/markdown2img-check
```

## Current scope and limitations

This project is intentionally narrow in scope.

### Supported scope
- one default visual theme
- local assets only
- mobile-first PNG output
- deterministic single-command workflow

### Not in scope
- arbitrary theme customization
- remote asset fetching
- interactive editing / preview UI
- PDF / PPT export
- cross-machine pixel-perfect guarantees
- arbitrary HTML authoring
- line-level cross-page splitting

## Why this design

Two design choices matter most:

1. **Browser-measured pagination**
   - avoids guessing text height in Node.js
   - uses real browser layout for code, tables, images, and Mermaid

2. **Single render + clip screenshots**
   - avoids page-to-page HTML regeneration drift
   - keeps output more stable and reproducible

## Repository status

The project includes:
- unit tests for parsing, validation, normalization, rendering, and pagination
- smoke tests for browser rendering
- end-to-end tests for pipeline, CLI, error cases, and determinism

If you want to inspect the implementation progress and debugging trail, see:

```text
IMPLEMENTATION_LOG.md
```
