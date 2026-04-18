# Body Folio and End-Marker Implementation Plan

> **For Hermes:** Implement this as a small overlay/pagination refinement. Do not redesign the renderer. Keep the existing `parse -> validate -> normalize -> renderHtml -> paginate -> screenshot` pipeline and add only the metadata/layout needed for body-page folios and post-content `END` placement.

**Goal:** Add quiet page numbers to body pages only, with body page 1 starting at `1`, and move the final-page `END` marker so it appears a fixed distance after the article content instead of being pinned to the page bottom.

**Architecture:** Keep page numbering and `END` positioning in the screenshot overlay layer, but make the overlay consume a slightly richer `PageSpec`/layout contract. Pagination should expose enough information to place `END` relative to measured content bottom safely. Do not push folio styling into the body HTML theme.

**Tech Stack:** TypeScript, Playwright screenshot overlays, pagination metadata in `PageSpec`, Vitest stage/e2e tests.

---

## Design contract to preserve

### Body folio behavior
- show page numbers on **body pages only**
- cover page gets **no** page number
- first body page displays `1`
- second body page displays `2`
- last body page still displays its body-page number
- the folio is a **body-logical page number**, not the PNG filename index

### Folio visual direction
- footer **bottom-right**
- quiet editorial folio, not UI pagination
- serif digits
- muted warm-gray color, low visual weight
- no badge, chip, pill, `Page`, or `1 / N`
- align visually with the body/content system, not the raw right screen edge

### END behavior
- only on the final body page when `hasEndMarker` is true
- centered horizontally
- positioned at a **fixed distance after the real article content**
- **not** bottom-anchored
- should read like a calm signoff after the article, not like a footer ornament

---

## File map

Core files:
- `src/types.ts`
- `src/stages/paginate.ts`
- `src/stages/screenshot.ts`
- `tests/stages/paginate.test.ts`
- `tests/e2e/full-pipeline.test.ts`

Optional if needed after visual verification:
- `tests/fixtures/with-images/facebook-engineering-style-8-pages.md`
- `IMPLEMENTATION_LOG.md`

---

## Task 1: Extend page metadata for body folio and post-content END placement

**Objective:** Add the minimum `PageSpec` data needed so the overlay can render a body-logical page number and place `END` at a fixed distance after content.

**Files:**
- Modify: `src/types.ts`
- Modify: `src/stages/paginate.ts`
- Test: `tests/stages/paginate.test.ts`

### Step 1: Add explicit page-level metadata to `PageSpec`

Extend `PageSpec` in `src/types.ts` with fields that make overlay behavior obvious and deterministic.

Recommended additions:
```ts
export interface PageSpec {
  readonly pageIndex: number;
  readonly blockRange: { readonly start: number; readonly end: number };
  readonly clipY: number;
  readonly contentHeight: number;
  readonly contentBottom: number;
  readonly isFirstPage: boolean;
  readonly isLastPage: boolean;
  readonly hasEndMarker: boolean;
  readonly bodyPageNumber: number;
  readonly bodyPageCount: number;
}
```

Notes:
- `bodyPageNumber` should be `pageIndex + 1` for body pages
- `bodyPageCount` is optional for current rendering, but useful for later tests/JSON/debugging and cheap to add now
- do **not** add cover-page numbering here; `PageSpec` already represents body pages only

### Step 2: Add a layout constant for post-content END spacing

In `src/types.ts`, add a dedicated layout token for the vertical gap after article content:
```ts
END_MARKER_OFFSET: 72,
```

Guideline:
- start around `64–88px`
- pick one clear default and validate with real PNG output later
- this is a layout-system constant, not a CLI parameter

### Step 3: Populate the new metadata in `computePageBreaks()`

In `src/stages/paginate.ts`, set:
- `bodyPageNumber` when each body page is pushed
- `bodyPageCount` after all pages are known

Recommended pattern:
1. build pages as today
2. once the `pages` array is final, map it once to attach `bodyPageNumber` and `bodyPageCount`

