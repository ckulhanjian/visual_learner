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

**`CategorySpinner`** (vertically centered on the right edge, home page only).
It's driven by a virtual offset, not a real DOM scroll position: a `wheel`
listener (`preventDefault`, so the page itself never scrolls) and
`ArrowUp`/`ArrowDown` both nudge a continuous `position` value. The page
trades its native scroll for this on `/`, which is a deliberate tradeoff, not
an oversight — the spinner *is* the page's primary interaction here.

**Discrete, not infinite — `position` is clamped to `[0, slots.length - 1]`,
not wrapped.** An earlier version wrapped `position mod categories.length` so
scrolling past the last category landed back on the first, seamlessly (angles
are periodic, so that needed no special-casing). Feedback asked for a real
start and end instead, so `movePosition` now clamps with `Math.min`/`Math.max`
rather than modulo — the spinner stops at both ends rather than looping.
`MAX_VISIBLE_DIFF` exists because of that change: without wraparound bringing
a far-off label back around, scrolling far enough would otherwise swing a
label's angle past vertical and toward the *opposite* side of the circle, so
labels more than a few steps from active simply stop rendering instead
(matching how faded-out — near the opacity floor — they already were at that
distance).

**`slots` is `[HOME_CATEGORY, ...categories]`, not just the fetched
categories.** `HOME_CATEGORY` (`domain/Category.ts`) is a local constant, not
a row from the API — slug `'home'`, position `-1` — that always occupies slot
0. It's what "discrete start" *is*: the run starts on it, not on the first
real category, and Home.tsx renders it as "nothing selected yet" (see below)
rather than as a category with an empty grid. Scrolling back to it from
Physics is symmetric with scrolling to it from anywhere else — there's no
separate "has the visitor ever scrolled" flag, just whichever slot `position`
currently rounds to.

Geometry: a true circle whose center sits off-screen at the container's right
edge, so the selected category always sits at the circle's leftmost point and
categories before/after it swing up-and-right / down-and-right around it.
Adjacent categories are a **fixed** angular step apart (`ANGLE_STEP_DEGREES`
in `CategorySpinner.tsx`), not `360 / count` — dividing the full circle
evenly among as few as 4 categories would put immediate neighbors 90° from
the selected item, i.e. fully vertical, unreadable text. "No duplicates"
means exactly one point per category, not that they have to span the whole
circle.

**The active label grows (`text-2xl` → `text-3xl`) instead of just gaining
opacity.** Landing on a category was otherwise signaled only by color and a
faint size-independent brightening — a discrete size change reads as a much
clearer "this one is selected" the instant `position` settles, with
`transition-[font-size]` softening the jump rather than snapping it.

**A short `navigator.vibrate(10)` fires whenever the committed index
actually changes** (inside `commitIfChanged`, guarded with `?.` since it's
unsupported on desktop browsers and iOS Safari — a silent no-op there, not an
error). Deliberately short: long enough to read as a click-stop confirming
the landing, not a buzz.

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

**Labels are `font-body italic`, matching the hero title, not `font-mono`.**
Feedback asked for this explicitly — CLAUDE.md's design language calls for
mono on "titles and code" generally, but the hero itself is already set in
italic EB Garamond (a documented earlier decision), and the spinner reads as
part of that same headline moment, not as UI chrome or code. Applied to both
the desktop spinner labels and the small-viewport tap-row fallback, so the
two don't disagree with each other.

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
`CONTAINER_HEIGHT` 420 → 620 — not loosening the clip.

That second number turned out not to have the "ample budget" its own comment
claimed. `CONTAINER_HEIGHT` sizes a plain block div, and a flex child holding
one can't shrink below it (flexbox's default `min-height: auto`) — so on a
window short enough that `main` doesn't have 620px of slack after the
header, footer, and its own vertical padding, the whole page grew taller
than the viewport to fit it, pushing the footer below the fold. On an
ordinary laptop-height window (≈720–800px) that's not an edge case, it's the
common one — reported as "the footer disappeared." Fixed by capping the
actual CSS height at `min(620px, 65vh)` rather than applying 620 directly:
tall windows still get the full 620 (no clipping regression), short ones
get a smaller box and clip their farthest labels a little sooner instead of
pushing the footer off-screen — the right side to give up, since a
half-faded label near the edge of its visibility range is a smaller loss
than the footer becoming unreachable without scrolling.

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

**The left column (from the page's left edge to the spinner's fixed-width
column) is the page's whole "workspace," and everything in it centers or
fills against that box, not the full viewport.** Originally the hero
text stayed centered but the grid below it went left-aligned at `lg`,
reasoning that a grid capped at `max-w-3xl` centered under a `max-w-xl`
hero would look arbitrarily offset either way. Feedback reversed this: the
hero text centers in the workspace at every width (no `lg:text-left`
override), and **the top-3 preview grid now fills the workspace's full
width** (`w-full`, no `max-w-3xl` cap) rather than being capped and
left-aligned — both read as "centered/sized within this specific box," not
within the page as a whole, which is what the workspace column actually is.
Tiles get genuinely large on a wide screen as a direct consequence, which is
the point, not a side effect to guard against.

