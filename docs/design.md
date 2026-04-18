# Design Documentation

This document captures the current visual/design system of `markdown2img`.

## Design goal

The current renderer is not aiming for generic markdown export.

It is aiming for:
- **mobile reading cards**
- **technical/editorial long-form content**
- **low reading friction**
- **high trust**
- **repeatable rendering from Markdown**

The desired feeling is:
- calm
- credible
- warm
- editorial
- technical without looking like UI chrome

---

## Current visual direction

The active theme is a **warm light editorial** system.

### Core traits
- warm paper-like background instead of pure white
- serif-forward reading texture
- restrained brown/charcoal palette instead of hard black
- clear hierarchy without loud decoration
- block grouping that reduces markdown-fragmentation feeling
- dedicated summary-led cover, not a generic title card

### Mood targets
The output should feel closer to:
- a thoughtful engineering essay
- an editorial reading card
- a long-form technical note prepared for mobile reading

It should feel less like:
- a slide deck
- a dashboard export
- a default blog theme screenshot
- a social poster with oversized visual gimmicks

---

## Cover design

## Current cover concept
The cover is currently **summary-led**.

That means:
- the cover does **not** rely on a hero image
- the summary itself is the subject
- the typography carries the composition
- the author identity sits quietly in the lower-left corner

### Cover composition
The current cover uses:
- warm off-white background
- subtle inset frame/border
- oversized opening quote mark
- autosized summary text block
- small signature block with avatar / author / date

### Why this approach
For technical/editorial writing, a summary-led cover is often more trustworthy than a title-only card because it:
- tells the reader what the piece is really about
- signals substance immediately
- avoids clickbaity title-lockup behavior
- feels closer to publication design than creator-promo design

---

## Cover typography

### Current cover font direction
The cover currently uses bundled **Noto Serif SC** as the primary serif face.

Why:
- official, redistributable font source
- strong Chinese support
- inline Latin glyphs that harmonize better with Chinese than mixed local-font stacks
- more unified editorial texture across Chinese and English

### Current cover typography goals
- large enough to feel like a real cover
- dense enough to feel substantive
- loose enough to remain readable
- calm enough to preserve trust

### Current cover tuning principles
When iterating on the cover, prioritize this order:
1. overall composition scale
2. summary readability / breathing room
3. quote integration
4. signature block scale
5. final line-break rhythm

Avoid solving everything by only changing font family.

---

## Body page design

## Body page goal
Body pages should read like a composed article, not a raw markdown dump.

### Core body traits
- serif body copy for slow-reading comfort
- controlled line length for mobile reading
- stable spacing rhythm
- clear H1/H2/H3 differentiation
- softened code/table/blockquote surfaces
- section grouping that makes related content feel visually connected

### Hierarchy strategy
The current design direction uses typography and spacing more than decoration.

That means:
- H1/H2/H3 should feel distinct at a glance
- H2/H3 should not depend on loud component-like ornaments
- spacing asymmetry should help show structure
- the page should reveal grouping before the reader fully parses the words

### Reading-friction principle
A page fails if it is technically correct but still feels:
- scattered
- uniformly spaced
- semantically flat
- too much like markdown syntax turned directly into styled blocks

The design goal is not just beauty. It is **comprehension at a glance**.

---

## Color system

### Current palette behavior
The current system prefers:
- warm paper background
- dark brown / warm charcoal text
- muted gold-brown accent for quote mark
- secondary metadata in softer brown-gray values

### Why not pure black/white
Pure black on pure white often feels harsher and less editorial for this use case.

The warmer palette helps the pages feel:
- calmer
- more readable over long passages
- less mechanical
- more publication-like

---

## Signature block

The lower-left signature block is intentionally understated.

Current function:
- identify the author/date
- anchor the composition
- act like a quiet signature, not a creator badge

Design principles:
- should remain subordinate to the summary/body text
- can scale slightly when the cover scales
- should never feel louder than the article itself

---

## Illustration / avatar philosophy

The system currently supports avatar imagery because author identity is part of the reading-card composition.

However, the avatar should ideally:
- not dominate the cover
- not visually fight the editorial tone
- remain simple and legible at small size

A playful avatar can work, but if trust/editorial seriousness is the top priority, the avatar should be evaluated as part of the design system, not as an isolated asset.

---

## Design constraints

The current design system intentionally accepts some constraints:
- one main theme rather than open-ended theming
- fixed portrait format
- typography-led composition
- local-file workflow
- deterministic rendering over interactive flexibility

These constraints are features, not accidental limitations.

They make the renderer easier to tune toward one strong publishing outcome.

