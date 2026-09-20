# Decisions

Every technical choice made so far, what was considered and rejected, what is
knowingly imperfect, and what is still open.

A decision recorded here is settled — implement against it. A question in §5 is
not settled; surface the options and wait rather than picking one.

---

## 1. Stack

### React + TypeScript + Vite

**TypeScript, yes.** The "clean OOP" requirement lands best as real domain classes
and types on the client. It is also what keeps `domain/` on the frontend honest
against `models/` on the backend, since the same shapes are declared twice in
different languages.

**Caveat accepted up front:** class components are deprecated React practice. The
OOP lives in the domain and service layers on both sides; view components stay
functional. Flagged early so it was not a surprise later.

### Tailwind v4

Chosen over v3 on documentation and ecosystem support, verified rather than
assumed. v4 moved configuration into CSS via the `@theme` directive and turned
every theme value into a CSS custom property — which happens to be exactly what
light/dark switching and a per-category color palette need. It has the largest
ecosystem and best component-library support; v3 is now the legacy path.

### Flask + SQLAlchemy 2.0 + Marshmallow

App factory plus blueprints, declarative models with `Mapped[...]` annotations, a
service layer between routes and models, Marshmallow for serialization.

**Why an ORM at all:** it makes the eventual Postgres migration a change to one
connection string. Raw SQL would make it a rewrite. That single fact outweighs
every other consideration.

**Why Marshmallow, honestly:** it is one more dependency, and a few hand-written
validation functions would serve a prototype this size. It earns its place
because two clients will write to the same endpoint, and one declaration that
both validates input and shapes output is the mechanism that guarantees they
collect identical data. Not discipline — structure.

**Why a service layer:** two pages create visuals (submit now, editor later), plus
the seed script, plus any future CLI. If slug generation and tag attachment lived
in the route handler, each path would grow its own slightly different copy and
they would drift. `VisualService.create()` is written once; everything calls it.

### Ports

Flask on **5001**, not 5000 — macOS binds 5000 to the AirPlay Receiver and the
failure mode is a silent 403 from a service you did not know was running. Vite on
5173, proxying `/api` to Flask.

### Theme default

**Dark first** — supersedes the earlier "paper cream first" decision. The
site loads dark unless the visitor has explicitly toggled to light before
(persisted in `localStorage`, read before first paint to avoid a flash of
the wrong theme — see `frontend/index.html`). Both stay first-class; this
only decides the unauthenticated starting point. `useTheme.ts`'s
`readStoredTheme` has to distinguish "nothing stored yet" from an explicit
stored choice either way — with the old light-first default those collapsed
into the same code path by coincidence, and flipping the default would have
silently overridden a returning visitor's explicit light-mode choice if that
distinction weren't made explicit.

### Frontend fonts

Self-hosted via `@fontsource`, latin-only subsets — pulling the default
`400.css` etc. drags in cyrillic/greek/vietnamese subsets nothing here needs
and roughly quadruples the CSS payload for no visible difference.

### No router yet

`react-router-dom` isn't installed. `src/App.tsx` renders `Home` directly.
Adding a router before a second page exists to route to is exactly the kind
of premature abstraction this repo's conventions warn against; it goes in
when `/c/:slug` (or another route from §6) is actually built.

### Category nav: spinner + tree, not the horizontal arc

Superseded the first pass at `ArcNav` (a horizontal dome of category names)
with two separate surfaces, after seeing a mockup of a vertical rotary
picker:

**`CategorySpinner`** (vertically centered on the right edge, home page only). Infinite wraparound —
scrolling past the last category lands back on the first — which a real
DOM scroll position can't do without cloning content or faking the scroll
height. Instead it's driven by a virtual offset: a `wheel` listener
(`preventDefault`, so the page itself never scrolls) and `ArrowUp`/`ArrowDown`
both nudge a continuous value that's taken `mod categories.length`. The page
trades its native scroll for this on `/`, which is a deliberate tradeoff, not
an oversight — the spinner *is* the page's primary interaction here.

Geometry: a true circle whose center sits off-screen at the container's right
edge, so the selected category always sits at the circle's leftmost point and
categories before/after it swing up-and-right / down-and-right around it.
Adjacent categories are a **fixed** angular step apart (`ANGLE_STEP_DEGREES`
in `CategorySpinner.tsx`), not `360 / count` — dividing the full circle
evenly among as few as 4 categories would put immediate neighbors 90° from
the selected item, i.e. fully vertical, unreadable text. "No duplicates"
means exactly one point per category, not that they have to span the whole
circle. Wraparound needs no special-casing here: angles are periodic, so
rotating past a full lap is already seamless — unlike the earlier
slot-based approach this replaced, which needed a fractional-offset trick to
fake the same continuity.

