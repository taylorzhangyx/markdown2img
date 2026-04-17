# markdown2img

Convert a Markdown article into a sequence of fixed-size 1080×1440 PNG images for mobile reading.

## Install

```bash
npm install
npx playwright install chromium
```

## Usage

```bash
npx markdown2img article.md -o ./output
# or after build
node dist/cli.js article.md -o ./output
```

If `-o` is omitted, output is written next to the input Markdown file in a timestamped directory.

## Supported Markdown features

- YAML frontmatter metadata (`title`, `author_name`, `date`, `avatar_path`, `cover_image`)
- H1/H2/H3 headings
- Paragraphs with bold, italic, and inline code
- Ordered and unordered lists
- Blockquotes
- Fenced code blocks
- GFM tables
- Local images via `file://`
- Mermaid diagrams rendered in Chromium
- Optional cover page and first-page identity overlay

## Output

Each run creates a timestamped directory like `YYYYMMDD-HHmmss/` containing sequential PNGs:

```text
001.png
002.png
003.png
```

Images are always rendered at 1080×1440.
