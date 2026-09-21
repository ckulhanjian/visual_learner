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

### Renamed to Intueri

The site was "Atlas" (the header logo, `<title>`, the footer's copyright
line, the hero's own working title). Renamed to **Intueri** — the Latin
verb the footer now glosses ("to look inside," "to contemplate," "to gaze
at," the etymological root of "intuition") — with the hero heading changed
to "The Art of Visualization" to match. Scoped to what's actually
user-facing text: the logo, page `<title>`/meta description, footer, and
hero heading changed; internal, non-user-facing identifiers that happen to
share the old name — the `ATLAS_ENV`/`ATLAS_WRITE_KEY` env vars, the
`X-Atlas-Key` header, the `atlas-theme` `localStorage` key — did not.
Renaming those is a real backend/API-contract change (and, for the
`localStorage` key, would silently drop every returning visitor's saved
theme choice) that nothing about a display-name change calls for on its
own; CLAUDE.md's own security invariants document `X-Atlas-Key` by that
exact name, so changing it needs its own decision, not a side effect of
this one.

### Renamed to Achk

Renamed again, from **Intueri** to **Achk** — the Armenian word for "eye"
(աչք) — with the footer's etymology gloss updated to match ("Achk (աչք) is
the Armenian word for 'eye.'"). Same scope as the Intueri rename above and
for the same reason: the logo, page `<title>`/meta description, and
footer changed; the hero heading was not touched this time (no new
heading was requested to replace "The Art of Visualization"). The
internal `ATLAS_*`/`X-Atlas-Key`/`atlas-theme` identifiers again stay as
they are, unaffected by a display-name change.

### Frontend fonts

Self-hosted via `@fontsource`, latin-only subsets — pulling the default
`400.css` etc. drags in cyrillic/greek/vietnamese subsets nothing here needs
and roughly quadruples the CSS payload for no visible difference.

### Router added with the second page, not before it

`react-router-dom` wasn't installed while `Home` was the only page —
adding a router before a second page exists to route to would have been
exactly the kind of premature abstraction this repo's conventions warn
against. `/c/:slug` (§6) is that second page, so `App.tsx` now holds a
`<BrowserRouter>`/`<Routes>` pairing `/` and `/c/:slug` to `Home` and
`CategoryPage`. Nothing else in the decision changes: a third page still
just adds a third `<Route>`, not a rethink.

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

**That `65vh` cap narrowed the problem, it didn't close it.** Feedback:
"due to the nature of the scrolling on home page, you can't see the footer
because it is slightly larger than screen height." The page's root was
`min-h-screen` — a *floor*, not a ceiling — so whenever the combined
content (header + hero/grid + spinner) needed even a little more than
100vh, the whole flex column grew past the viewport and the footer sat
below the fold, requiring a page scroll to reach. `Home.tsx`'s root is now
`h-dvh overflow-hidden` (a fixed target equal to the real viewport height,
`dvh` rather than `vh` so it accounts for mobile browser chrome) instead
of `min-h-screen`, with `main` given `flex-1 min-h-0 overflow-y-auto`:
header and footer keep their natural heights, `main` gets exactly
whatever's left, and if its own content still doesn't fit, *it* scrolls
internally rather than displacing the footer. The footer is now always
on-screen without scrolling the page to see it, at the cost of an
internal scrollbar on `main` in the rare case content still overflows —
the right side to give up here too, for the same reason as the `vh` cap
above.

**`CategoryTreeNav`** (header) went from a Khan Academy–style topic tree to
a bubble picker — a full redesign, not a tweak. The original was a fixed
left list of category names and a right pane showing the selected one's
`topics` (its own header plus a scrollable list, swapping on click).
Feedback replaced this outright: every category now renders as a circle
sized by its own published-visual count (`bubbleSize`, linearly
interpolated between `MIN_BUBBLE` and `MAX_BUBBLE` against whichever
category has the most), outlined and labeled in its canonical subway color
but filled with a near-white pastelized version of it
(`theme/categoryColor.ts`'s `pastelize`, an 0.85 blend toward white — much
further than `displayColor`'s dark-mode 0.32, since this fill is meant to
read as barely-there regardless of page theme, not as a dark-mode
adjustment of it). The right pane now shows that category's **visuals**,
not its topics — hovering a bubble selects it (not clicking; browsing
several categories shouldn't cost a click each), with a grey circle behind
the hovered bubble as the only additional hover cue. Clicking a bubble is
the real navigation, to `/c/:slug` — the dropdown's one interactive
destination now that page exists. Not the same job as the spinner: this is
direct lookup for someone who already knows what they want, the spinner is
for browsing.

That grey hover circle needed the page's actual `theme` value, not
Tailwind's `dark:` variant — this app's dark mode is a manually toggled
`data-theme` attribute (`useTheme.ts`), independent of
`prefers-color-scheme`, so a `dark:` utility class here would silently
never fire when the two disagree. `pastelize`/`displayColor` already take
`theme` as a plain value for the same reason; the bubble's hover backdrop
follows the same rule instead of introducing the one place that doesn't.

**The topics-based frontend is gone, not just unused.** Nothing renders a
topic any more, so `api/topics.ts` and `domain/Topic.ts` were deleted
rather than left as dead code with no caller. The backend model, the
`GET /topics` endpoint, and the `topics` table itself are untouched — they
remain real, valid infrastructure, just not currently called from the
frontend. A future feature that wants a topic tree again reads from the
same endpoint; nothing about removing the frontend plumbing changes what
the backend can serve.

**The dropdown widens with the categories it now has to show
(`min(34rem, calc(100vw - 3rem))`, not a flat `26rem`), and stacks
vertically below `sm`** (bubbles above, the visuals pane below, rather than
side-by-side) — the wider fixed panel that comfortably fit nine bubbles
plus a right pane at desktop widths overflowed a 390px phone screen
entirely off the right edge otherwise, taking the whole visuals pane out
of view along with it.

**`CategoryTreeNav` superseded again: moved out of the header entirely,
onto its own page.** The dropdown above — bubbles plus a hover-to-preview
visuals pane, backed by a pastel fill — was itself replaced after
feedback ("I want a separate page for categories... this is where the
circle will live... it can just be an embedded chart"). `CategoryTreeNav.tsx`
is deleted; `SiteHeader`'s "Categories" element is now a plain `Link` to a
new route, `/categories` (`CategoriesPage.tsx`), which renders the bubbles
as `CategoryBubbleChart.tsx` — one `GET /categories` call, no per-category
visuals fetch, no hover state. Clicking a bubble is the only interaction:
straight to `/c/:slug`. The hover-to-preview-visuals pane was dropped
rather than carried over — "just an embedded chart" and a page with room
to show name and count directly on each bubble both argued against
reproducing a popover's compromises on a page that no longer needs them.
If hover preview turns out to be missed, it can come back; nothing about
deleting it was load-bearing elsewhere.

**Fill removed, text set to plain white — explicitly provisional.**
Feedback on the pastel-filled version was "I don't like the design of
them, remove the fill for now and just use white text." `CategoryBubbleChart`
implements this literally: `border-2` in the category's own subway color,
no `background`, name and count in flat `text-white` — not run through
`displayColor`/`pastelize` or branched on `theme` at all, since the
instruction was for a specific fixed color, not a lightened one.
**Known limit, not yet addressed:** white text on the light-theme cream
background is low-contrast to the point of being hard to read — "for now"
in the feedback is read literally, so this hasn't been fixed
unilaterally. Revisit if asked, e.g. theme-conditional text color or an
outline/shadow behind the label.

**The header hover dropdown came back, alongside the `/categories` page,
not instead of it.** Feedback after the above: "when you hover on
categories button, show the dropdown like before (same hover effects)."
`CategoryTreeNav.tsx` is restored, opening on hovering the header's
"Categories" link itself (`onMouseEnter`/`onMouseLeave` on the wrapping
container) instead of a click that toggled `open` state, so browsing
doesn't cost a click just to see it — and hovering an entry inside it (not
clicking) still shows that category's visuals in a pane on the right, same
as before. The link inside stays a real `Link` to `/categories`, so
clicking it (rather than an entry) goes to the dedicated page instead of
doing nothing. `SiteHeader` fetches `categories` again to hand to it, same
as before the dropdown was deleted — falling back to a plain link to
`/categories` while that fetch is loading or failed, so the header never
has nothing to click. Two surfaces doing overlapping jobs (a quick hover
preview vs. a full clustered page) was a deliberate answer to the ask, not
an oversight: the dropdown is for a glance without leaving the page, the
page is the "embedded chart" asked for two rounds ago — neither replaces
the other now.

**The dropdown's contents reverted to a plain list, not bubbles — twice
now, in two rounds.** First restored with the same small pastel-filled
bubbles and grey hover backdrop the pre-deletion version had. Immediate
follow-up feedback: "do not display circle, only categories names as a
list. same as how it was prior." Read as "prior" meaning before bubbles
existed here at all, not the immediately preceding round —
`CategoryTreeNav`'s left column is now a plain `<ul>` of category names
(colored via `displayColor`, with the published count alongside in
parens), no circle/icon of any kind, no `bubbleSize`/`pastelize` — those
belong to the bubble chart on `/categories` now, not this dropdown. The
hover-to-preview-visuals pane on the right is unchanged; only what the
left column renders changed, since nothing in the feedback asked for that
pane to go.

**Fixed: the dropdown closing before the pointer reached it.** Reported
directly: "when i try to hover on categories and then hover on the
dropdown, the dropdown disappears." The panel was positioned with `mt-2`
(a margin) below the link, inside a `relative` container whose
`onMouseEnter`/`onMouseLeave` controlled `open` — but a *margin* creates
empty space that belongs to neither the link nor the panel, so a straight
mouse path from one to the other crossed a strip covered by no element at
all. The container's hoverable area is exactly the union of its
descendants' boxes; crossing that dead strip counted as leaving the
container, which fired `onMouseLeave` and closed the dropdown before the
pointer ever reached the panel. Fixed by moving the visual gap from a
margin on the panel to `pt-2` padding on a new wrapper directly around it:
padding is still part of an element's own hit-tested box (only margin
creates dead space), so the wrapper now sits flush against the link
(`top-full`, no margin) and the mouse never leaves any element while
crossing what's visually still an 8px gap. Verified with a Playwright
script that walks the pointer down in small steps from the link toward
the panel, asserting the dropdown never disappears mid-path.

**Bubble clustering on `/categories`: a small circle-packing relaxation,
not a grid.** Feedback: "I want the bubbles to be more clustered and
layered... like a poster... restricted on left and right by 20%, and 5%
top and 10% bottom whitespace" (a rough gloss on the attached Pareto-cluster
reference image — variously sized circles clustered together, some
overlapping — used for the *arrangement*, not a pixel spec). `CategoryBubbleChart`
measures its own container (`ResizeObserver`, no dependency needed —
`clientWidth`/`clientHeight` in pixels) and computes a bounding box inset
by those margins (`MARGIN_X = 0.2`, `MARGIN_TOP = 0.05`,
`MARGIN_BOTTOM = 0.1`) — in pixels off the *measured* box, not CSS
percentage padding, since percentage `padding-top`/`padding-bottom` is
defined relative to the containing block's *width* in CSS, not its height,
which would have made the top/bottom margins wrong on anything but a
square container.

No d3-force dependency (still deferred, per §2 below) — `packBubbles` is a
from-scratch minimal relaxation: bubbles seed along a golden-angle
(phyllotaxis) spiral scaled to the box, biggest category nearest center
(sorted descending by `publishedCount`), then a fixed number of passes
nudges every overlapping pair apart along the line between their centers
and clamps every bubble back inside the margin box. Bubbles keep their
existing no-fill/white-text styling from the round above unchanged — this
decision is about placement, not appearance.

**Follow-up feedback reversed the "residual overlap is the look" call
above: "make sure nothing overlaps even on hover (animation to grow)."**
The first version accepted leftover overlap where 200 relaxation passes
weren't enough to fully separate everything inside the restricted margin
box, reading that as the intended "layered" effect the clustering request
implied. It wasn't — asked to remove outright, including the case the
first version didn't even consider: bubbles already just touching at rest
would still overlap the instant `hover:scale-105` grows one by 5%. Fixed
with three changes to `packBubbles`: (1) the pairwise minimum-distance
check now multiplies the resting sum-of-radii by `HOVER_SAFETY_FACTOR`
(1.12, a little past the 5% hover growth so grown bubbles clear each
other with room to spare, not exactly meet), so "resolved" already accounts
for the hover state, not just the resting one; (2) a real `hasOverlap`
check after relaxation replaces trusting "no pair moved this pass" as a
proxy for "no pair overlaps" — those aren't the same claim if passes run
out early; (3) when overlap survives a full relaxation (the margin box
genuinely isn't big enough for every bubble at its natural size — the
common case on a narrow viewport), every bubble shrinks by `SHRINK_FACTOR`
(0.88) and the whole relaxation runs again, up to `MAX_SHRINK_ATTEMPTS`
(6) times, rather than shipping bubbles that touch. Passes per attempt
also went up (200 → 800) since the extra safety margin means more pairs
need resolving before the layout stabilizes. Verified with a Playwright
script measuring the actual on-screen gap between every pair of bubbles —
at rest, and again while hovering each bubble in turn — asserting every
gap stays positive.

**Category restructuring (e.g. introducing "Math" as a parent of "Physics")
is explicitly not decided.** `topics` nest *within* a category; they don't
let a category nest inside another one. (This remains true of the data
model regardless of whether the frontend currently browses it as a tree.)

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

**`python run.py serve` now runs that same seed automatically, outside
production.** The paragraph above was the answer the first three times a
newly added category didn't show up somewhere — a real, reproducible
database bug would have been fixed once, but "the fix is a command you
have to remember to separately re-run every time seed.py changes" kept
recreating the same report. `run_seed()` is per-category
get-or-create — additive, idempotent, safe to call on every startup — so
`serve` calls it right after `db.create_all()`, gated on
`app.config["ATLAS_ENV"] != "production"`. That gate is the whole point:
a live database is not a demo to keep topped up, and this must never
silently write to one. Development and testing are exactly the
environments where "always current with seed.py" is worth having and nothing
is at risk if it's wrong.

**The left column (from the page's left edge to the spinner's fixed-width
column) is the page's whole "workspace," and everything in it centers or
fills against that box, not the full viewport.** Originally the hero
text stayed centered but the grid below it went left-aligned at `lg`,
reasoning that a grid capped at `max-w-3xl` centered under a `max-w-xl`
hero would look arbitrarily offset either way. Feedback reversed this: the
hero text centers in the workspace at every width (no `lg:text-left`
override). The grid's own width and position went through two more rounds
after that — first filling the workspace's full width to read as
"centered/sized within this specific box" (`w-full`, no `max-w-3xl` cap,
same center as the hero above it), then explicitly shifted off that center:
`ml-[20%] w-4/5`, a flat "move it right" that intentionally gives up
matching the hero's center in exchange for the grid reading as more
deliberately offset rather than dead-centered. Tiles are still genuinely
large as a result of the width change, which was always the point of that
part, independent of where the block sits horizontally.

A brief `mt-6 pl-6/pl-10` on the grid, in between those two, turned out to
be the wrong tool for a similar-sounding ask: one-sided padding shifts a
`w-full` element's visible content off-center from its own box (the
padding eats space on the left only) rather than actually moving the
element, which is a different thing from the margin-based shift that
replaced it. Superseded, not layered on top of.

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
this cell's own content, not fighting the grid for height. It also dropped
`items-center`: a visual card's title/summary starts flush against its own
cell's left edge, so centering this button horizontally made it float out
of step with them rather than reading as the row's 4th member. Default
(`stretch`) cross-axis alignment lets the button fill the cell's width, so
its own left-aligned text lands at that same left edge instead.

