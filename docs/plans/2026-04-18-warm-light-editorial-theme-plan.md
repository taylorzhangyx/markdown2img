# Warm Light Editorial Theme Plan

> **For Hermes:** Implement this as a theme-system refinement, not a rendering rewrite. Keep the current `parse -> validate -> normalize -> renderHtml -> paginate -> screenshot` architecture intact.

**Goal:** Move `markdown2img` toward a calm, high-trust, Xiaohongshu-friendly editorial knowledge-card style for technical and business writing: warm light background, lower reading friction, clear grouping, and stronger hierarchy.

**Architecture:** Primary work should happen in `src/templates/theme-default.css`, with token alignment in `src/stages/render-html.ts` and cover / first-page overlay tuning in `src/stages/screenshot.ts`.

**Tech Stack:** TypeScript, Playwright screenshots, bundled CSS theme, Mermaid theme variables, Vitest stage/e2e tests.

---

## 0. Priority Correction from Design Review

The latest design feedback clarifies that the main issue is **not primarily color**.

**The main issue is reading friction.**

The current rendering feels too evenly spaced, too fragment-like, and not grouped strongly enough. The redesign should therefore optimize in this order:

1. **Reduce reading friction**
2. **Make related content read as grouped blocks**
3. **Make H1 / H2 / H3 hierarchy obvious at a glance**
4. **Use non-uniform spacing to communicate structure**
5. **Apply the warm light palette**

### What the feedback means in practice
- Do not let every paragraph, subhead, and list item feel equally separated.
- A section should look like a section before the reader fully reads it.
- Related bullets / numbered items should visually cluster into one block.
- Summary lines and pull-quotes should read as the end of a block, not just another paragraph.
- Lower-order headings must not look like siblings of higher-order headings.

### Success condition
At a glance, the user should immediately understand:
- what belongs together
- which heading is subordinate to which section
- where one block ends and the next begins

If the page still feels uniformly spaced or semantically flat, the redesign is not complete.

---

## 1. Design Intent

### Reference direction to emulate
Borrow these qualities from the reference images:
- calm, ordered, editorial page rhythm
- high readability in Xiaohongshu-style scrolling contexts
- warm light paper feel
- low-noise surfaces
- strong trust signal: “this was carefully curated”
- inviting first-screen reading experience

### Explicitly do **not** copy
Do **not** copy:
- the exact cream / brown parenting-book palette
- overly soft / therapeutic emotional tone
- decorative warmth that feels lifestyle-first instead of business / technical
- black-poster or cinematic presentation
- poster-like symmetry that hides what the article is about

### Target feel for `markdown2img`
The result should feel like:
- editorial knowledge card
- warm notebook / light paper, not dark cinema
- serious but approachable
- premium and readable
- suitable for AI, software, infra, GTM, strategy, business model, market structure topics

A good mental model is:
- **Notion / Linear discipline**
- plus **light editorial publishing warmth**
- plus **Xiaohongshu-native readability and trust**

### Reading-friction objective
The theme should optimize for **low-friction scanning on mobile**:
- the eye should know where to start immediately
- related content should read as one visual unit
- users should not need to infer heading relationships manually
- pages should feel composed in chunks, not sprinkled line-by-line

---

## 2. Visual System Requirements

### 2.1 Background and surface direction
Use a **light warm-neutral background**, but cooler and more technical than the parenting-style references.

Recommended direction:
- page background: warm off-white / light parchment with a touch of gray
- surfaces: slightly lifted ivory / fog / oat tone
- borders: thin warm-gray hairlines
- accents: muted amber / bronze / ochre only where emphasis is needed

### 2.2 Typography direction
Keep the current editorial Chinese serif direction, but tune it toward technical/business clarity:
- preserve high-quality Chinese serif for long-form reading
- avoid making body text feel too literary or soft
- titles should feel sharp, composed, and high-signal
- body copy should remain very readable on mobile screenshots
- emphasized text should stand out clearly without becoming luxury-brand gold everywhere

### 2.3 Information density
Keep the current strength of the renderer: serious content with real density. But visually it should feel:
- structured, not packed
- composed, not dramatic
- collectible, not ad-like

### 2.3.1 Grouping and rhythm requirements
This is the most important addition from the design review.

The layout must create **block perception**, not uniform flow.

Required behavior:
- section title + intro paragraph should visually read as one opening block
- grouped bullets or numbered items should read as one logical cluster
- conclusion / pull-quote lines should read as end-of-block emphasis
- the next section should have a visibly stronger break than within-section spacing