A brief `mt-6 pl-6/pl-10` on the grid (nudging it down and right of the
hero) turned out to be the wrong tool once centering the grid with the hero
came up explicitly: one-sided padding shifts a `w-full` element's visible
content off-center from its own box (the padding eats space on the left
only), which is exactly what broke the earlier "the grid should read as
centered under the hero" intent. Removed — see the two-position hero below,
which handles "the grid sits lower" a different way, and plain `w-full`
(no side padding) keeps the grid's center exactly matching the hero's,
since both are centered/sized against the same box.

**The hero has two positions, not one, and HOME_CATEGORY (see above) is
what switches between them.** While it's the active slot — nothing "really"
selected yet — the hero is the only thing in the workspace and sits
vertically centered in it; the instant `position` moves to any real
category, the hero snaps to a pinned position near the top and the grid
appears below it. Both positions apply the same extra `VERTICAL_NUDGE_FRACTION`
(10% of the available height) on top of their "natural" spot (dead center,
dead top) — a flat "move it lower" applied identically rather than tuned
per-position.

Implemented as a `transform: translateY(...)` on a wrapper around the hero
(and, when present, the grid) rather than switching `justify-content`
between the two states: a flex alignment change can't be transitioned by
CSS, but a `transform` can, so this is what makes "the title and text move
into their spot" an actual animation instead of a jump cut. The offset is
computed against `main`'s own content-box height (`clientHeight` minus its
own padding, read via `getComputedStyle`) — not the workspace column's own
`clientHeight`, which is unreliable here: `align-items` computes to `normal`
in this stack (Tailwind's preflight doesn't force `stretch`), so a flex-row
child with `h-full` doesn't actually inherit the row's cross size. Desktop
only (`useIsDesktopWidth`, shared now — see `hooks/useIsDesktopWidth.ts`):
a `transform` repaints without reserving layout space, which is invisible
at `lg` (the spinner lives in its own separate flex-row column, indifferent
to this content's height) but caused a real bug below it — `CategorySpinner`'s
mobile tap-row sits directly after this column in normal document flow, so
shifting the grid down without reserving that space visually overlapped it.
Below `lg` the offset is just always 0.

**The top-3 preview is a 4-column grid** (2 columns below `sm`), not a
vertical list — visual cards fill the first slots, an `ExpandCell` is always
the last one. No separate category-name heading above the grid either: the
spinner and tree nav already say which category is active, so repeating it
there was redundant. `ExpandCell` reads "See all visuals," not "+ Expand" —
no border, no icon, deliberately lighter-weight than the cards so it doesn't
compete with them, and it italicizes on hover rather than gaining a border
or background, for the same reason. It's disabled rather than a dead link —
`/c/:slug` isn't built, so there's nowhere for it to go yet. No router
either, per above.

`ExpandCell` dropped `aspect-square` in favor of `flex flex-col justify-end`
— a visual card's own `<li>` is taller than a bare square (image plus its
title/summary text below), and CSS grid's default `align-items: stretch`
already sizes every cell in the row to match the tallest one, so the fix
for "line the text up with the bottom of the cards" was bottom-aligning
this cell's own content, not fighting the grid for height.

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

**`Spiral`** (`components/Spiral.tsx`) draws behind the spinner's labels,
tinted to the active category's color, filling in as `position` advances
through the discrete run: `progress = position / (slots.length - 1)`, 0 at
`HOME_CATEGORY` and reaching 1 at the last real category. Unlike the old
wraparound spinner this never resets on its own — there's no lap to
complete, so it reads as a progress indicator for the run rather than an
animation that loops.

It went through two earlier versions this replaced outright, not
incrementally patched, each superseded by later feedback rather than kept
around behind a flag:

1. A **Fibonacci-squares construction** (quarter-circle arcs chained
   through squares sized by the Fibonacci sequence) — abandoned once
   feedback asked for "just...a spiral," not a golden-ratio shape tied to
   a specific mathematical sequence.
2. A **pixel/ascii-art rasterization** of that curve (`computePixelPath`, a
   detached `<path>` walked with `getPointAtLength` and bucketed into grid
   cells, rendered as small `<rect>`s) — abandoned once feedback asked for
   "a circle spiral, not pixel dots," reversing the earlier ask for a
   blocky read.

`Spiral` is neither: a plain **Archimedean spiral** (radius grows linearly
with angle, `r = t * MAX_RADIUS`, `θ = t * TURNS * 2π`), matching a
hand-drawn reference image of concentric loops. No SVG primitive expresses
that curve directly (arcs are circular, not spiral), so it's a dense
polyline — enough samples (140, ~2.75 turns) that individual segments don't
read as facets at the size it's rendered — revealed with the same
`pathLength="1"` + `stroke-dashoffset` technique as its predecessors, since
that part of the mechanism was never the problem.

**Tucked into the one strip of the listbox no label or the dot ever
reaches**, not centered behind them. Every rendered label's `right` offset
(`LABEL_GAP` + `RADIUS * cos(angle)` across the visible diffs) falls in
roughly `[63.5, 204]`, and the dot sits at `RADIUS - 16 = 154` — so
`right: 0` to `~60` is dead space at every rotation. `SPIRAL_SIZE` (56)
and its position (`right-1`) fit inside that strip — an earlier, much
larger version sat centered behind the dot and active label instead, the
one spot guaranteed to always have something else on top of it.

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