---

## Design decisions that shaped the current theme

Recent major design shifts include:
- moving from image/title-led cover thinking to summary-led cover thinking
- removing `text-wrap: balance` from body headings when it caused awkward Chinese phrase splits
- removing overly componentized H2/H3 decoration in favor of calmer hierarchy
- replacing unreliable `file://` image loading with base64 embedding for article images
- introducing an official bundled serif cover font to unify Chinese/English cover typography
- iteratively enlarging and relaxing the cover so it feels substantial without becoming crowded

---

## Retrospective: what the discussion converged on

This section captures the most important conclusions from the full design discussion/iteration process.

### Final style summary
The agreed style is:
- **warm light editorial** rather than pure-white product UI
- **trust-building** rather than attention-grabbing
- **slow-reading** rather than scannable marketing poster
- **technical essay** rather than dashboard/module aesthetics
- **typography-led** rather than decoration-led

### Cover-specific conclusions
The cover should:
- behave like a **quote / summary page**, not a title banner
- explain the article immediately through `cover_summary`
- use a **quiet signature** in the lower-left instead of a creator badge feel
- keep the gold-brown quote accent because it adds warmth without becoming noisy
- grow as a **composition**, not only as isolated font size changes

### Body-page conclusions
The body should:
- reduce reading friction before chasing more visual polish
- use hierarchy and grouping to show structure at a glance
- avoid awkward Chinese balancing/wrapping tricks that look designed rather than natural
- rely on typography and spacing more than on decorative H2/H3 ornaments

### Typography conclusions
The discussion established these typography priorities:
- Chinese and inline English must feel like one system, not two adjacent systems
- official bundled fonts are preferred over opportunistic local-font mixes when the local mix feels mismatched
- larger text is good only when paired with breathing room; otherwise it becomes pressure, not authority
- quote marks, headings, and signature text should all feel like one editorial family

### Current body-typography gaps (observed in real article renders)
Recent visual review of user-generated body pages surfaced two body issues that now count as active design debt:
- mixed Chinese/English paragraphs are not broken, but they are still not fully smooth; long inline English phrases change the line texture too abruptly and make some lines feel more mechanical than editorial
- body spacing has crossed from readable into slightly over-loose; the line-height and paragraph rhythm make some pages feel a bit scattered instead of like a tightly composed long-form essay

These issues matter because they weaken the exact feeling the system is supposed to deliver:
- calm, but not drifting
- trustworthy, but not stiff
- slow-reading, but not sparse
- editorial, but not mechanically justified

For future body iterations, prefer this diagnosis order:
1. restore paragraph cohesion before changing the whole font strategy
2. improve mixed-language rhythm before adding any extra decoration
3. treat microtypography as part of trust-building, not cosmetic polish

### Explicit anti-patterns discovered during iteration
The discussion repeatedly rejected these directions:
- generic title-cover layouts
- over-decorated heading systems
- balanced Chinese heading wraps that split phrases awkwardly
- visual polish that improves beauty but not readability
- typography that feels fashionable but not trustworthy

---

## Value of the current design direction

The current design system creates value in four ways:

### 1. Reader value
- easier to keep reading on a phone
- faster comprehension of structure
- less visual fatigue

### 2. Author value
- Markdown can become publishable cards without design-tool relayout
- one coherent visual system can be reused across articles
- cover quality no longer depends on having a hero image

### 3. Brand value
- output looks more like thoughtful publication design than AI-content commodity templates
- trust comes from restraint and clarity, not from loud styling

### 4. Product value
- the renderer now has a clearer visual identity
- future design work has a stable reference style instead of vague “make it nicer” goals

---

## What to preserve in future design work

If the visual system is extended later, preserve these qualities:
- trust before spectacle
- reading comfort before decorative flourish
- grouping/hierarchy before palette polishing
- stable editorial typography before creative experimentation
- one coherent cover/body system instead of separate unrelated styles

---

## Anti-goals

The current design is explicitly not trying to be:
- flashy marketing creative
- social-media template with heavy visual gimmicks
- generic CMS/blog screenshot
- slideware with oversized UI decorations
- design-tool replacement for arbitrary layout work

---

## Design review checklist

When reviewing a new output, ask:
- Does the cover explain the piece, or just label it?
- Does the page feel calm enough to invite reading?
- Can I see the content grouping before reading in detail?
- Do H1/H2/H3 feel like one coherent editorial system?
- Do Chinese and English mixed lines feel typographically compatible?
- Does the avatar/signature help the composition instead of distracting from it?
- Is the result publishable as a mobile reading card without manual design-tool cleanup?