**The "Empty" placeholder mirrors `VisualPreviewCard`'s own structure —
an `aspect-square` area plus a title/summary text block below it, the
latter `invisible` rather than absent — instead of being a bare
`aspect-square` div.** `ExpandCell`'s stretch-to-row-height fix above only
half-solved the "See all visuals" alignment: it was correct whenever every
cell in the row was equally short (a category with zero visuals, where all
three preview slots are `Empty`), but a bare `aspect-square` div doesn't
stretch — an item with an aspect ratio and a definite width computes its
own height from that ratio rather than filling a taller grid row — so in a
*mixed* row (some real cards, one `Empty`), the placeholder stayed pinned
to its own short square while the row grew to fit the real cards, stranding
it well above where `ExpandCell`'s bottom-aligned text landed in that same
row. Giving `Empty` the same two-part shape as a real card, sized by the
same classes (so the reserved text height stays correct at any column
width without a hardcoded pixel value), makes its natural height match a
real card's regardless of what else is in the row — mixed or not.

`VisualPreviewCard` scales up on hover (with a shadow and a higher
`z-index` so it doesn't get covered by its grid neighbors) — the point is to
make a genuinely tiny thumbnail (an SVG shrunk into a 1:1 box) briefly
legible without needing a real lightbox or a second page. The title beneath
it briefly did the same job for text — the full title stayed in the DOM
past `truncate`'s ellipsis and slid left on hover to bring its clipped tail
into view — but feedback asked for that movement removed. Back to plain
`truncate`: an ellipsis on overflow, static, no measurement or transition
machinery to go with it.

**The decorative spinner spiral is gone — removed outright, not replaced
again.** It went through three versions across three rounds of feedback (a
Fibonacci-squares construction of chained quarter-circle arcs; a
pixel/ascii-art rasterization of that same curve into a grid of small
squares; a plain Archimedean spiral, `components/Spiral.tsx`, matching a
hand-drawn reference image), each superseded outright rather than kept
behind a flag, before the final round asked for it to simply not be there.
`CategorySpinner` no longer imports or renders anything in that spot; the
dot marker and labels are unaffected, since the spiral only ever drew
*behind* them. If a decorative element goes there again, it starts from
this history rather than re-discovering it: whatever shape it takes, tuck
it into the one strip of the listbox no label or the dot ever reaches —
every rendered label's `right` offset (`LABEL_GAP` + `RADIUS * cos(angle)`
across the visible diffs) falls in roughly `[63.5, 204]`, and the dot sits
at `RADIUS - 16 = 154`, so `right: 0` to `~60` is dead space at every
rotation. Every earlier version's real bug was sitting somewhere else in
the box instead — centered behind the dot and active label, the one spot
guaranteed to always have something else on top of it.

