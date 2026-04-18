# markdown2img CLI Override and Output Workflow Spec

> **For Hermes:** Treat this as a product/UX spec for the next CLI ergonomics pass. Do not start implementation from vague intuition; follow the priority order and semantics defined here.

**Goal:** Make `markdown2img` feel effortless for real article production, cover iteration, and agent automation by adding a small set of high-leverage CLI parameters.

**Architecture:** Keep the current `parse -> validate -> normalize -> renderHtml -> paginate -> screenshot` pipeline intact. Add a thin CLI override layer that merges explicit runtime flags into article metadata/output behavior before rendering. Avoid exposing low-level typography knobs.

**Tech Stack:** TypeScript, Commander CLI, Playwright rendering, Markdown frontmatter validation, timestamped PNG output workflow.

---

## 1. Problem statement

Current CLI usage is intentionally minimal, but it is now too rigid for real publishing workflows.

### 1.1 Current reality

As of the current codebase:
- the CLI only accepts `<input>` and `-o, --output <dir>` (`src/cli.ts`)
- cover text is derived from Markdown/frontmatter, not CLI flags (`src/stages/validate.ts`)
- cover identity comes from `author_name`, `avatar_path`, and `date` in validated metadata (`src/stages/validate.ts`, `src/stages/screenshot.ts`)
- output always goes into a new timestamped subdirectory (`src/lib/fs-utils.ts`)

### 1.2 Why that becomes painful

This is fine for a simple local renderer, but awkward for the actual usage patterns now emerging:
- repeated cover iteration without wanting to edit the source Markdown each time
- reusing one article under different author identities or publishing accounts
- rendering directly into a fixed publish directory such as an Obsidian article folder
- agent automation that needs stable machine-readable outputs and reliable overwrite behavior
- cover-only or body-only iteration to shorten the visual tuning loop

### 1.3 Product principle

The next CLI pass should optimize for **workflow control**, not for exposing design-system internals.

That means:
- good: metadata override, output routing, automation-friendly output, selective render modes
- bad: dozens of typography tweak flags (`--font-size-body`, `--line-height`, `--content-width`, etc.)

The tool should feel easier to operate **without** becoming a loose style playground.

---

## 2. Real usage scenarios

## Scenario A — Cover copy iteration during editorial work

A user has a stable article body but wants to try multiple cover summaries quickly.

### Pain today
They must edit frontmatter repeatedly, rerun the render, then possibly revert content changes.

### What the CLI should support
A direct runtime override for cover summary text.

### Success condition
The user can test multiple cover lines against the same article file without mutating the source document.

---

## Scenario B — Same article, different publishing identities

One article may be published under slightly different author labels, avatars, or dates.

### Pain today
The source Markdown becomes polluted with distribution-specific metadata changes.

### What the CLI should support
Runtime overrides for author name, avatar path, and date.

### Success condition
The same Markdown can be rendered for different distribution contexts without copying or editing the article.

---

## Scenario C — Replace a fixed publish directory

A user wants `001.png`, `002.png`, etc. to land directly in a target folder, often replacing a previous export.

### Pain today
`-o` only changes the base directory; the tool still creates a timestamped subdirectory.
Extra copy/delete steps are needed after every render.

### What the CLI should support
A fixed-output mode and explicit overwrite behavior.

### Success condition
The user can render directly into a target directory and intentionally replace the previous numbered PNG set.

---

## Scenario D — Agent/script automation

An agent or shell script needs predictable output paths and structured result data.

### Pain today
The current human-readable console logs are fine for a person but fragile for automation.

### What the CLI should support
Machine-readable JSON output, explicit overwrite semantics, and stable output modes.

### Success condition
A script can run the tool, read a JSON payload, and continue with sync/upload/attachment steps without parsing prose logs.

---

## Scenario E — Fast visual iteration

A user may only want to tune cover composition or only want to inspect body typography.

### Pain today
The pipeline always renders the full sequence.

### What the CLI should support
Selective render mode flags for cover-only or body-only workflows.

### Success condition
Iteration loops become meaningfully shorter when only one part of the output matters.

---

## 3. Proposed parameter set

## P0 — must-have first batch

### 3.1 `--cover-summary <text>`

**Purpose:** Override cover main text at runtime.

**Why it matters:** The current cover is summary-led, and this is the highest-frequency override need.

**Resolution priority:**
1. `--cover-summary`
2. `frontmatter.cover_summary`
3. `frontmatter.summary`
4. first meaningful paragraph
5. `title`

**Notes:**
- should go through the same summary normalization/truncation path as frontmatter-derived summary
- should affect cover only, not body content

---

### 3.2 `--author-name <text>`
### 3.3 `--avatar-path <path>`
### 3.4 `--date <text>`

**Purpose:** Override identity block metadata at runtime.

**Why they should ship together:** They are used together in the cover identity anchor and often vary as a bundle.

**Resolution priority:**
- `--author-name` > `frontmatter.author_name` > validator fallback
- `--avatar-path` > `frontmatter.avatar_path` > bundled default avatar
- `--date` > `frontmatter.date`