**Layout: a real two-column flex row, not a `position: fixed` overlay with a
JS-computed scale factor.** The first version made the spinner `fixed` in
the corner and shrank its radius as a function of `window.innerWidth` to
keep it clear of the (centered) preview grid — a heuristic approximating a
constraint the layout didn't actually have. On a wide screen the two floated
further apart than looked good; on some window sizes the heuristic still
undershot and the spinner overlapped the grid. Home.tsx now gives the
spinner its own fixed-width flex column (`lg:flex` with a set width)
alongside the grid's column (`flex-1`, so it grows to fill whatever's left
and gets meaningfully bigger tiles on a wide screen); the browser's layout
engine makes overlap structurally impossible instead of approximately
unlikely, and `CategorySpinner.tsx`'s own geometry constants (`RADIUS`,
`CONTAINER_WIDTH`) go back to being fixed, tuned once for that column's
fixed width. Vertical centering is now `items-center` on that flex column
instead of a manual `top-1/2` / `-translate-y-1/2` transform on a fixed
element. The breakpoint also moved from `sm` (640px) to `lg` (1024px) — a
640px-wide left column left too little room for the now-bigger grid tiles,
so the tap-row fallback now covers tablet widths too, not just phones.

The dot marker is colored to match whichever category is currently active
(the same rounded index `onActiveChange` uses), not a fixed color — it's
what ties the dot to "these are that category's visuals" in the grid below.
Category colors are perceptually lightened for dark-mode text rendering
(`theme/categoryColor.ts`, applied uniformly to all categories rather than
special-casing the one — `#0039A6` — that prompted it): the stored hex is
still the canonical identity, this only affects how it's drawn as
foreground text on a dark background.

**`isActive` matches the committed index, not a distance threshold on the
continuous position.** The wheel handler advances `position` by
`deltaY * WHEEL_SENSITIVITY` per event, which doesn't land on exact integers
(each wheel tick is empirically ~1.02 steps, not 1) — a threshold check like
`Math.abs(diff) < 0.5 / count` drifts out of range after enough events and
can leave no category marked active. `count` growing from 4 to 9 (see below)
is what exposed this: the threshold shrinks with more categories, so the
same drift that stayed inside a 4-category threshold fell outside a
9-category one. Comparing directly against the same rounded index
`onActiveChange` already committed to is immune to the drift by
construction.