### `/c/:slug` is built

The second page, per §6 — `ExpandCell`'s link (see below for its label and
hover arrow) is now a real `Link`, not a disabled stub, and the router
decision above exists because of it.

**One request, not two.** `GET /categories/:slug` already returns the
category's own metadata *and* its full list of published visuals in a
single payload (the route handler adds a hand-built `visuals` array to the
`CategorySchema` dump — see `docs/ARCHITECTURE.md` §6) — exactly the shape
this page needs, so `fetchCategoryDetail` hits that one endpoint rather
than fetching the category and its visuals separately, or reusing the home
page's `fetchVisualsByCategory` (which fetches visuals only, sized for a
top-3 preview it does the slicing for). The DTO-to-domain mapping for a
visual card is shared between the two API modules regardless
(`toVisualCard`, exported from `api/visuals.ts`), so the two endpoints
don't each carry their own copy of it.

**A missing slug reads as "Category not found," not a generic error
screen.** `CategoryService.get_by_slug` raises `NotFoundError`, which the
API layer turns into a 404 with code `not_found` — the frontend checks
`error instanceof ApiError && error.status === 404` specifically to choose
that message over a bare error dump. A category with zero published
visuals is a different, non-error case: its name and blurb still render,
with "No published visuals yet." where the grid would go, not a 404 —
having a category with nothing published is normal here, not exceptional
(see the five newer categories, above).

