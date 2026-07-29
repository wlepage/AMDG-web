# Agent handoff — AMDG website

> This file and `AGENTS.md` are kept identical. Edit both when you change either.

Single-page, statically generated **Astro + TypeScript** site for the Advanced
Materials Design Group (AMDG) at The University of Tulsa. No client frameworks —
only small vanilla `<script>`s (nav, carousel). Live at https://amdg.science.

## Run / build / verify

```bash
npm install
npm run dev      # http://localhost:4321 (hot-reloads)
npm run build    # static build to ./dist  — use this to verify changes compile
```

There is a long-running `astro dev` server during sessions; it hot-reloads on
save. To verify a change, run `npx astro build` and then grep `dist/index.html`
(or the scoped CSS in `dist/_astro/*.css`) for the rendered markup — that's the
authoritative check used throughout this project.

## Architecture — content is data, not markup

**All content lives in `/content/*.json`** and is loaded through typed exports in
[`src/lib/content.ts`](src/lib/content.ts). Components never hardcode content.
Each JSON file has a leading `_comment` documenting its fields.

| File | Drives | Component |
|------|--------|-----------|
| `site.json` | name, descriptor, affiliation, **nav anchors**, SEO | `Nav`, `Footer`, `Base` |
| `about.json` | Mission / Vision / Approach | `MissionVisionApproach.astro` |
| `highlights.json` | the Highlights timeline | `Highlights.astro` |
| `projects.json` | project cards + `funders` logo image | `Projects.astro`, `ProjectCard.astro` |
| `team.json` | PI / Graduate / Undergraduate people | `Team.astro` |
| `alumni.json` | alumni groups (Postdocs / Master's / rosters) | `AlumniAccordion.astro` |
| `contact.json` | contact blocks | `Contact.astro` |
| `theme.json` | color tokens (injected as CSS `--c-*` vars in `Base.astro`) | — |

Page composition: [`src/pages/index.astro`](src/pages/index.astro) →
`Nav, Hero, MissionVisionApproach (#about), Highlights, Projects, Team, AlumniAccordion (#alumni), Contact, Footer`.

## ⚠️ Working agreement (carried over — confirm before content edits)

The site owner asked that **Highlights and student/team/alumni *content* changes
be confirmed item-by-item before applying** — propose drafts, get an OK, then
edit. Structural/CSS work does not need this, but anything that adds/changes the
*words or people* in Highlights, Team, or Alumni should be confirmed first.

## Conventions established (match these)

**Highlights** (`Highlights.astro` + `highlights.json`)
- Items are re-sorted newest-first by ISO `date`; `displayDate` is the label shown.
- Tags & colors live in `TAG_COLORS` in the component: `award` gold,
  `publication` blue, `project` green, `thesis` teal, `feature` orange.
  **There is no `grant` tag** — grants were merged into `project`.
- `text` is rendered with `set:html`, so **journal names are wrapped in `<em>`**
  and any literal `<`, `>`, `&` must be HTML-escaped (e.g. `&amp;`).
- Optional `link` field (a `https://doi.org/…` URL) renders as a clickable DOI
  line. Months for publications were sourced from Crossref (`api.crossref.org/works/<doi>`).
- The 5 newest show; the rest collapse into one `<details class="year-fold">`
  ("Earlier highlights") with a chevron that rotates via the `[open]` state (no JS).

**About** (`MissionVisionApproach.astro` + `about.json`)
- One `#about` section = three `card` boxes (Mission/Vision/Approach), forced to
  3 columns at ≥800px. Box titles are larger than body text. Nav has a single
  "About" entry (Mission/Vision/Approach are *not* separate nav items).
- Block text supports `\n` → `<br>` (Vision uses it). The Approach "closing"
  sentence is just a second paragraph inside the Approach box.

**Team** (`Team.astro` + `team.json`)
- Vertical cards: photo centered on top, text below. Missing photo → monogram.
- Education lines get a grad-cap SVG bullet by level (`degreeLevel()`); **PhD and
  MS render the same icon**. Education is auto-sorted highest-degree-first.
- Grad cards are ordered alphabetically by first name (maintained in the JSON).
- Undergrad `role` (degree+year) uses the muted `--meta` style; co-advisor lines
  are italic. Undergrads currently have **no year/major yet** (owner to supply).

**Alumni** (`AlumniAccordion.astro` + `alumni.json`)
- No accordion/expand controls — every group is always fully listed.
- `detailed` groups show name + Thesis + Placement (Thesis/Placement share one
  style; only the thesis *title* is italic). Master's names omit ", M.S.".
- `names` rosters use **CSS multi-column** (`columns: 12rem 3`) so alphabetical
  order reads top-to-bottom down each column (not a grid).

**Projects** (`Projects.astro` + `ProjectCard.astro` + `projects.json`)
- A single card is `ProjectCard.astro` (it owns the logo maps + card markup +
  card CSS); `Projects.astro` only composes the grid, the "Completed Projects"
  fold, and the `funders` image. Section heading is **"Active Projects"**.
- Each card has ONE white sponsor **badge** — logo + agency name in a single
  rounded container (no nested pills). The logo auto-derives from `AGENCY_LOGOS`
  by matching the `sponsor` string (NSF/NASA/AFOSR/ONR/DOE/ERDC →
  `/images/partners/<agency>.<ext>`). **Logos are mixed formats** (svg/png/jpeg);
  the map carries the real extension — keep it in sync with the actual files.
- Collaborators get an institution **chip** via `INSTITUTION_LOGOS`, keyed on the
  parenthetical token (`"Name (Umich, PI)"` → `umich`), files in
  `public/images/institutions/`. Sponsor logos float to **30px tall** (width
  follows aspect ratio); collab chips are a fixed **30×30** `contain` box.
- A missing logo is hidden via `onerror="this.remove()"`, so dropping a file in
  *after* the page loaded needs a full browser reload (a hot-reload won't re-add
  the removed `<img>`).
- Set `"earlier": true` on a project to move it into the collapsed **"Completed
  Projects"** disclosure — same `year-fold` styling as the Highlights fold.
- The combined `funders` image (`/images/funders.jpg`) renders below the cards at
  `max-width: 480px`.

**Footer** (`Footer.astro`) — single copyright line + "Back to top", both 0.92rem,
no horizontal rule.

**Favicon** (`public/favicon.svg` + `public/apple-touch-icon.png`)
- Black rounded-square **AM/DG** monogram. The letters are **vector paths**
  (Helvetica Bold outlines extracted via `fonttools`), so it renders identically
  without depending on an installed font. The 180×180 `apple-touch-icon.png` is
  rasterized from the SVG with `sharp` — regenerate it if the SVG changes. Both
  are linked in `Base.astro`.

**Images** (`src/lib/images.ts`) — raster photos that benefit from real
optimization (resize/webp/`srcset`) live in `src/assets/images/**`, not
`public/images/**`; content JSON still stores plain `/images/...` string paths
(content stays data), and `resolveImage()` maps that string to the imported
module via `import.meta.glob`. Components (`Hero`, `Team`, `Projects`,
`ProjectCard`) call `resolveImage()` and render `astro:assets`'s `<Image>` when
it resolves, falling back to a plain `<img>` otherwise — so dropping a new
photo into `src/assets/images/<folder>/` (matching the JSON path) is enough to
get it optimized; anything left in `public/images/**` (small SVG/PNG marks) is
served as-is, untouched by the build. **`Jose Martin del Campo`'s photo, if
added, should go in `src/assets/images/team/`, not `public/images/team/`.**
Small vector/institution logos stay in `public/images/{partners,institutions}/`
— astro:assets doesn't transform SVGs — but oversized ones should still be
run through `npx svgo --multipass -i <file> -o <file>` (lossless) before
committing.

## Open follow-ups
- Undergrad students need years/majors.
- `Jose Martin del Campo` (grad) has no photo (`src/assets/images/team/` — see Images above).
- AFOSR remains an opaque raster (JPEG) so it reads as a filled tile next to the
  transparent SVG marks — swap for a transparent SVG for a cleaner match. (ERDC
  and Alabama were already converted to optimized `<Image>` output, so they no
  longer carry the same file-size downside even though they're still JPEG/PNG
  source.)
- Nav label is still "Projects" while the section heading is "Active Projects".
- The CSP in `Base.astro` needs `script-src`/`style-src` `'unsafe-inline'`
  because this single-page build inlines its scripts/styles rather than
  emitting external files with a nonce/hash target — see
  `SECURITY_A11Y_PERF_REVIEW.md` for the full tradeoff and a possible
  hash-based follow-up.
- `AlumniAccordion.astro` doesn't actually collapse/expand despite its name;
  `tests/a11y.spec.ts`'s accordion test is stale against the current static-list
  design. Needs a product decision (see `SECURITY_A11Y_PERF_REVIEW.md`).

## Deploy (not yet a git repo)
GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on
push to `main`. `public/CNAME` = `amdg.science`. One-time: create the GitHub repo,
set **Settings → Pages → Source = GitHub Actions**, configure the custom domain +
DNS (see the Deployment section of `README.md`). After that, **pushing to `main`
builds and publishes automatically** — there's no separate "publish" command.