**Notes:**
- `--avatar-path` must still resolve relative to current working directory or input file path by a clearly documented rule
- runtime override should preserve existing asset validation guarantees

---

### 3.5 `--output-dir <dir>`

**Purpose:** Write numbered PNGs directly into a fixed directory instead of creating a timestamped child directory.

**Why it matters:** This is the biggest workflow improvement for real publishing and Obsidian overwrite use.

**Proposed behavior:**
- `-o, --output <dir>` keeps its current meaning: output **base directory**, then create timestamped subdir
- `--output-dir <dir>` means: write files directly into that exact directory

**Rationale:**
This avoids breaking existing usage while adding an explicit “fixed target” mode.

---

### 3.6 `--overwrite`

**Purpose:** Allow intentional replacement of existing numbered PNGs in a fixed output directory.

**Why it matters:** Fixed output without explicit overwrite behavior is unsafe and ambiguous.

**Proposed behavior:**
- valid only with `--output-dir`
- before writing, remove existing numbered render files that match the renderer naming pattern (`001.png`, `002.png`, ...)
- if omitted and conflicting files exist, fail with a clear error

**Important detail:**
If the previous export had more pages than the new one, stale trailing pages must not remain in the target directory.

---

### 3.7 `--json`

**Purpose:** Emit machine-readable result metadata.

**Why it matters:** Critical for agent workflows and shell automation.

**Proposed payload:**
```json
{
  "outputMode": "timestamped",
  "outputDir": "/tmp/markdown2img-renders/20260418-173418",
  "files": [
    "/tmp/markdown2img-renders/20260418-173418/001.png",
    "/tmp/markdown2img-renders/20260418-173418/002.png"
  ],
  "pageCount": 6,
  "renderedCover": true,
  "renderedBody": true
}
```

**Notes:**
- keep current human-readable logs by default
- `--json` should either suppress prose logs or route logs to stderr and JSON to stdout; pick one rule and document it clearly

---

### 3.8 `--cover-only`

**Purpose:** Render just the cover page.

**Why it matters:** Essential for summary/composition iteration.

**Proposed behavior:**
- output only `001.png`
- skip body page measurement and screenshot generation
- still run validation and any steps needed to resolve metadata/assets safely

---

## P1 — second batch

### 3.9 `--skip-cover`

**Purpose:** Render body pages without generating the cover.

**Why it matters:** Useful when iterating on body typography/pagination.

**Proposed behavior:**
- first generated page should still be named predictably according to the chosen contract
- choose and document one of these:
  - body output starts at `001.png` in skip-cover mode
  - or body output preserves logical numbering and starts at `002.png`

**Recommendation:** Start body-only output at `001.png` for simplicity.

---

### 3.10 `--title <text>`

**Purpose:** Runtime override for title metadata.

**Why it is lower priority:** The current cover is not title-led, so this is less valuable than `--cover-summary`.

**When it becomes useful:**
- body first page title testing
- light retitling for distribution without changing source Markdown

---

## P2 — explicitly deferred / not recommended now

### 3.11 `--theme <name>`

Do not prioritize until multiple stable themes actually exist as a supported product surface.

### 3.12 Low-level style knobs

Do **not** expose these in the first ergonomics pass:
- `--font-size-body`
- `--line-height`
- `--content-width`
- `--cover-font-size`
- similar visual tokens

**Reason:** These are design-system controls, not operator-facing workflow controls. Shipping them early would:
- explode the test matrix
- reduce output consistency
- encourage accidental misuse by both humans and agents

---

## 4. Parameter semantics and precedence

## 4.1 Metadata precedence

The CLI must define a single override rule:

**CLI flag > frontmatter > current validator fallback**

Apply this consistently to all supported metadata overrides.

---

## 4.2 Output mode precedence

The CLI must avoid ambiguous combinations.

### Proposed rules
- `-o, --output <dir>` = timestamped base-dir mode
- `--output-dir <dir>` = fixed-dir mode
- `--overwrite` is valid only with `--output-dir`
- `--cover-only` and `--skip-cover` are mutually exclusive

### Error examples
- `--overwrite` without `--output-dir` → fail with clear usage error
- `--cover-only --skip-cover` → fail with clear usage error
- `--output` and `--output-dir` together → either reject as ambiguous or define explicit precedence

**Recommendation:** reject ambiguous combinations instead of inventing surprising precedence.

---

## 4.3 Path resolution rule

For all runtime asset overrides such as `--avatar-path`, define one resolution rule and document it.

### Recommended rule
- if path is absolute, use it as-is
- if path is relative, resolve it against the input Markdown file directory

**Why:** This matches user expectation better than resolving relative to the shell working directory.

---

## 5. Page number and end-marker design addendum

This pass should also add quiet body-page folios (page numbers) and adjust end-marker placement.

### 5.1 Page number scope
- show page numbers on **body pages only**
- do **not** show a page number on the cover
- the first body page should display `1`
- the second body page should display `2`
- the last body page should still display its page number

This is a **body-logical page number**, not the output file index.