**`CategoryPageContent` is keyed by slug (`key={slug}`), not merely
effect-dependent on it.** Navigating from one category page to another
re-renders the same route, not a fresh mount, so without the key,
`fetchCategoryDetail`'s effect would need to reset `state` back to
`loading` itself mid-effect for the new slug — a working but awkward
pattern (and one `oxlint`'s `set-state-in-effect` rule flags). Keying the
content component by `slug` makes React remount it on every slug change
instead, so each mount starts at `loading` once, for its own slug, without
an explicit reset.

**`SiteHeader` is shared, not duplicated.** Both pages need the same logo
(now a real `Link` home, where it was inert text with only one page to
link to), category nav dropdown, and theme toggle — extracted out of
`Home.tsx` into its own component (with its own `categories` fetch, the
only data it needs) rather than copied into `CategoryPage.tsx`.
`LoadState<T>` moved to `domain/LoadState.ts` for the same reason: both
pages' fetches use the identical `{loading | ready | error}` shape.

**Leaving a category page carries the category back to Home, not just the
click that opened it.** Originally a dedicated "← Home" link on `/c/:slug`
(superseded below — the logo does this job now), going to
`/?category=<slug>`, which `Home.tsx` reads once, on the categories-fetch
effect that already runs on mount — if it matches a real category, that
becomes the initial `activeCategory` instead of `HOME_CATEGORY`, and the
param is stripped right after (`setSearchParams({}, { replace: true })`)
so it doesn't linger in the URL once applied. `CategorySpinner` needs no
changes for this: it already derives its starting position from whatever
`activeSlug` Home hands it on first render, wherever that came from. Query
param, not router state (`navigate('/', { state: {...} })`) — this
survives a hard reload or a bookmarked/shared link, where state attached
to a navigation wouldn't.

**The nav dropdown's own button reflects which category page is open.**
`SiteHeader` takes an optional `activeCategoryName`, which `CategoryPage`
passes once its data has loaded (undefined while loading, on an error, or
on `Home` — home never has one) — `CategoryTreeNav`'s button reads
`Category: <name>` instead of `Categories` whenever it's set, and reverts
the instant it isn't (leaving a category page, or that page still
loading/erroring).

**`ExpandCell` reads "See more," not "See all visuals," with a right arrow
that fades and slides in on hover rather than sitting there permanently.**
Feedback shortened the label and added the arrow as a hover-only detail —
`opacity-0 -translate-x-1` at rest, `group-hover:opacity-100
group-hover:translate-x-0` — so it reads as a small nudge of motion on
intent, not a permanent icon competing with the text next to the visual
cards it's already deliberately understated against.

### Per-category ASCII art, idle motion, and the logo replacing "← Home"

One round of feedback asked for several things at once: an ASCII "design"
per category, shown behind the hero title on `/` and behind the title on
`/c/:slug`; the `/categories` bubbles floating with a small idle motion;
the home page's preview grid getting a "fade in and up" entrance whenever
the spinner lands on a new category; the dropdown's published counts gone;
the logo matched to the hero's font; and the "← Home" link replaced by
making the logo itself carry you home to the right place.

**The ASCII art is generated, not hand-drawn, and doesn't spell the
category's name.** Nine (soon more) bespoke pieces of ASCII art is either
a maintenance burden that goes stale the moment a category is added, or a
generator that produces one automatically — the generator was the only
option consistent with "One definition per concept" (CLAUDE.md). The first
version tried to spell the category name in text repeating along the ring
paths (matching one of the reference images, a piece that spells "TOGETHER"
along a wave). Dropped: `generateCategoryArt` fills a character grid in
raster (row-major) scan order, and a roughly circular ring intersects most
rows at two disconnected arcs — left side, then right side — so consecutive
letters of the name landed in visually unrelated places instead of
following the curve, reading as jumbled noise rather than legible text.
Plain density characters (`: . + * #`, denser toward the center of each
ring's own thickness, thinning at the edge with a little seeded jitter so
it reads as scattered dots rather than a plotted curve) don't have that
problem and are what most of the reference images actually are anyway.

**Seeded off the category's slug, not its name or id.** Slugs are the
permanent identity (CLAUDE.md); seeding off the name would silently change
a category's art if it were ever renamed, which nothing about a display
rename should do. `domain/seededRandom.ts` (`hashString` + a mulberry32
PRNG) is shared by the art generator and the bubble-chart float below —
one small deterministic-PRNG utility rather than two copies of the same
15 lines.

**Where the art sits: a fixed-size box centered on the title via absolute
positioning + `translate(-50%, -50%)`, not sized by its parent's own
height.** Both the hero (`Home.tsx`) and the category title
(`CategoryPage.tsx`) wrap a couple of short lines of text — nowhere near
tall enough to hold a few dozen rows of ASCII art if the art were sized to
fill that box's natural height. Anchoring the art's own fixed box to the
parent's center instead means its size is a constant chosen for how it
looks, independent of how tall the title text happens to be.

**Home uses `animation="float"`, the category page uses `"pulse"` — a
deliberate difference, not an oversight.** The feedback offered "pulse or
float" without assigning either to a specific spot. Float (a slow
`translateY` bob) suits the hero, a headline moment where a little motion
draws the eye; pulse (a slow opacity breathe) suits sitting behind a
title next to a blurb and a grid of cards, where a *moving* watermark
would be more distracting than a *breathing* one this far from the page's
main focal point.

**The home page always shows the current category's art, including
`HOME_CATEGORY` (the unselected state) — no special-casing to hide it
before a category is picked.** `HOME_CATEGORY` is a real `Category`
instance with its own slug (`'home'`) and color, so `generateCategoryArt`
and `CategoryAsciiArt` need no null-check or fallback for it; the idle
state gets its own (muted-grey) emblem for free rather than an empty gap
behind the hero until the visitor scrolls.

**Bubble float lives on a wrapper `<div>` around the `Link`, not on the
`Link` itself.** The `Link` already has `hover:scale-105` for the
hover-grow effect (a prior round). A running CSS animation and a `:hover`
rule both setting the same `transform` property fight over it every
frame, and the animation wins — the float would have silently overridden
the grow effect the moment it was hovered. Splitting them onto two nested
elements means each owns its own `transform` and neither clobbers the
other. Per-bubble duration (4-7s), delay (0-3s), and drift direction all
come from `bubbleFloat`, seeded off `` `${slug}-float` `` — a different
seed suffix than the art generator's plain `slug`, so a category's ASCII
pattern and its bubble's float phase don't move in lockstep just because
they happen to share a hash input.

**The packing relaxation now reserves room for the float, not just the
hover grow.** `HOVER_SAFETY_FACTOR` already inflated the minimum distance
between bubbles so a hover-grown bubble couldn't touch its neighbor;
floating adds an independent way for two bubbles to close the gap between
them (both could drift toward each other at once), so `packBubbles` now
also adds a flat `FLOAT_MARGIN` (twice the float amplitude — the worst
case) to that same minimum distance. Skipping this would have meant
"nothing overlaps, unless you wait for the float to carry two bubbles
together" — the exact bug the previous round's fix was about, reopened by
a different animation.