This avoids fragile incremental bookkeeping while pages are still being split/rewritten.

### Step 4: Write/update the failing tests first

In `tests/stages/paginate.test.ts`, update expectations so page objects assert the new metadata.

Add/adjust checks like:
```ts
expect(plan.pages[0]).toMatchObject({
  bodyPageNumber: 1,
  bodyPageCount: 3,
});
expect(plan.pages[1]).toMatchObject({
  bodyPageNumber: 2,
  bodyPageCount: 3,
});
```

Also update the dedicated END-marker-page case so the synthetic final page still gets the correct body numbering.

### Step 5: Run the stage test

Run:
```bash
npm test -- --run tests/stages/paginate.test.ts
```

Expected:
- all paginate tests pass
- no stale assertions remain around old `PageSpec` shape

---

## Task 2: Add quiet body folios in the overlay layer

**Objective:** Render a bottom-right page number on every body page, including the last one, while leaving the cover untouched.

**Files:**
- Modify: `src/stages/screenshot.ts`
- Test: `tests/e2e/full-pipeline.test.ts`

### Step 1: Add folio rendering inside `injectOverlay()`

In `src/stages/screenshot.ts`, add a folio element for every `PageSpec` passed to `injectOverlay()`.

Recommended element structure:
```ts
const folio = document.createElement('div');
folio.textContent = String(spec.bodyPageNumber);
```

Recommended style direction:
```ts
folio.style.cssText = [
  'position:absolute',
  'right:132px',
  'bottom:72px',
  'font-family:"CoverNotoSerifSC", "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
  'font-size:22px',
  'font-weight:500',
  'line-height:1',
  'letter-spacing:0.01em',
  'color:#857B70',
].join(';');
```

Important:
- keep it visually aligned with the content measure, not too close to the outer edge
- do not center it
- do not add total-page notation
- do not render it on the cover (the cover uses `renderCoverPage()`, not `injectOverlay()` anyway)

### Step 2: Keep folio logic independent from first-page identity logic

Do **not** hide the folio on `spec.isFirstPage`.

The first body page already has the top identity overlay, but it should still show folio `1` at the bottom-right.

### Step 3: Avoid collisions with masks

Make sure the folio is appended **after** the bottom mask logic and positioned within the visible footer area, so it is not covered by the overlay masks.

### Step 4: Verify the last page still gets a folio

This is a regression-sensitive point.
The last page may also carry `END`; the folio must still render in the bottom-right regardless.

### Step 5: Add/adjust e2e assertions where practical

In `tests/e2e/full-pipeline.test.ts`, do not attempt OCR. Instead, add a lightweight regression assertion if possible via output count/plan behavior only, and rely on visual verification for placement.

If adding DOM-level screenshot assertions is too heavy for this repo’s current test style, document that folio placement is primarily verified visually after render.

---

## Task 3: Move END from bottom-anchored footer to post-content signoff

**Objective:** Position `END` based on actual content bottom plus a fixed offset, with safe clamping so it never clips or falls off-page.

**Files:**
- Modify: `src/stages/screenshot.ts`
- Possibly modify: `src/types.ts`
- Test: `tests/stages/paginate.test.ts`
- Test/verify: `tests/e2e/full-pipeline.test.ts`

### Step 1: Replace bottom anchoring with computed top position

Today `END` is bottom-anchored:
- `bottom:120px`

Change this to a computed `top` based on content bottom.

Recommended formula inside `injectOverlay()`:
```ts
const endMarkerTop = Math.min(
  Math.max(Math.floor(spec.contentBottom + layout.endMarkerOffset), topContentInset),
  layout.pageHeight - 220,
);
```

Then style the marker with:
```ts
'endMarker.style.cssText = [
  "position:absolute",
  "left:0",
  "right:0",
  `top:${endMarkerTop}px`,
  ...
].join(';')
```

### Step 2: Add layout data needed by the browser-side overlay

Pass `endMarkerOffset` through the existing `layout` payload in `injectOverlay()`.