### 5.2 Recommended visual style
Use a **quiet editorial folio** style:
- bottom-right footer area
- very low visual weight
- serif digits, consistent with the current editorial system
- muted warm-gray color close to existing secondary/muted text
- no badge, chip, pill, or filled background
- no `Page`, no `1 / N`, no UI-style pagination affordance

Preferred content:
- just the number (`1`, `2`, `3`, ...)

Optional refinement if needed after rendering review:
- a very short hairline before the number, only if it remains subtle and does not pull attention away from the body

### 5.3 Placement rule
Place the folio in the **bottom-right area**, but align it visually with the body/content system rather than the raw screen edge.

Recommendation:
- position it in the footer zone
- keep it closer to the body measure / right content edge than to the full-page outer edge
- maintain a comfortable bottom safety margin

Why:
- this keeps the page number feeling like part of the publication system
- it avoids a UI-overlay feeling
- it leaves the center axis free for other editorial signals

### 5.4 End-marker placement change
The final body page should still show `END`, but **not pinned to the page bottom**.

New rule:
- place `END` at a **fixed distance after the end of the actual article content**
- do not anchor it to the bottom edge of the page
- preserve the quiet centered treatment, but let it sit as a post-content signoff rather than a footer element

Design intent:
- `END` should read like a calm closing marker after the article body
- it should not compete with the page number footer
- it should avoid creating a visually heavy bottom band on the last page

### 5.5 Relationship between folio and END
On the last page:
- keep the page number in the bottom-right footer
- place `END` after the final body content at a fixed offset
- the two should not share the same alignment logic

That separation is intentional:
- folio = navigation/orientation signal
- END = editorial closing marker

### 5.6 Implementation note
The current last-page end marker is bottom-anchored in the overlay layer. That behavior should be changed so the marker position is derived from the measured content bottom plus a fixed offset, with sensible clamping to avoid clipping.

## 6. Example commands

## 6.1 Cover-copy iteration

```bash
node dist/cli.js article.md \
  --cover-summary "真正让高能力 Agent 在生产环境里失效的，往往不是模型，而是上下文污染、工具背压和观测断裂。"
```

## 6.2 Same article, different signature

```bash
node dist/cli.js article.md \
  --author-name "AI工程Tay" \
  --avatar-path ./assets/avatar.png \
  --date 2026-04-18
```

## 6.3 Render directly into a publish folder

```bash
node dist/cli.js article.md \
  --output-dir "/path/to/publish" \
  --overwrite
```

## 6.4 Cover-only exploration

```bash
node dist/cli.js article.md \
  --cover-summary "..." \
  --cover-only \
  --output-dir /tmp/cover-preview \
  --overwrite
```

## 6.5 Agent-friendly invocation

```bash
node dist/cli.js article.md \
  --output-dir /tmp/render-out \
  --overwrite \
  --json
```

---

## 7. Acceptance criteria

The CLI ergonomics pass is successful if all of the following are true:

1. A user can override cover summary without editing Markdown frontmatter.
2. A user can override cover identity metadata without editing Markdown frontmatter.
3. A user can render directly into a fixed publish directory.
4. Overwrite mode safely replaces old numbered PNGs without leaving stale extra pages behind.
5. An agent/script can rely on a stable JSON result payload.
6. Cover-only rendering works without producing body pages.
7. Existing timestamped output behavior remains backward-compatible for current users.
8. The design system remains protected from low-level CLI style sprawl.

---

## 8. Implementation outline

This is not the full implementation plan yet, but the expected code ownership is clear.

### `src/cli.ts`
- add new Commander options
- validate mutually exclusive/invalid flag combinations
- pass a structured runtime options object into the pipeline

### `src/pipeline.ts`
- accept runtime options in `runPipeline()`
- branch output mode logic
- branch cover-only / skip-cover behavior
- include JSON-friendly result structure

### `src/stages/validate.ts`
- merge CLI metadata overrides into validated article metadata
- preserve existing fallback logic under the override layer
- validate runtime asset paths using the same safety rules as frontmatter assets

### `src/lib/fs-utils.ts`
- separate timestamped-output logic from fixed-output logic
- add safe numbered-file cleanup for overwrite mode

### tests
Add focused tests for:
- metadata precedence
- invalid flag combinations
- fixed output vs timestamped output behavior
- overwrite cleanup of stale trailing pages
- cover-only and skip-cover behavior
- JSON output contract

---

## 9. Recommendation

If only one implementation batch should ship next, ship this exact subset first:

1. `--cover-summary`
2. `--author-name`
3. `--avatar-path`
4. `--date`
5. `--output-dir`
6. `--overwrite`
7. `--cover-only`
8. `--json`

This batch gives the highest practical leverage for:
- article iteration
- publishing workflows
- Obsidian replacement
- agent automation

without opening the door to uncontrolled visual parameter sprawl.

---

## 10. Non-goals for this pass

This spec does **not** propose:
- introducing a runtime theme engine
- exposing typography/system-token flags
- changing the established summary-led cover design
- changing the current rendering architecture
- replacing the existing timestamped output behavior as the default mode

The objective is not to make the CLI more flexible in every dimension.
The objective is to make it more usable in the workflows that already clearly exist.