**The preview grid's entrance animation is one CSS class plus a `key`, not
a change to `VisualPreviewCard` or `ExpandCell`.** `.animate-fade-in-up-stagger
> *` targets the grid's own direct children — whichever mix of real cards,
the empty placeholder, and `ExpandCell` happens to be there — with a
per-`nth-child` delay, entirely from the parent's class. Neither child
component needs to know this animation exists or take a prop for it.
Replaying it on every category change (not just the first mount) needed
`key={activeCategory.slug}` on the `<ul>` itself: a CSS `animation` only
plays when the element is freshly inserted (or the animation-name
changes), and without the key React would keep reusing the same `<ul>`
node across categories, so only the very first landing would ever animate.

**Counts came out of the dropdown; they stay on `/categories`.** Feedback
was specific to "the dropdown menu" — `CategoryTreeNav`'s list now shows
just the name. The bubble chart's counts are what the bubbles are
*sized by* (`bubbleSize`), so removing them there would hide the reason
the circles are different sizes at all; nothing asked for that.

**The logo's font changed from mono/uppercase to the hero's own italic EB
Garamond**, a plain style fix — the logo previously read as UI chrome
(same treatment as the "Categories" pill next to it) rather than the
site's own name, and the hero already established what that voice looks
like.

**The logo replaces the "← Home" link rather than sitting next to it.**
Removing the link meant something still had to carry a category page's
visitor back to the spinner landed on the right category — reusing the
logo (present on every page already) instead of adding a second nav
element made the header simpler, not more crowded. `SiteHeader` derives
the logo's `href` from the current URL itself (a `/^\/c\/([^/]+)/` match
against `useLocation().pathname`) rather than a prop `CategoryPage` would
have had to pass, so no wiring changed on that page beyond deleting the
old link. On `/`, a plain `Link` to `/` is a navigation no-op — clicking a
link to the page you're already on doesn't remount anything or re-run any
effect — so resetting the spinner needed an actual callback: `SiteHeader`
takes an optional `onLogoClick`, which only `Home.tsx` supplies
(`() => setActiveCategory(HOME_CATEGORY)`), intercepting the click with
`preventDefault` instead of letting the `Link` navigate. Every other page
leaves `onLogoClick` unset and gets ordinary `Link` behavior.