Avoid:
- evenly distributed spacing between every element
- every heading and paragraph feeling equally separated
- pages where all blocks feel isolated and visually scattered

### 2.3.2 Spacing rule
Spacing should be **hierarchical**, not mathematically uniform.

Use this model:
- **small spacing** = inside the same micro-group
- **medium spacing** = between sub-blocks within a section
- **large spacing** = between sections

If all three feel too similar, the page will look fragmented.

### 2.3.3 Hierarchy rule
H1, H2, and H3 must not rely only on slight font-size deltas.

At least two of the following should differ clearly across levels:
- font family
- font size
- font weight
- text color
- letter spacing
- top / bottom spacing

Design-review-aligned recommendation:
- H1 stays in editorial serif
- H2 remains serif but quieter and more structural
- H3 may move to a cleaner sans / black-style face or lighter neutral tone so it clearly reads as a lower-order label

### 2.4 Cover direction
Cover pages should feel like:
- report cover / essay opener / analyst memo
- not lifestyle card
- not black poster
- not app landing page
- not a symmetric poster that hides what the article is about

Use:
- light background
- a restrained eyebrow / series label
- strong but not oversized title
- quiet byline / date row
- a **cover summary block** that directly tells the reader what the article is about
- bottom-left **avatar + author-name identity anchor**
- optional hero block only if it helps framing; it must not overpower the summary text
- cover palette and body palette must belong to the same visual system

### 2.4.1 Cover summary requirement
The cover is not just a title page. It should include a short editorial summary that helps the user decide whether to read.

Required behavior:
- support approximately **50–300 Chinese characters** of summary text on the cover
- the summary should directly explain the article’s main point, not act like decorative deck copy
- the first screen should reduce reader tension: the user should feel “I can slowly read this” rather than “this looks dense or performative”
- the page should carry a **paper / book-page feeling**, not a poster mood

### 2.4.2 Cover readability objective
The cover must communicate three things fast:
1. what this article is about
2. why it is worth reading
3. that the reading experience will be calm and approachable

### 2.4.3 Cover identity anchor
The cover should include a quiet identity anchor in the **bottom-left corner**:
- avatar
- author name

This identity anchor should feel like:
- a byline on a paper page
- a quiet author signature
- a small trust marker

Not like:
- a social profile card
- a loud creator badge
- a UI chip competing with the summary

### 2.4.4 Cover/body consistency rule
The cover and body must feel like parts of the **same publication system**.

That means:
- same emotional temperature
- same paper / book-page feel
- same typography family logic
- same accent logic
- no dramatic cover-body style jump

The cover may be slightly more intentional and composed than body pages, but it must not look like it belongs to a different product or brand.

The summary block should feel like:
- a softly framed opening paragraph
- a curator’s introduction to the article
- an invitation into the reading flow

Not like:
- a marketing subtitle
- a brand slogan
- a tiny unreadable deck under the title

---

## 3. Proposed Palette Direction

The palette should be **warmer than a pure product UI, but less cozy than the references**.

### Candidate token set A — recommended default
```css
--color-bg: #F5F2EC;
--color-surface: #FAF7F2;
--color-surface-elevated: #F1ECE4;
--color-text: #1F2328;
--color-text-secondary: #6E6A64;
--color-accent: #B88447;
--color-accent-strong: #9A6C34;
--color-rule: rgba(95, 86, 76, 0.16);
--color-inline-code-bg: rgba(184, 132, 71, 0.10);
--color-blockquote-border: rgba(184, 132, 71, 0.42);
--color-table-header-bg: #EFE8DE;
```

### Candidate token set B — slightly more product / less warm
```css
--color-bg: #F4F2EE;
--color-surface: #FAF9F6;
--color-surface-elevated: #EEEBE6;
--color-text: #20252B;
--color-text-secondary: #6C7178;
--color-accent: #A97A45;
--color-accent-strong: #8C6436;
```

### Candidate token set C — slightly more editorial / more premium
```css
--color-bg: #F6F1E8;
--color-surface: #FBF7F0;
--color-surface-elevated: #F2EBDD;
--color-text: #231F1B;
--color-text-secondary: #746B61;
--color-accent: #B07A3C;
--color-accent-strong: #925E25;
```

**Recommendation:** start with **A**.

---

## 4. Current Code Touchpoints

