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

**Paper cream first.** The site loads light unless the visitor has toggled to
dark before (persisted in `localStorage`, read before first paint to avoid a
flash of the wrong theme — see `frontend/index.html`). Both stay first-class;
this only decides the unauthenticated starting point.

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

**`CategorySpinner`** (bottom-right, home page only). Infinite wraparound —
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

**`CategoryTreeNav`** (header). A Khan Academy–style two-column menu: a
fixed left list of categories, and a right pane — its own header plus a
`max-h` + `overflow-y-auto` scrollable topic list — that swaps to whichever
category is selected on the left. Backed by the `topics` table (see
`docs/ARCHITECTURE.md` §2) — `Programming > Data Structures > Stack`, as deep
as the data goes. Not the same job as the spinner: this is direct lookup for
someone who already knows what they want, the spinner is for browsing.

**Category restructuring (e.g. introducing "Math" as a parent of "Physics")
is explicitly not decided.** The four existing categories and their subway
colors are unchanged. `topics` nest *within* a category; they don't let a
category nest inside another one.

**The top-3 preview is a 4-column grid** (2 columns below `sm`), not a
vertical list — visual cards fill the first slots, an `ExpandCell` is always
the last one. No separate category-name heading above it either: the spinner
and tree nav already say which category is active, so repeating it there was
redundant. `ExpandCell` is disabled rather than a dead link — `/c/:slug`
isn't built, so there's nowhere for it to go yet. No router either, per
above.

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