**The ASCII emblem came off the home page entirely, one round later.**
Feedback: "on home page, home category should have no logo" followed
immediately by "on home page, remove all logos. keep them on individual
category pages" — the second, broader statement is what's implemented:
`Home.tsx` no longer imports `CategoryAsciiArt` at all, for `HOME_CATEGORY`
or any real category. It stays exactly as it was on `/c/:slug`. ("Logo"
here means the per-category ASCII emblem, not the header's actual "Achk"
logo — the site logo doesn't vary by category, so "keep them on individual
category pages" wouldn't have made sense read that way; the emblem is the
thing that's inherently per-category.)

**The preview grid's per-card stagger came out too.** Feedback: "make all
3 grids appear up at the same time, not different left to right." The
`nth-child` delays in `.animate-fade-in-up-stagger` (0/60/120/180ms) were
exactly that left-to-right cascade — removed, and the class renamed to
`.animate-fade-in-up-group` since it no longer staggers anything. Every
direct child now shares the same 420ms entrance, all at once.

### `/c/:slug` gets its own small back-link

Distinct from the logo's job above: "on each category page, above the
title create a very small text line that says '← All Categories'... left
justified with title and link to all categories page." This isn't a
returning "← Home" link (that one's gone for good, replaced by the logo)
— it's a new, smaller, differently-targeted one, going to `/categories`
(the bubble chart) rather than back to the spinner. The two don't
duplicate each other: the logo is for "I came from a specific category and
want to go back to it," this line is for "show me every category so I can
pick a different one." Placed inside the same `max-w-xl` block as the
title so its left edge lines up with the title's, not centered like the
page's error states are.

### `/v/:slug` is built

The template asked for outright — until now `/v/:slug` was documented
(§6) but not implemented, the last of the originally-specified five routes
still missing. Building it required finishing several things that were
themselves still just documentation:

**The renderer registry finally exists.** `src/renderers/` had never been
created — `VisualPreviewCard` had its own inline `toSvgDataUri` with a
`TODO: move this alongside the real svg renderer once src/renderers/
exists`. It exists now: `svgDataUri.ts` holds that helper (a separate file
from `svg.tsx`'s `SvgRenderer` component, since a file mixing a component
export with a plain function export breaks Fast Refresh — oxlint's
`only-export-components` rule caught this), `image.tsx` renders an
image-kind visual's `asset_path` directly, `sandboxedIframe.tsx` covers
`d3`/`html`/`p5` (one file, since all three share the same sandboxing
mechanism — see below), and `registry.tsx` exports the one `VisualRenderer`
component that switches on `kind`. `VisualPreviewCard` was updated to
import the shared `toSvgDataUri` instead of keeping its own copy.

**`chartjs` and `vega` render as an honest placeholder, not a blank box or
a rushed integration.** Neither library is wired into the frontend yet —
that's real, separate work (installing Chart.js, building a config-driven
renderer; Vega is still deferred per CLAUDE.md). Rather than block the
whole page template on that, `VisualRenderer` falls through to a small
"kind — renderer not built yet" panel for those two kinds. `svg` and
`image` are genuinely functional today (and cover every visual currently
seeded); `d3`/`html`/`p5` are genuinely functional too, sandboxed —
see below.

**`d3`/`html`/`p5` render via a CDN script inside the sandboxed iframe,
not a bundled npm dependency.** `html`-kind `source` is already a full
document, so it becomes the iframe's `srcDoc` directly. `d3`/`p5` sources
are a bare script assuming the library is already loaded, so
`sandboxedIframe.tsx` prepends a `<script src="https://cdn.jsdelivr.net/...">`
tag for the right one ahead of the pasted source, all inside one
`srcDoc` document. This keeps the sandboxing property CLAUDE.md's security
invariant requires (`sandbox="allow-scripts"`, never `allow-same-origin`)
without adding D3 or p5 to *our own* bundle — they load inside the opaque
iframe origin, isolated from the host page either way, so there's no
lazy-import story needed for them the way §2 originally planned for an
in-page Chart.js.

**Markdown + LaTeX is wired in for real** — `react-markdown` +
`remark-math` + `rehype-katex` (all newly installed) plus
`@tailwindcss/typography` for the prose styling, exactly the stack
`docs/ARCHITECTURE.md` had already committed to before either existed in
`package.json`. `MarkdownBody` takes `theme` as a prop and applies
`prose-invert` from its value rather than Tailwind's `dark:prose-invert` —
the same rule every other theme-conditional style in this app follows,
for the same reason (`data-theme` is a manual attribute, not
`prefers-color-scheme`).

**"Full screen" is one boolean and one class flip**, exactly as
`docs/ARCHITECTURE.md` already specified: `expanded` toggles the stage
`<div>` between a bounded `aspect-video` box in normal flow and
`fixed inset-0`. Escape exits it (a `keydown` listener added only while
expanded, same pattern `CategoryTreeNav`'s old click-outside-to-close used),
and body scroll is locked meanwhile so the page underneath doesn't scroll
along with it.

**A non-adaptive `theme_affinity` mats the visual in a literal hex, not
the page's own CSS variable.** `LIGHT_MAT`/`DARK_MAT` in `VisualPage.tsx`
duplicate `tokens.css`'s `--color-paper` values on purpose — the whole
point of matting is that a dark-designed visual looks the same regardless
of whether the visitor has the *page* set to light or dark, so it can't
read the page's current variable. Kept in sync by hand; there's only one
other place these two hexes are declared.

**`VisualPreviewCard` links to `/v/:slug` now — a real `Link`, not a
disabled stub, and the /v/:slug page's existence is why.** Same pattern
`/c/:slug` and `ExpandCell` went through when their destinations were
built. The `Link` wraps the card's content with `className="contents"`
rather than replacing the `<li>` — `display: contents` makes the `Link`
itself transparent to the grid/flex layout, so the `<li>`'s existing hover
scale/shadow effects (which target the `<li>` and its `group-hover`
descendants) keep working exactly as before; the visible content is still
directly the `<li>`'s children, just wrapped in something clickable.

**`/uploads` was added to the Vite dev proxy.** `asset_path` for an
image-kind visual is already a full path (`/uploads/<name>`, from
`UploadService.save`), meant to work once frontend and backend share an
origin in production — but Vite's dev server only proxied `/api`, so an
`<img src="/uploads/...">` 404'd locally. One more proxy entry, same
shape as the existing one, fixes local preview without changing what the
path itself is.

### `/inspo` — a Pinterest board, not a guessed URL

"Lets make another tab up top... of inspo / embed pinterest board for
sample visualizations." No actual board URL was given, and CLAUDE.md's own
standing rule (never generate or guess a URL) rules out inventing one —
so the page and the header tab are built regardless, reading the board URL
from `VITE_PINTEREST_BOARD_URL` (`frontend/.env`, documented in a new
`frontend/.env.example` — the frontend didn't have one of these before).
Unset, `/inspo` shows a plain "not configured yet, set this var" message
instead of a broken or empty embed. Embedded via Pinterest's own
`pinit.js` widget script (an `<a data-pin-do="embedBoard" ...>` it scans
for and replaces) rather than an iframe, since Pinterest doesn't offer a
sandboxed embed option for a whole board — acceptable here specifically
because this is first-party content the site owner points at, not pasted
third-party code; CLAUDE.md's sandbox rule is about the latter.
`usePinterestWidget` adds the script tag once (checking for an existing
`<script src>` first) and, if it's already loaded from an earlier visit,
calls Pinterest's own `PinUtils.build()` to make it re-scan the DOM — its
script only auto-scans once, on its own load, so arriving at `/inspo` by
client-side navigation after an earlier page view already loaded it would
otherwise leave the embed anchor as plain unbuilt text.

**Confirmed, when asked directly: no, a plain `<iframe src="pinterest.com/...">`
won't work.** Pinterest's own pages send frame-busting headers
(`X-Frame-Options`/CSP `frame-ancestors`) that block third-party framing —
that's exactly *why* Pinterest ships the `pinit.js` widget in the first
place, as the sanctioned way to embed a board without being able to iframe
the page directly. `/inspo` already used that widget, so no code changed
here; this is a decision record of the answer, not a fix.

**Categories page bubble text: `text-ink`, not a literal `text-white`.**
Flagged as a known limit when the literal-white version shipped (white
read fine in dark mode, nearly invisible against the light-theme cream
background) and revisited once asked directly. `text-ink` is the same CSS
variable every other themed color on this site reads — it already flips
with `data-theme` (`tokens.css`), so this needed no `theme`-conditional JS
branch the way `displayColor`/`pastelize` need one for colors that don't
have a ready-made variable; a plain Tailwind class was enough here because
`--color-ink` already *is* that per-theme value.

### `/submit` is built

The last concrete ask: "lets add the page to create new visuals so I can
start seeding data." `ConceptForm` (docs/ARCHITECTURE.md had already named
it, unbuilt, as the component `/submit` and `/create` would eventually
share) now exists for real, needing no backend changes — `POST /visuals`,
`POST /uploads`, and `GET /meta` were all already implemented and already
correct for this; the gap was entirely a missing frontend page.

**The write key lives on `SubmitPage`, not inside `ConceptForm`.** It's not
a field on the visual being created — it's how the *request* authenticates
itself, same category as an HTTP header, not a domain property. Keeping it
out of `ConceptForm` also keeps that component honestly reusable for
`/create` later without dragging an auth concern along with it.
`useWriteKey` persists it in `localStorage` the same way `theme/useTheme.ts`
persists the theme choice (same reasoning: a single-operator personal
site, so remembering it locally saves re-typing it for every visual added
in one seeding session — never sent anywhere but this site's own API).

**Every dropdown comes from `GET /meta`, not a hardcoded list** — kind,
theme affinity, origin, context, resource kind — "one definition per
concept" (CLAUDE.md): the form can't offer a value the backend would
reject because it never invents the list of values in the first place.

**Tags are still free text — no `GET /tags` call for a picker.** "Tags
deduplicate on slug, created on demand" (§3 below) already makes free text
safe: typos or near-duplicates land on the same tag by slug regardless,
so there's no correctness reason to constrain input to existing tags, and
building an autocomplete against `GET /tags` would be new frontend work
solving a problem the backend already solves.

**The source input's shape follows `kind` — a file picker only for
`image`, a placeholder-hinted textarea for everything else.** `image` is
the one kind whose `source` field isn't actually used (per
`docs/ARCHITECTURE.md`'s data model, `source` is "empty for image"); its
real content is a file, uploaded via `POST /uploads` right before the
`POST /visuals` call, with the returned `asset_path` folded into the same
payload the other kinds send `source` in. Every other kind gets a plain
textarea — no kind-specific editor (a JSON editor for `chartjs`, a code
editor with syntax highlighting for `d3`/`html`/`p5`) yet; a placeholder
string per kind is the one piece of per-kind guidance offered, enough to
get seeding started without building an editor for every renderer up
front.

**The form resets after a successful submit, but only partway.** Category,
kind, theme affinity, origin, and context carry over to the next
submission; title, source, summary, notes, tags, and resources clear.
Seeding is naturally batched — several visuals of the same kind going into
the same category in one sitting — so keeping the fields that are usually
the same and clearing the fields that are always different matches how
the form actually gets used, rather than forcing every field to be
re-picked or manually cleared each time.

**Field-level errors read `ApiError.details`, not just the summary
message.** `ApiError` gained a `details` field (populated from the error
envelope's own `details`, which is exactly where Marshmallow's per-field
messages already land — `docs/ARCHITECTURE.md` §5) — every other
`ApiError` throw site in the app already ignored this and just showed
`message`, which was fine for a single generic error banner but not for a
form with a dozen fields, where "which one" matters as much as "what."

### ConceptForm restructured: title, then auth | source, then notes, then optional

Follow-up feedback, arriving mid-round, refined the layout twice: first "move
date to top, mark everything else optional and smaller," with an explicit
field order; then "split in half at the top title — auth on the left and
source on the right, notes and optional full width below." The two combine
into one layout, not two competing ones: title spans the full width; right
below it, a two-column row with authorship/description metadata (summary;
category/kind/tags; author/date made) on the left and the kind-specific
source on the right; full width below that, notes; full width below *that*,
everything else under a smaller "Optional" heading.

**"Author" is the existing `origin` dropdown, not a new field.** There's no
free-text author column in the schema (`docs/ARCHITECTURE.md` §2) — the
closest concept is `origin` (human/machine/hybrid) paired with `generator`
(which model, if not human). The form now shows `generator` only when
`origin !== 'human'`, since it's meaningless otherwise and was previously
visible unconditionally.

**Notes got a live preview: raw Markdown next to its own rendered output,
same component the real page uses.** `MarkdownBody` (already built for
`/v/:slug`) takes `source` and `theme` as plain props, which is exactly
what's needed to reuse it here unchanged — the preview pane is
`<MarkdownBody source={notesMd} theme={theme} />`, re-rendering on every
keystroke, so what a note will actually look like on the published page is
never a surprise found out after submitting. `ConceptForm` calls
`useTheme()` directly for this rather than taking `theme` as a prop, the
same pattern `ExpandCell` and other components already use for a value
they need but a parent has no other reason to pass down.

### Chart.js renderer is built

`chartjs` was the one `VisualKind` besides `vega` still falling through to
the "renderer not built yet" placeholder — closed now that a concrete
comparison across all six kinds needed it to be real, not a placeholder in
the middle of the comparison. `renderers/chartjs.tsx` lazy-loads
`chart.js/auto` via dynamic `import()`, matching the "Chart.js page never
downloads p5" lazy-loading commitment in §2 below — a page with no
chartjs-kind visual on it never pulls the library in at all. Config comes
straight from `source` (a JSON string, parsed and handed to `new
Chart(canvas, config)`), with one default applied when the visual's own
config doesn't set it: `maintainAspectRatio: false`, so the canvas fills
the stage box `VisualPage` already gives every kind rather than sizing
itself off Chart.js's own default aspect ratio. `chart?.destroy()` on
unmount/re-render (the effect's cleanup) — a Chart instance left running
against a canvas that React has already swapped out is a real memory leak
and console-error source, not a hypothetical one.

### Sample content: one topic per kind, to compare them

Five topics, each authored in whichever kind suits it best, so the request
to "compare svg, chart, image, d3, p5 and html" lands on five genuinely
different pieces of content rather than one topic awkwardly forced into
five unrelated renderers:

- **Polar vs. Complex Numbers** (`d3`) — Euler's formula animated: a point
  orbits the unit circle while a label prints its rectangular and polar
  reading live.
- **Fourier Series: Rotating Phasor** (`p5`) — six rotating epicycles (the
  odd harmonics) tracing a square wave, the classic way to *see* what a
  Fourier series is doing rather than just read its formula.
- **Musical Scale: MIDI Frequencies** (`html`) — a clickable one-octave
  keyboard, each key showing its MIDI number and $440 \cdot 2^{(n-69)/12}$
  frequency and playing an oscillator tone at that frequency on click.
- **Fundamental Frequency** (`chartjs`) — a bar chart of a harmonic series
  above a 110 Hz fundamental, amplitude falling off with each overtone.
- **Principal Alias** (`svg`) — a 9 Hz sine (dashed) sampled 10 times a
  second, landing on exactly the same points a 1 Hz sine (solid) would —
  the classic aliasing demonstration, drawn as two literal sine curves
  rather than described abstractly.

**A sixth entry, `image`, is the same aliasing content again — a
screenshot of the `svg` version, not new content of its own.** Five topics
don't divide evenly across six kinds, and generating a *sixth*, unrelated
topic just to fill the `image` slot would have made the set six unrelated
demos instead of five plus one deliberate kind-for-kind comparison. Reusing
the aliasing diagram as both `svg` and `image` (`principal-alias` /
`principal-alias-photo`) does what "compare" actually asked for on the one
kind that most needs a direct side-by-side: identical content, vector
markup on one side and a flat raster of the same pixels on the other.

**The `svg` and `dashed`/`solid` polylines are computed, not hand-typed.**
`_sine_polyline`/`_sample_dots` in `seed.py` generate the coordinate
strings from the actual sine function at seed time — a few thousand
characters of hand-approximated curve coordinates would have been both
tedious to write correctly and impossible to eyeball-verify as
mathematically right. The `image` twin's PNG (`app/seed_assets/
principal-alias.png`) was produced by rendering that exact same generated
SVG markup in a browser and screenshotting it — the two really are the
same content, not two independently-drawn approximations of it.

**Code-bearing samples set their own dark background, in the pasted
source itself — not left to `theme_affinity`.** `VisualPage`'s matting
(the literal `LIGHT_MAT`/`DARK_MAT` hex, §1 above) colors the box *around*
the iframe; it has no way to reach *into* the sandboxed document and set
its background, since that document is intentionally opaque to the parent
page. Without `document.body.style.background = '#1c1c1c'` as the first
line of the `d3` and `p5` sources (and the equivalent inline in the `html`
sample's own `<style>`), each would render as a plain white rectangle
regardless of what `theme_affinity: "dark"` was set to — the mismatch
would only show up as "why is this visual white," not as an error
anywhere. All three dark samples are declared `theme_affinity: "dark"` to
match the color they actually hardcode, not `"adaptive"`.

### `/submit` full width, file "upload" reads-and-discards, accurate success message

One round of feedback bundled several `/submit`/`ConceptForm` fixes at once:
"text and boxes should be able to take up entire width of page," a real way
to load a file's contents into the source field ("esp for html"), and a
clear, accurate success message instead of a generic one.

**`/submit`'s `main` went from a centered `max-w-2xl` column to the page's
full width with 10% padding left/right, no cap beyond that.** The old
narrow column was squeezing exactly the fields (`source`, `notes_md`) that
most benefit from horizontal room — a pasted `html` document or a paragraph
of Markdown notes wraps far more often than it needs to in a ~42rem column.
Flat percentage padding, not a `max-w-*` class, so the usable width still
grows on a wider monitor instead of capping out.

**File "upload" for a code-bearing kind reads the file's text client-side
and discards the `File` object — it is not a real upload.** There is no
server endpoint for pasted code, on purpose: `docs/ARCHITECTURE.md`'s write
path is built around `POST /visuals` taking `source` as plain JSON text,
and `image` is the only kind whose content is actually a file on disk
(`POST /uploads`, §1 above). Building a second upload path for code would
mean a second storage location and a second retrieval path for content
that is already just text sitting in a form field. `handleSourceFile` calls
`await file.text()` and sets `source` to the result; the `File` itself is
never referenced again, let alone sent over the network — "grab the code
and then trash the file," as asked. `accept` on the file input is
kind-specific (`.svg`, `.json`, `.js`, `.html`) as a UI hint only; nothing
server-side trusts a client-supplied extension or MIME type, since the
content that actually lands in `source` is read as plain text regardless
of what the browser labeled the file.

**The success message reads the server's real `status`, not whether a
write key was typed.** The previous version inferred "published" from
`writeKey.length > 0`, which is wrong the moment the key is present but
*wrong* — a bad key still fails `is_trusted_request()` server-side and the
visual still lands `pending`, so the UI would have congratulated a visitor
on a publish that didn't happen. `VisualDetail` (frontend domain type) and
its DTO now carry the `status` the backend already returns in the create
response; `ConceptForm` branches on `lastCreated.status === 'published'`
for "Thank you for submitting! View your visual here" (linked to
`/v/:slug`) versus "Thank you for submitting! Your visual will be approved
soon." for anything else. This is the one truthful source for that
message — there is no client-side way to know in advance whether a typed
key is the *right* key.

### Per-category ASCII art reused as a "cover," and the dropdown made clickable

Feedback asked for two related things: a way to see something
image-like per category on the `/categories` page, and for the header
dropdown's now-inert-looking list to be clickable via more than just text.

**No new image-generation or image-storage system was built for this.**
The existing `CategoryAsciiArt` generator (`domain/categoryArt.ts`) already
produces a stable, deterministic pattern per category slug — the same
slug always renders the same emblem, which is functionally "a randomly
generated pattern, saved as the cover" without actually needing a `cover`
column, a generation job, or a place to store the result: the seed *is*
the storage. Building a real image-cover pipeline (screenshot generation,
upload, a new model field) is real, separate work with no visual content
yet to justify it for most categories; reusing the existing generator was
the option consistent with not inventing infrastructure a placeholder
doesn't need.

Shown at small size, low opacity, clipped into a circle, in two new spots:
behind the label on each `/categories` bubble (`animation="pulse"`, not
`"float"` — the bubble wrapper already animates its own `transform` for the
idle-drift effect, §1 above, and stacking a second `transform`-based
animation on a child would silently lose the fight the same way the
hover-grow-vs-float bug already did once; `pulse` only touches `opacity`,
so it layers safely), and as a small round swatch before each name in the
header's "Categories" dropdown.

**The dropdown swatch is part of the `Link`, not a sibling element next to
it.** "Fix the dropdown to be clickable" was specifically about the new
visual element doing nothing on click — putting the swatch inside the same
`<Link to={`/c/${category.slug}`}>` that already wraps the name means
clicking anywhere in that row, swatch included, navigates the same way;
no separate `onClick` or second link was needed.

### Pinterest widget: imperative DOM, width matches the page

Implemented against the widget script the request supplied directly
(`assets.pinterest.com/js/pinit.js`) once `developers.pinterest.com`'s own
documentation page turned out to be unreachable from this sandbox
(`EGRESS_BLOCKED`) — proceeded from the well-established public spec for
the `data-pin-do="embedBoard"` anchor pattern rather than blocking on an
unreachable source, consistent with the same domain being blocked outright
elsewhere in this session (§1, `/inspo` section above).

**The anchor Pinterest's script looks for is built with plain DOM calls
into a ref-owned, React-children-free `<div>`, not written as JSX.**
Pinterest's script scans for `<a data-pin-do="embedBoard">` and replaces it
with an iframe once it loads — a DOM mutation React has no knowledge of.
If that anchor were JSX, an unrelated re-render (a theme toggle, anything
touching state above it) could have React reconcile that subtree against
what Pinterest already replaced it with, fighting over the same node.
Giving the anchor its own empty mount `<div ref={mountRef} />` with no
React children means React never has an expectation about what's inside it
to reconcile against; the effect that builds and appends the anchor
re-runs (rebuilding it, then asking `PinUtils.build()` to re-scan) only
when `boardUrl` or `width` actually change.

**Width matches the page, per "should be equal to width of page" —
tracked live via `ResizeObserver` on the content container, rounded to the
nearest 20px before triggering a rebuild.** A fixed pixel width would drift
out of sync the moment the viewport resized; rounding avoids rebuilding
the widget's own iframe on every single pixel of an ordinary window drag,
the same reasoning `CategoryBubbleChart`'s own `ResizeObserver` measurement
already uses.

**Known limit, not a bug: the live iframe couldn't be visually verified in
this sandbox.** The anchor was confirmed present with the correct
`data-pin-board-width` and `href` via DOM inspection; `assets.pinterest.com`
itself returned 403 when Playwright tried to load it here, consistent with
this sandbox's outbound proxy blocking pinterest.com domains broadly (see
the `/inspo` entry in §1 above) — worth a real click-through once this runs
somewhere with normal network access.

**Known limit, not a bug: `d3`/`p5` couldn't be visually verified in this
session's sandbox.** Both load their library from a CDN
(`cdn.jsdelivr.net`) inside the sandboxed iframe at runtime
(`renderers/sandboxedIframe.tsx`) — this dev sandbox's own outbound network
policy rejects that domain (confirmed: `cdnjs.cloudflare.com` and
`unpkg.com` were tried too, same 403 policy denial), which a real browser
outside this sandbox won't do. The `d3` sample's page loaded and ran up to
the point of calling `d3.select(...)` (its own
`document.body.style.background` line took effect, visible as a plain dark
box in a screenshot) before failing on `d3 is not defined` — consistent
with a blocked script load, not a syntax or logic error in the source
itself. Both scripts were reviewed by hand for correctness instead of
executed; worth a real click-through once this runs somewhere with normal
CDN access.

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

**Revised once `/v/:slug` was actually built (§1):** `d3` and `p5` ended up
loaded from a CDN *inside* the sandboxed iframe (`renderers/sandboxedIframe.tsx`),
not as a lazy npm import into our own bundle — the sandbox already isolates
them from the host page, so there's nothing for our bundle size to gain by
also owning the dependency, and the iframe needs the library present
regardless of what we import. The "lazy-loaded npm dependency" plan below
still applies to `chartjs` (in-page, no sandbox, genuinely adds to our
bundle) once it's built; it just turned out not to apply to the two
kinds that render sandboxed.

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

**6. Accounts, submission tracking, editing, and public comments/corrections
("phase 2").** Raised directly: how to edit already-submitted content, see
whether a submission has been approved, track one's own submissions, and
whether any of that requires signup — plus a public comments/corrections
system, and private-vs-public visual ownership. Entirely undecided; this is
a genuine architecture question (accounts touch the data model, the write
protection layers in §4, and every page that currently assumes "published"
is the only visibility state), not a default to pick silently. See the
options laid out in conversation before implementing any of it.

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