### Primary files to modify
- `src/templates/theme-default.css`
- `src/stages/render-html.ts`
- `src/stages/screenshot.ts`

### Secondary files likely to update
- `README.md`
- `IMPLEMENTATION_LOG.md`

### Tests likely to update or extend
- `tests/stages/render-html.test.ts`
- `tests/stages/browser-smoke.test.ts`
- `tests/e2e/full-pipeline.test.ts`
- `tests/e2e/cli.test.ts`

### Fixtures to use for visual QA
Use existing real-ish fixture first:
- `tests/fixtures/agent-memory-design-comprehensive.md`

Use or add business/technical fixture if needed:
- `tests/fixtures/xiaohongshu-tight-lines.md`
- optional: `tests/fixtures/ai-business-essay.md`

---

## 5. Concrete Design Changes by Layer

## 5.1 Body theme (`src/templates/theme-default.css`)

### Change set
1. Replace dark background and dark-surface stack with light warm-neutral stack.
2. Remove the cinematic dark radial glow from `body`.
3. Reduce ornamental mood and increase report-like calm.
4. Keep large heading hierarchy, but tighten overall contrast so the page feels editorial instead of theatrical.
5. Keep emphasis visible, but use accent sparingly.

### Specific targets
- body background: flat or extremely subtle light gradient only
- body text: near-charcoal, not brown-black
- secondary text: warm gray
- block spacing: replace overly uniform spacing with deliberate grouped rhythm
- list markers: muted amber, not saturated gold
- inline code: light accent tint background with strong neutral text
- code blocks: pale technical surface, thin border, smaller corner radius if needed
- tables: report-like, low-noise, with clear grid lines
- blockquotes: editorial left rule + lightly tinted background, not quote-card drama

### Reading-friction targets
- consecutive related items should visually cluster together
- intro paragraph should feel attached to the heading it explains
- within-section subheads should not compete with section titles
- lower-order headings should look subordinate immediately, even before the reader reads the words

### Heading-system targets
- H1 = strongest essay / section marker
- H2 = clear structural subsection
- H3 = subordinate local label, not mistaken for H2

One acceptable direction:
- H1: serif, strong contrast, largest size
- H2: serif, smaller, slightly lighter, more restrained spacing
- H3: sans-serif or black-style face, smaller, lighter color, tighter spacing with following content

### Tone test
If a screenshot feels like:
- luxury brochure → too warm / too styled
- dev docs page → too cold / too product
- book excerpt → too literary / too soft

Adjust toward: **strategy memo with editorial polish**.

If a screenshot feels like:
- every paragraph stands alone
- all whitespace is equally distributed
- H2 and H3 look interchangeable

Adjust toward: **clear section blocks with lower reading friction**.

---

## 5.2 Block grouping and hierarchy strategy

This is first-class scope, not a secondary polish item.

### Goal
Turn the current linear markdown feel into a grouped editorial reading system.

### Strategy
1. Treat section openings as one visual unit.
2. Treat closely related lists as one cluster, not separate floating fragments.
3. Treat summary or takeaway lines as terminal emphasis within a section.
4. Create stronger separation between sections than within sections.

### Concrete styling directions
- tighten spacing between a heading and its immediate explanatory paragraph
- tighten spacing within grouped list sections
- use larger section breaks before the next H1/H2 cluster
- reduce the visual authority of H3 so it reads as subordinate scaffolding
- use typography and color to distinguish sibling levels immediately

### Non-goal
Do not simply add more lines, cards, or decorative containers. The fix is **clear grouping**, not more ornament.

---

## 5.3 Mermaid theme (`src/stages/render-html.ts`)

Current Mermaid theme variables are dark. Change them to match the light theme.

### Target behavior
- diagram background should disappear into page background or a very light panel
- node fill should use surface tokens
- borders should use accent or warm-neutral line tokens
- text should remain strong near-charcoal

### Proposed Mermaid token direction
```ts
background: '#F5F2EC',
primaryColor: '#FAF7F2',
primaryTextColor: '#1F2328',
primaryBorderColor: '#B88447',
lineColor: '#9C8A75',
tertiaryColor: '#F1ECE4',
```

---

## 5.4 First-page overlay (`src/stages/screenshot.ts`)

### Targets
- page masks should use the new light background token
- author/date row should feel quieter and lighter
- avatar border should be subtle, not glossy
- rule line should be warm-gray, not luminous accent
- END marker should be understated and paper-like

