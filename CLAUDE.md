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
| `projects.json` | project cards + `funders` logo image | `Projects.astro` |
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

**Projects** (`Projects.astro` + `projects.json`)
- Each card's top sponsor pill auto-derives an agency logo via `AGENCY_LOGOS`
  (NSF/NASA/AFOSR/ONR/ERDC → `/images/partners/<agency>.svg`); a missing file is
  hidden via `onerror` so there are never broken images. **No logo files exist
  yet** — drop SVGs into `public/images/partners/` to light them up.
- The combined `funders` image (`/images/funders.jpg`) renders below the cards at
  `max-width: 480px`.

**Footer** (`Footer.astro`) — single copyright line + "Back to top", both 0.92rem,
no horizontal rule.

## Open follow-ups
- Undergrad students need years/majors.
- Agency/partner logo SVGs not yet added (`public/images/partners/`).
- `Jose Martin del Campo` (grad) has no photo (`public/images/team/`).

## Deploy (not yet a git repo)
GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on
push to `main`. `public/CNAME` = `amdg.science`. One-time: create the GitHub repo,
set **Settings → Pages → Source = GitHub Actions**, configure the custom domain +
DNS (see the Deployment section of `README.md`). After that, **pushing to `main`
builds and publishes automatically** — there's no separate "publish" command.
