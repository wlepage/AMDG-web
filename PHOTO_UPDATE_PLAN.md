# Photo refresh: hero carousel + equipment tiles in Resources

> Final owner revision (2026-08-07): the walking-campus and Starbucks photos
> were removed from the carousel; a later revision removed one more slide,
> leaving six. The shared Resources
> access lede was removed; the original µTS access statement was restored inside
> its featured card. Legolas, Gimli, and Keyence now render as a compact grid
> beneath a College of Engineering & Computer Science resource heading. These
> decisions supersede the original nine-slide/shared-lede details below.
> The composite-shear photo was subsequently removed from Gimli; compact-card
> photos render beneath their text, and the featured µTS image is reduced.

## Context

A professional photo shoot (`~/Downloads/picks`, Canon EOS R5, 8192×5464) produced
a set of real lab photos of the AMDG group at work. The site owner tagged them in
Finder: **green** = intended for the home-page carousel, **blue** = instrument
portraits to accompany equipment write-ups.

Today the hero carousel shows four *figures* (a building photo plus three research
diagrams — `building.jpg`, `sintering.jpg`, `research-overview.jpg`,
`length-scales.jpg`). Those get replaced wholesale by nine photographs of people
doing the work. Separately, the Resources section currently features exactly one
piece of hardware (the Psylotech µTS). Three more instruments — **Gimli**
(Instron 34TM-30), **Legolas** (Instron E3000 ElectroPuls), and the **Keyence
VHX-X1F** — need to join it with photos and descriptions, which means
generalizing the single `instrument` block into a list.

Outcome: a carousel that shows the group rather than diagrams, and a Resources
section that presents AMDG's four shareable instruments in one consistent pattern.

### Decisions already made by the owner

- Resources order, top to bottom: **µTS → web tools grid → Legolas → Gimli → Keyence**.
- **One shared access line** for the whole section, replacing the µTS's own
  per-instrument access sentence. Exact wording:
  > AMDG shares its instruments with the research community. Contact Prof. LePage to discuss.
- `DIC composite shear test Gimli 2.JPG` is **Gimli's second photo**; the two
  stack vertically in Gimli's photo column.
- `…Brown 116.JPG` (group walking on campus, untagged) **joins the carousel** as
  a 9th slide.

---

## Source images