### Desired effect
The byline should feel like:
- essay metadata
- journal / longform opener
- publication frame

Not like:
- SaaS dashboard chrome
- cinematic poster overlay
- premium black-theme UI

Also ensure:
- first-page metadata does not compete with article title hierarchy
- metadata stays quiet enough that the first content block still reads as one grouped unit

---

## 5.5 Cover redesign strategy (`src/stages/screenshot.ts`)

The cover is the most important area to recalibrate.

### What to keep
- strong title hierarchy
- eyebrow / series label pattern
- byline row
- overall editorial composition

### What to change
- replace dark poster styling with light editorial cover styling
- remove black-luxury mood
- make hero image container optional-feeling and quieter
- let the title dominate without heavy dark contrast
- ensure the whole page signals "serious reading card" rather than "designed poster"
- make the summary text a first-class cover element rather than optional filler

### Proposed cover structure
- light warm-neutral background
- thin frame or no frame depending on cleanliness
- small uppercase eyebrow in warm gray
- title in near-charcoal
- a **summary text block** placed prominently enough to be readable at first glance
- author/date in subdued secondary color
- bottom-left avatar + author name as a quiet identity anchor
- optional hero region only if it supports the summary and does not split the page into loud visual zones

### Cover summary block behavior
- must comfortably support 50–300 Chinese characters
- should use a calmer reading style than the title: slightly smaller, lighter, more open leading
- should feel like one coherent reading block, not multiple scattered fragments
- should visually invite continuation into page 2
- should preserve generous margin and paper-like breathing room

### Cover composition rule
Do not center everything into a poster layout.
The cover should be composed around a readable editorial block: title + summary + quiet metadata, with a bottom-left identity anchor.
If the layout looks too symmetrical or too image-led, it will raise friction instead of lowering it.

### Cover/body consistency rule
When the user flips from cover to page 2, the transition should feel natural.
If the cover feels like a polished cream editorial card but the body feels like a different UI system, the design fails.
Color temperature, type mood, spacing logic, and paper feeling must stay coherent across both.

---

## 6. Implementation Tasks

### Task 1: Add / maintain plan document and freeze design goals
**Objective:** Make the target style explicit before touching code.

**Files:**
- `docs/plans/2026-04-18-warm-light-editorial-theme-plan.md`

**Verification:**
- The plan clearly states visual goals, non-goals, files, and verification flow.

---

### Task 2: Replace dark global tokens with warm light tokens
**Objective:** Move the base theme from dark premium to warm light editorial.

**Files:**
- Modify: `src/templates/theme-default.css`
- Test: `tests/stages/render-html.test.ts`

**Steps:**
1. Replace color tokens in `:root` with candidate token set A.
2. Remove the dark radial-gradient body background.
3. Keep typography scale initially unchanged; only change the color system first.
4. Ensure paragraph, heading, list, code, table, and blockquote colors still have clear contrast.

---

### Task 3: Rebuild spacing rhythm around grouped reading blocks
**Objective:** Reduce reading friction by making related content read as visual groups instead of evenly spaced fragments.

**Files:**
- Modify: `src/templates/theme-default.css`
- Test: `tests/stages/browser-smoke.test.ts`

**Steps:**
1. Define spacing tiers for intra-group, intra-section, and inter-section gaps.
2. Tighten heading-to-body spacing where the paragraph belongs directly under the heading.
3. Tighten grouped list spacing so related bullets/numbers feel like one cluster.
4. Increase separation between major section blocks.
5. Verify page scanability improves before changing decorative details.

---

### Task 4: Rebuild heading hierarchy for immediate legibility
**Objective:** Make H1 / H2 / H3 visually distinct enough that users do not need to infer hierarchy from content meaning.

**Files:**
- Modify: `src/templates/theme-default.css`
- Test: `tests/stages/browser-smoke.test.ts`

**Steps:**
1. Keep H1 as the strongest serif headline.
2. Re-style H2 to be clearly subordinate but still section-defining.
3. Re-style H3 with a more distinct visual grammar.
4. Tune spacing above and below each level so hierarchy is readable even in grayscale.
5. Re-render and inspect pages containing H1/H2/H3 together.

---

### Task 5: Re-style component surfaces for business/editorial reading
**Objective:** Make blocks feel like a technical/business reading card, not a dark design showcase.

**Files:**
- Modify: `src/templates/theme-default.css`