**Font size and category count.** Labels moved from `text-sm` to `text-lg`
and then to `text-2xl` (second pass, after feedback that the labels still
read too small at the bigger container), and `ANGLE_STEP_DEGREES` down
slightly (22° → 20°) to keep 9 categories' worth of bigger text from
crowding — see below for where the other 5 categories came from. `LABEL_GAP`
(a fixed px push past `RADIUS` applied to every label's `right` offset, on
top of the dot's own separate inset) exists for the same reason as the dot's
color: without visible daylight between the active label and the dot, they
read as one run-on element instead of two things pointing at each other.

Bumping the font surfaced a second-order problem: `CategorySpinner`'s own
geometry constants were tuned for the smaller font, and `getBoundingClientRect`
on the more-rotated labels (the ones several steps from active, where
rotation turns label *height* into real on-screen vertical — and, near
horizontal, into real on-screen width) showed their true bounding boxes
exceeding both `CONTAINER_WIDTH` and `CONTAINER_HEIGHT` — the container's own
`overflow: hidden` was silently eating the far end of the word (e.g.
"Circuits" rendering as "cuits"). That box's edges are a deliberate clip
(the left edge in particular is what keeps the spinner off the grid), so the
fix was giving labels more room inside it — `CONTAINER_WIDTH` 440 → 560,
`CONTAINER_HEIGHT` 420 → 620 — not loosening the clip. The height has ample
budget to spend: the column stretches to the page's full available height
and centers within it, so growing it doesn't compete with anything.

**`CategoryTreeNav`** (header). A Khan Academy–style two-column menu: a
fixed left list of categories, and a right pane — its own header plus a
`max-h` + `overflow-y-auto` scrollable topic list — that swaps to whichever
category is selected on the left. Backed by the `topics` table (see
`docs/ARCHITECTURE.md` §2) — `Programming > Data Structures > Stack`, as deep
as the data goes. Not the same job as the spinner: this is direct lookup for
someone who already knows what they want, the spinner is for browsing.

**Category restructuring (e.g. introducing "Math" as a parent of "Physics")
is explicitly not decided.** `topics` nest *within* a category; they don't
let a category nest inside another one.

**Five more categories: Design, Music, Economics, History, Religion.**
Colored with the rest of the real, unused NYC subway line colors — the two
CLAUDE.md had already reserved (`#B933AD`, the 7 train; `#FCCC0A`,
N/Q/R/W) plus three more (`#6CBE45` G train, `#A7A9AC` L train, `#996633`
J/Z train). That's every real subway line color spoken for now; a 10th
category needs an actual decision here, not an invented hex, since the
whole point of the palette is that it's real subway identity, not a
generated-to-taste one. None of the five have seed visuals yet — the empty
grid state (the dashed "Empty" placeholders) was already built to handle
that gracefully.

`run_seed` looks categories up by slug and only creates the ones missing
(`_get_or_create_category`), so it's safe — and necessary — to run again on
a database seeded before these five existed; it adds the new rows without
touching or duplicating anything already there. A `python run.py reset` (or
a from-scratch `python run.py seed`) picks them up automatically; a
dev database seeded before this change needs one `python run.py seed` run
to catch up, and won't get there on its own.

**The top-3 preview is a 4-column grid** (2 columns below `sm`, `max-w-3xl`
rather than `max-w-xl` so tiles read as genuinely bigger on a wide screen),
not a vertical list — visual cards fill the first slots, an `ExpandCell` is
always the last one. It's left-aligned, not centered with the hero text
above it — only the title/blurb stay centered. No separate category-name
heading above the grid either: the spinner and tree nav already say which
category is active, so repeating it there was redundant. `ExpandCell` reads
"See all visuals," not "+ Expand" — no border, no icon, deliberately
lighter-weight than the cards so it doesn't compete with them. It's disabled
rather than a dead link — `/c/:slug` isn't built, so there's nowhere for it
to go yet. No router either, per above.

`VisualPreviewCard` scales up on hover (with a shadow and a higher
`z-index` so it doesn't get covered by its grid neighbors) — the point is to
make a genuinely tiny thumbnail (an SVG shrunk into a 1:1 box) briefly
legible without needing a real lightbox or a second page. The title beneath
it does the same job for text: instead of `truncate`'s ellipsis, the full
title is always in the DOM and slides left on hover far enough to bring its
clipped tail fully into view (`translateX(-overflowPx)`, `overflowPx =
scrollWidth - clientWidth`, computed via `useLayoutEffect` since it depends
on rendered width, not string length), then eases back to the start on
mouse-leave. A title that already fits computes `overflowPx = 0` and simply
never moves. Transition duration scales with distance
(`overflowPx / 30` seconds, floored at 0.5s) so a long title and a short one
read as the same scroll *speed* rather than the same duration.

**`FibonacciSpiral`** (`components/FibonacciSpiral.tsx`) draws behind the
spinner's labels, tinted to the active category's color. It fills in
progressively as the spinner turns and resets to undrawn the instant it
wraps back to the first category — both for free, by reusing the spinner's
own continuous, wrapping `position` rather than tracking separate state:
`progress = (position mod count) / count` is 0 exactly when `position` is a
multiple of `count` (the first category), so the "restart" isn't a special
case, it's what that formula already does. The underlying curve is a
standard Fibonacci-squares construction (fixed at 8 terms regardless of
category count — more terms just makes for a bigger sprawling shape, not a
more correct one).

It's rendered as a grid of small squares along that curve, not a smooth
stroke — feedback on the first version (a thin anti-aliased `<path>`) was
that it should look like pixel/ascii art, i.e. a curve visibly built from
blocky steps, not a vector line. Re-deriving each arc's true center
analytically (needed to sample points along it) was more work than reusing
the browser's own arc math: `computePixelPath()` draws the exact same `d`
string into a detached, never-painted `<path>`, walks it with
`getPointAtLength` at a density fine enough not to skip a cell, and records
one grid cell each time the curve crosses into a new one — a
Bresenham-style rasterization, computed once (`useState`'s lazy
initializer) since the curve is static and the result never changes.
`progress` then reveals a prefix of that cell list instead of a
`stroke-dashoffset` fraction.

---

## 2. Visualization libraries

### The evaluation

**Chart.js** — Canvas, declarative config object. Its real advantage is that a
chart *is* JSON: it stores as data rather than code, renders without a sandbox,
and makes a form-driven creator trivial. Limits: canvas is raster, marks cannot be
CSS-styled, and it only does chart archetypes. Nothing on the moodboard is a
Chart.js chart.

**D3** — Not a chart library; a scales/layout/data-binding toolkit emitting SVG.
This is what the reference images actually are. The Kant cover is `d3-force`, the
stream graph is `d3.stack` with `curveBasis`, the Whitney curves are parametric
line generators, and the curved city-list navigation is `d3.line` or an arc. SVG
inherits the site's serif font and palette, scales on retina, and exports as PDF.
Cost: imperative, verbose, and it wants to own the DOM node.

**p5.js** — Creative coding with a `draw()` loop. Best for anything animated or
generative: Whitney harmonics, moiré, oscilloscopes, particle fields. Also what
LLMs produce most reliably for "make me a generative visual." Costs: raster canvas
that ignores site CSS, and animation loops that must be paused off-screen or a
3-column grid of tiles will cook a laptop fan.

**Plain SVG / Canvas / CSS** — Zero dependencies, instant load, the natural format
for static diagrams Claude writes directly. You rewrite scales and axes by hand,
so it stops paying off above a certain complexity.

**Observable Plot** — suggested as house style for quick plots: D3-quality SVG
output with Chart.js-level ergonomics, one-line specs. Not yet adopted.

### The decision

Round one ships **plain SVG + Chart.js + D3**, lazy-loaded. p5 and Vega come later
behind dynamic imports. The registry design means adding a kind touches one new
file and one registry line — nothing already working changes.

Approximate gzipped weights, to be verified before committing:
plain 0 · Chart.js ~60 KB · D3 ~90 KB · Observable Plot ~150 KB · p5 ~250 KB ·
Vega stack ~350 KB. Lazy loading matters more than any of these numbers.

### Sandboxing

Code-bearing kinds render in `<iframe sandbox="allow-scripts">` **without**
`allow-same-origin`. That combination makes the browser treat the frame as an
opaque foreign origin: the code cannot reach the page's DOM, storage, or
authenticated API. Blast radius of a malicious or broken paste is one rectangle.

`needs_sandbox` is computed on the server and sent down rather than recomputed in
React. A security rule implemented on both sides of a wire eventually disagrees
with itself.

---

## 3. Data model decisions

**Single-table inheritance by discriminator.** One `visuals` table with a `kind`
column rather than six tables with mostly identical columns. The alternative would
make the grid page join across all of them to render a mixed list.

**Slugs, not IDs, in URLs.** `/v/fourier-series` rather than `/v/47`. Generated
once from the title and then immutable, so links survive a rename. Uniqueness is
enforced by the column constraint; the `-2`, `-3` loop in `make_unique_slug` just
makes the common case produce a readable URL.

**`created_on` separate from `created_at`.** When the visual was made versus when
the row was written. A March sketch uploaded today shows March.

**`theme_affinity` as a field.** The moodboard splits cleanly — the Whitney cover
is designed for black, the Cornelius and Oxford covers for cream. A dark-designed
visual on a cream page looks broken. Three values: `adaptive` follows the site
theme, `light`/`dark` get matted instead.

**Resources as a table, not a JSON column.** Links are queryable things; "show me
everything citing this paper" is a reasonable future question and a JSON blob
answers it badly.

**Images on disk, path in the database.** Databases handle text well and binaries
badly, and keeping bytes on the filesystem makes the S3 move a storage-backend
change rather than a data migration.

**Tags deduplicate on slug, created on demand.** Lets the submit form be free text.
"Fourier Analysis", "fourier analysis", and "Fourier  Analysis" collapse to one
row; the first spelling wins as display name.

**Multi-tag filtering ANDs.** One join per tag rather than a single `IN` clause,
because adding a second tag should narrow a search, not widen it.

**Enums are `VARCHAR` + `CHECK`, not native.** `native_enum=False`. SQLite has no
ENUM type, and on Postgres a real ENUM needs a migration to add a value — this
keeps the Postgres move a connection-string change.

---

## 4. Write protection

No login, publicly writable. Three cheap independent layers, each covering a
different failure mode. All three were approved together.

**1. Write key.** A secret in the `X-Atlas-Key` header. Required to publish,
moderate, or delete. *Optional* on submission, where it decides queued-vs-live.

Uses `hmac.compare_digest`, not `==`. A plain string comparison exits at the first
mismatched character, so its timing leaks how many leading characters were
correct — enough, with enough requests, to recover the key one character at a
time.

Fails closed: an unset key means nobody can publish, rather than everybody can.

**2. Moderation queue.** Anonymous submissions land as `pending` and are excluded
from public reads. A pending slug returns **404, not 403**, so the queue cannot be
enumerated by guessing.

**3. Rate limit.** Sliding window per client address. Sliding rather than fixed
because a fixed hourly window lets someone send a full allowance at 10:59 and
again at 11:00 — double the intended rate across two minutes.

Keyholders are exempt: being locked out of your own atlas while bulk-importing
forty visuals would be a self-inflicted wound.

**Why layering matters:** forging `X-Forwarded-For` defeats the rate limit but not
the queue. Finding the submit endpoint defeats nothing at all.

### Deliberately open

`POST /visuals` and `POST /uploads` require no key. The whole point of the submit
page is that it works without one; the queue handles the risk. `PATCH` *is* key-
protected, because an anonymous edit could rewrite an already-approved visual and
the queue would never catch it.

---

## 5. Open questions

Not settled. Surface options and wait.

**1. Grid thumbnails.** Currently `VisualCardSchema` sends `source` only for SVG
visuals under 20 KB; everything else gets a placeholder tile. Generating real
thumbnails on upload means adding an image pipeline. Placeholder tiles, or worth
the dependency?

**2. Arc navigation scope.** Categories on the home page *and* topic titles on the
category page, or just the home page with a plain grid underneath? Still open —
the home page's `ArcNav` (`frontend/src/components/ArcNav.tsx`) only renders
categories today; whether the same treatment extends to a category page's
topics is undecided until that page exists.

**4. Moderation UI.** A `/review` page with publish/archive buttons, or approve
with curl for now?

**5. `attribution` wording.** Currently "Hand-authored" / "Generated by Claude
Opus 5" / "Claude Opus 5, edited by hand". One method on the model if you want it
phrased differently.

---

## 6. Known limits

Accepted trade-offs, each with the condition that would trigger a change.

| limit | consequence | change when |
|---|---|---|
| `create_all`, not Alembic | can add a table, cannot alter a column. schema change = `python run.py reset` | the schema stops moving daily |
| Rate limiter in process memory | per-worker counters, lost on restart | more than one worker. swap for Redis; the interface is one method |
| `X-Forwarded-For` is forgeable | a determined attacker rotates past layer 3 | never alone — that is why there are three layers |
| Slug loop is not race-safe | two simultaneous identical titles could both see a slug as free | the unique constraint already catches it; only the URL is less pretty |
| SQLite | breaks on ephemeral-filesystem hosts — a redeploy wipes the file | before hosting. one line in `config.py` |
| `verify.py` asserts nothing | prints for a human to read; not a real test suite | when the schema settles and brittle assertions stop costing more than they return |
| Chart.js is raster canvas | ignores site CSS, does not theme, does not export as vector | if theming charts becomes important — that is what Observable Plot would solve |

---

## 7. Roadmap

**Done — backend.** Models, services, schemas, three security layers, seven
endpoint groups, seed data, smoke test. Verified: moderation queue works in both
directions, write key rejects wrong and missing keys, rate limit trips at the
configured count and exempts keyholders, slug collisions resolve, non-empty
category delete returns 409.

**Next — frontend shell.** Vite + TypeScript + Tailwind v4, the theme tokens, the
five routes, the api layer, the domain types. Blocked on open questions 2 and 3.

**Then — renderers.** SVG, image, Chart.js, D3 behind lazy imports.

**Then — submit flow.** ConceptForm, upload, tag picker built from `/meta`.

**Then — moderation.** Blocked on open question 4.

**Later:**
- p5.js renderer, with loops paused off-screen
- Vega-Lite + the `/create` editor — CodeMirror 6 with a live sandboxed preview and
  a kind selector, roughly 400 lines, posting to the same endpoint as `/submit`.
  Vega-Lite is the only candidate with a real open-source editor and a JSON spec a
  GUI can drive; p5's Web Editor is self-hostable but is a whole application with
  its own auth and storage, so embedding it is heavier than rebuilding the useful
  10%.
- Postgres + object storage, once the MVP works
- Alembic, once the schema settles
- Observable Plot as house style for quick plots