| File in `~/Downloads/picks` | Tags | Destination |
|---|---|---|
| `…Brown 002.JPG` | Green | carousel |
| `…Brown 013.JPG` | Green | carousel |
| `…Brown 025.JPG` | Green | carousel |
| `…Brown 054.JPG` | Green | carousel |
| `…Brown 057.JPG` | Green | carousel |
| `…Brown 084.JPG` | Green | carousel |
| `…Brown 099.JPG` | Green | carousel |
| `…Brown 116.JPG` | *(untagged)* | carousel (owner's call) |
| `…Brown 077 Keyence.JPG` | Green **+ Blue** | carousel **and** Keyence tile |
| `…Brown 037 Gimli.JPG` | Blue | Gimli tile (photo 1) |
| `DIC composite shear test Gimli 2.JPG` | *(untagged)* | Gimli tile (photo 2) |
| `…Brown 080 Legolas.JPG` | Blue | Legolas tile |

Two notes on the raw files:
- They are **40–70 MB each**. They must be downscaled before entering git.
- `DIC composite shear test Gimli 2.JPG` is an iPhone shot carrying **GPS EXIF**
  (36.153, −95.942). Stripping metadata on ingest handles this.

---

## Step 1 — Ingest and downscale the photos

`sharp` is present at `node_modules/sharp` (hoisted as a transitive dependency of
Astro's image pipeline — it is *not* in `package.json`, so treat it as a local
build-time convenience, not an API to depend on). It **strips EXIF by default**,
which is what removes the GPS tag noted above. Write a throwaway script in the
scratchpad (do **not** commit it) that, for each source file:

- resizes to **2000 px on the long edge** (`fit: 'inside'`, no enlargement),
- writes JPEG at **quality 82, `mozjpeg: true`**,
- outputs to the destination path below.

2000 px is comfortably above the largest `widths` entry either consumer asks for
(carousel tops out at 1600, instrument figures at 720), so `astro:assets` does
the rest. Expect ~400–600 KB per file, ~5 MB total.

```js
// scratchpad/ingest.mjs — run once, do not commit
import sharp from 'sharp';
const jobs = [ /* [srcPath, destPath] pairs from the tables below */ ];
for (const [src, dest] of jobs) {
  await sharp(src)
    .rotate()                                        // honour EXIF orientation before stripping it
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toFile(dest);                                   // sharp drops EXIF unless .withMetadata()
}
```

### Why this matters for page speed

Nine carousel slides plus four instrument photos is a big jump in image count, so
the ingest size is what keeps the page fast:

- **Committing the originals is not an option.** 13 files × ~50 MB is ~550 MB in
  git history, permanently, and GitHub Actions would re-checkout it on every
  deploy.
- **`astro:assets` re-encodes to WebP and emits a `srcset`,** so the browser never
  fetches the 2000 px source — the carousel picks from `[480, 800, 1200, 1600]`
  and the instrument figures from `[360, 720]`. Real-world transfer is roughly
  60–120 KB per WebP slide at typical viewport widths.
- **Only slide 1 is initially rendered and requested.** It is eager with high
  fetch priority; inactive slides use `content-visibility: hidden` plus lazy,
  low-priority images. A production browser measurement confirms that initial
  load requests one of the six carousel photos. Instrument figures remain lazy.
- **Downscaling before Astro sees the file also cuts build time.** Sharp resizing
  thirteen 45-megapixel JPEGs into four widths each on every CI build is slow;
  from a 2000 px source it is near-instant.

Everything lands under `src/assets/images/**` (never `public/`) so
`resolveImage()` in [`src/lib/images.ts`](src/lib/images.ts) picks it up — its
glob is `/src/assets/images/**/*.{jpg,jpeg,png}` mapped by a literal
`/src/assets/images` → `/images` prefix swap, so the JSON path must mirror the
on-disk folder exactly.

**Carousel → `src/assets/images/hero/`** (proposed order and filenames):

| # | Source | New filename |
|---|---|---|
| 1 | 116 | `group-campus.jpg` |
| 2 | 054 | `dic-review.jpg` |
| 3 | 084 | `load-frame-setup.jpg` |
| 4 | 077 | `keyence-microscopy.jpg` |
| 5 | 013 | `vacuum-instrument.jpg` |
| 6 | 025 | `glovebox.jpg` |
| 7 | 057 | `dic-software.jpg` |
| 8 | 002 | `instrument-interior.jpg` |
| 9 | 099 | `group-discussion.jpg` |

**Instruments → `src/assets/images/resources/`** (new folder):

| Source | New filename |
|---|---|
| 080 Legolas | `legolas-1.jpg` |
| 037 Gimli | `gimli-1.jpg` |
| `DIC composite shear test Gimli 2` | `gimli-2.jpg` |
| 077 Keyence | `keyence-1.jpg` |

`077` is downscaled twice (different folders) because the two consumers request
different `widths`; the duplicate is ~500 KB and keeps each folder
self-contained.

**Delete** the four superseded hero figures:
`src/assets/images/hero/{building,sintering,research-overview,length-scales}.jpg`.
They are referenced nowhere else — grep confirms `hero.json` is their only
consumer. (If any should be preserved for later use, say so and they'll be left
on disk but unreferenced.)

---

## Step 2 — Rewrite `content/hero.json` slides

Replace the four-entry `slides` array. `HeroSlide` is `{ src, alt }` — there is no
caption field, so alt text is the only prose. **Owner-approved alt text:**

1. `group-campus.jpg` — "The AMDG group walking together along a tree-lined path on The University of Tulsa campus."
2. `dic-review.jpg` — "Prof. William LePage points out a feature on a digital image correlation display to an AMDG member, lit by the blue LEDs of the DIC setup."
3. `load-frame-setup.jpg` — "Two AMDG members in safety glasses mount a specimen into the grips of a load frame."
4. `keyence-microscopy.jpg` — "Two AMDG members examine a micrograph on the Keyence digital microscope's display."
5. `vacuum-instrument.jpg` — "Two AMDG members load a sample into the Helios dual-beam scanning electron microscope in the materials lab."
6. `glovebox.jpg` — "AMDG members working at an inert-atmosphere argon glovebox, one reaching into the gloves to handle a sample."
7. `dic-software.jpg` — "An AMDG member and Prof. LePage review digital image correlation software output on a lab monitor."
8. `instrument-interior.jpg` — "AMDG member replaces the vacuum gauge in the Helios dual-beam scanning electron microscope, lit by blue light."
9. `group-discussion.jpg` — "AMDG members in conversation around a long wooden table over coffee at the campus Starbucks."

Leave `mode`, `eyebrow`, `kicker`, `autoAdvanceMs: 7000`, and the `video` block
untouched. Note `n` grows 4 → 9, so the carousel emits nine dots — the existing
control markup in `Hero.astro` handles this with no change.

---

## Step 3 — Fix the carousel aspect ratio

`src/components/Hero.astro` styles the stage as:

```css
.stage-media, .carousel__viewport { aspect-ratio: 16 / 9; … }
.carousel__slide img { object-fit: contain; /* show full figures, no cropping */ }
```

All nine new slides are **exactly 3:2** (8192×5464 / 7627×5087 / 6452×4301 all
reduce to 1.50). Left as-is, every slide pillarboxes with dark bars down both
sides. Split the rule so the video stage keeps 16:9 and the carousel gets 3:2:

```css
.stage-media { aspect-ratio: 16 / 9; … }
.carousel__viewport { aspect-ratio: 3 / 2; … }
```

Keep `object-fit: contain` — with a matched ratio nothing letterboxes and nothing
crops. Update the `/* show full figures, no cropping */` comment, since the
slides are now photographs rather than figures.

This makes the hero stage ~19% taller. Check the `hero__grid` two-column layout
at ≥920px and the stacked mobile layout after the change. If the extra height
reads as too heavy, the fallback is `aspect-ratio: 16/9` + `object-fit: cover`,
which crops ~16% of each photo's height — acceptable now that no slide is a
diagram, but it risks clipping heads in the tighter framings (084, 080).

---

## Step 4 — Generalize `instrument` → `instruments[]`

### `content/resources.json`

Three structural edits:

1. Add a top-level `"lede"` string with the shared access sentence.
2. Rename `instrument` (object) → `instruments` (array), **in display order**:
   µTS, Legolas, Gimli, Keyence.
3. Replace each entry's `photo`/`photoAlt` pair with a `photos` array of
   `{ src, alt }` so Gimli can carry two.
4. Drop the µTS's `access` field (its content is now the section lede). Keep its
   `sponsor: "NSF MRI"` and `sponsorNote` — the three new instruments have
   neither, and the badge is already conditional on `sponsor`.

The tool grid's slot is marked by a **`"toolsAfter": true`** flag on the µTS
entry — the renderer emits the `<ul class="resources">` immediately after any
instrument carrying it. This keeps a single ordered array as the source of truth
instead of hardcoding an index in the component. Document it in the file's
`_comment`, matching the convention of every other content file.

New instrument copy (verbatim from the owner, lightly punctuated):

- **Gimli — Instron 34TM-30** · "30 kN electromechanical load frame with extensive
  and advanced digital image correlation capabilities (stereo or 2D, live strain
  feedback/control, cross-polarized blue light, and with lenses suitable to
  samples with gauge section sizes from about 50 microns to 500 mm) and with
  grips suitable to samples up to 0.25 inches thick."
- **Keyence VHX-X1F** · "With ZMT metallurgical lens with polarized light and
  differential image contrast."
- **Legolas — Instron E3000 ElectroPuls** · "Electrodynamic load frame with 3 kN
  and 100+ Hz capacity with pneumatic grips for samples up to 0.25 inch thick or
  round, dynamic extensometer feedback, and sample temperature monitoring."

Instrument photo alt text:
- `legolas-1.jpg` — "A student threads a specimen into the grips of the Instron E3000 while a second student looks on."
- `gimli-1.jpg` — "Two researchers at the Gimli control station, with live load–displacement data and a DIC image of the specimen on the monitors."
- `gimli-2.jpg` — "A stereo pair of digital image correlation cameras aimed at a speckled composite shear specimen under blue illumination."
- `keyence-1.jpg` — "Two students inspect a micrograph on the Keyence digital microscope display."

### `src/lib/content.ts`

- `Instrument` becomes: `{ name: string; description: string; photos?: {src: string; alt: string}[]; sponsor?: string; sponsorNote?: string; toolsAfter?: boolean; }` — `access` is removed.
- Replace the `INSTRUMENT` export with `INSTRUMENTS` (array) and add a
  `RESOURCES_LEDE` export, following the existing export style in this file.

### `src/components/Resources.astro`

Rewrite the body as one map over `INSTRUMENTS`:

- Render the lede as `<p class="lede">` directly under the section heading.
  `.lede` already exists in `src/styles/global.css:90` and is currently unused —
  `CLAUDE.md` claims Resources uses it, which is stale; this makes the doc true.
- For each instrument: resolve every entry in `photos` through `resolveImage()`
  and keep only the hits. **Preserve the existing gating semantics** — the
  `<figure>` and the `instrument--photo` two-column modifier both hang off
  whether any photo actually resolved, so a missing file degrades to a text-only
  block with no 404 (this is why the µTS block renders text-only today).
- Multiple resolved photos stack vertically inside `.instrument__figure` (add a
  `display: flex; flex-direction: column; gap: var(--space-3)` and let the
  existing `:global(img)` rule handle sizing). The existing `widths={[360, 720]}`
  / `sizes` values carry over unchanged.
- After an instrument with `toolsAfter`, emit the existing
  `<ul class="resources">{RESOURCE_TOOLS.map(t => <ResourceCard tool={t} />)}</ul>`.
- Drop the `instrument__access` paragraph and its CSS rule.
- Consecutive instrument cards need vertical separation — the current single
  block has no sibling. Add a margin (`var(--space-6)`) between `.instrument`
  cards and above/below the tool grid.

`ResourceCard.astro` is **not** touched — the web tools keep their current shape.

---

## Step 5 — Update the handoff docs

`CLAUDE.md` and `AGENTS.md` are kept byte-identical; edit both. Under **Community
Resources**, replace the single-`instrument` description with the
`instruments[]` + `toolsAfter` + `photos[]` model and the new ordering. While
there, correct three existing drifts found during exploration:

- it documents a `specs` `<dl>` that does not exist in the JSON or the component;
- it says the instrument renders "below the grid" (it renders above);
- it calls Resources "the first and only use of `.lede`" — true only after this change.

Also update the **Open follow-ups** list: the "Psylotech µTS has no photo yet"
item stays open (none of these photos show it), and the removed hero figures
should be noted if the owner wants them back later.

---

## Files touched

| File | Change |
|---|---|
| `src/assets/images/hero/` | delete 4 figures, add 9 photos |
| `src/assets/images/resources/` | **new folder**, 4 photos |
| `content/hero.json` | 9 new slides |
| `content/resources.json` | `lede`, `instruments[]`, `photos[]`, `toolsAfter` |
| `src/lib/content.ts` | `Instrument` type, `INSTRUMENTS`, `RESOURCES_LEDE` |
| `src/components/Resources.astro` | map over instruments, lede, stacked photos, tool-grid slot |
| `src/components/Hero.astro` | carousel `aspect-ratio: 3 / 2` |
| `CLAUDE.md`, `AGENTS.md` | doc update (identical edits) |

---

## Verification

1. **Build:** `npx astro build`. It must complete with no unresolved-image
   warnings.
2. **Carousel:** grep `dist/index.html` for `carousel__slide` — expect **9**
   slides, 9 dots, and `srcset` on each (proof `resolveImage()` hit and
   `astro:assets` optimized them, not the plain-`<img>` fallback). Confirm no
   `building.jpg` / `sintering.jpg` / `research-overview.jpg` /
   `length-scales.jpg` references survive anywhere in `dist/`.
3. **Resources order:** grep `dist/index.html` between `id="resources"` and the
   footer and confirm the sequence is µTS → `<ul class="resources">` → Legolas →
   Gimli → Keyence, that Gimli emits **two** `<img>` in its figure, and that the
   lede renders once. Confirm the NSF badge appears **only** on the µTS.
4. **Aspect ratio:** grep the scoped CSS in `dist/_astro/*.css` for
   `aspect-ratio:3/2` on `.carousel__viewport` and `16/9` still on
   `.stage-media`.
5. **Visual:** the `astro dev` server on :4321 hot-reloads — load the page and
   check (a) no letterboxing on any slide, (b) the taller hero doesn't crowd the
   `hero__grid` at ≥920px or on mobile, (c) Gimli's stacked photos don't
   overpower its text column, (d) the ~400 KB × 13 image payload still loads
   acceptably.
6. **A11y:** `npm run test:a11y`. All new images carry alt text, so axe should
   stay clean. The Alumni test verifies the owner-approved always-expanded
   static-list design.
7. **Repo size:** `du -sh src/assets/images` before committing — should be a few
   MB, not hundreds. Confirm `exiftool`/`mdls` reports no GPS on
   `src/assets/images/resources/gimli-2.jpg`.

---

## Resolved owner decisions

- The carousel alt text and slide order are approved as listed above.
- The four old hero figures are removed and remain recoverable from Git history.
- Alumni remains an always-expanded static list; its accessibility test now
  checks that behavior rather than obsolete accordion controls.