For example:
```ts
layout: {
  pageWidth: LAYOUT.PAGE_WIDTH,
  pageHeight: LAYOUT.PAGE_HEIGHT,
  pagePadding: LAYOUT.PAGE_PADDING,
  firstPageIdentityReserve: LAYOUT.FIRST_PAGE_IDENTITY,
  endMarkerOffset: LAYOUT.END_MARKER_OFFSET,
}
```

### Step 3: Choose a clear clamping rule

The marker must never:
- fall above the visible content region unexpectedly
- clip below the page bottom
- collide obviously with the footer folio

Recommended rule:
- minimum top = at least the visible content inset
- maximum top = page height minus a safe marker block height (around `200–240px`)

Do **not** overcomplicate this with collision engines.
A simple clamp is enough for this pass.

### Step 4: Keep the centered editorial styling

Preserve the existing END treatment as much as possible:
- centered horizontally
- quiet muted tone
- fine side rules

Only the vertical anchoring should change.

### Step 5: Review whether the dedicated END-only page behavior still makes sense

Current pagination can create a dedicated END-marker page when the previous page has no room.
That behavior may still be valid after moving `END` to post-content positioning.

For this pass:
- keep the pagination behavior unchanged unless visual review proves it is now awkward
- only change overlay placement

If later review shows that a dedicated END-only page looks too empty, that should be a separate refinement task, not part of this minimal pass.

---

## Task 4: Verify with tests and real renders

**Objective:** Confirm the new metadata, overlay behavior, and visual balance without broadening scope.

**Files:**
- Test: `tests/stages/paginate.test.ts`
- Test: `tests/e2e/full-pipeline.test.ts`
- Optional fixture render: `tests/fixtures/with-images/facebook-engineering-style-8-pages.md`
- Log: `IMPLEMENTATION_LOG.md`

### Step 1: Run focused tests

Run:
```bash
npm test -- --run tests/stages/paginate.test.ts tests/e2e/full-pipeline.test.ts
```

Expected:
- paginate tests pass with new metadata
- full-pipeline tests still pass
- no regressions in page output sequencing

### Step 2: Rebuild

Run:
```bash
npm run build
```

### Step 3: Render a representative long article

Run:
```bash
node dist/cli.js tests/fixtures/with-images/facebook-engineering-style-8-pages.md -o /tmp/markdown2img-renders
```

Inspect:
- first body page: page number `1` appears in quiet bottom-right folio position
- middle page: folio remains subtle and aligned with the publication system
- last page: page number still appears, and `END` sits after the content rather than at the footer bottom
- no obvious collision between folio and `END`

### Step 4: Render the target real article if needed

If the user wants final acceptance against the real article, rerender the accepted working article and inspect the last page specifically.

### Step 5: Update implementation log if the render is accepted

Append to `IMPLEMENTATION_LOG.md`:
- page folio behavior added
- `END` vertical placement changed from bottom-anchored to post-content offset
- verification command
- output directory used for visual review

---

## Task 5: Commit plan for the implementation batch

**Objective:** Keep the change reviewable and scoped.

**Files:**
- Modify only the files above unless visual verification proves another file is necessary

### Recommended commit message
```bash
git commit -m "feat(rendering): add body folios and post-content end marker"
```

---

## Acceptance criteria

The implementation is done only if all of these are true:

1. Body pages display page numbers starting from `1`.
2. Cover page displays no page number.
3. The last body page still displays its page number.
4. The folio sits in a quiet bottom-right footer position and does not look like UI pagination.
5. `END` is no longer bottom-anchored.
6. `END` appears at a fixed distance after the real article content on the final page.
7. Folio and `END` do not visually compete on the last page.
8. Focused tests pass.
9. Real rendered PNGs look correct.

---

## Notes for execution

Keep the scope tight.

This pass is about:
- body folio numbering
- folio placement
- END vertical placement

This pass is **not** about:
- changing body typography
- redesigning the cover
- altering output file numbering
- rethinking the dedicated END-only page pagination strategy unless absolutely necessary
