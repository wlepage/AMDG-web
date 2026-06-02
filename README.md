# AMDG — The Advanced Materials Design Group

The website for the Advanced Materials Design Group (AMDG) at The University of
Tulsa, Department of Mechanical Engineering. A single-page, statically generated
[Astro](https://astro.build) site, built for accessibility (WCAG 2.1/2.2 AA),
fast Core Web Vitals, and easy hand-editing of content.

- **Live site:** https://amdg.science
- **Stack:** Astro + TypeScript, zero client frameworks (only small vanilla scripts for the nav, carousel, and accordion)
- **Hosting:** GitHub Pages (static), custom apex domain `amdg.science`

---

## Quick start

```bash
npm install          # install dependencies
npm run dev          # local dev server at http://localhost:4321
npm run build        # static build to ./dist
npm run preview      # serve the built ./dist locally
```

Requirements: Node 20+ (developed on Node 22/25).

---

## Editing content

**All site content lives in [`/content`](./content) as JSON.** Nothing is
hardcoded in components, so you can update the site without touching markup.
Each file has a leading `_comment` explaining its fields.

| File | Controls |
|------|----------|
| `site.json` | Group name, descriptor, affiliation, nav anchors, SEO description |
| `about.json` | Mission, Vision, Approach (3 pillars) |
| `highlights.json` | "Brief Updates" — see below |
| `projects.json` | Project cards + the funders logo strip |
| `team.json` | People, grouped (PI / Graduate / Undergraduate) |
| `alumni.json` | Alumni accordion groups |
| `contact.json` | Address, office, email, map link |
| `hero.json` | Hero stage: carousel slides or a video embed |
| `theme.json` | Color tokens (palette) — see [Theme & colors](#theme--colors) |

After editing, run `npm run dev` (hot-reloads) or `npm run build`.

### Adding a highlight

Add an object anywhere in `highlights.json` → `items`. The list re-sorts by
`date` (newest first) automatically:

```json
{
  "date": "2026-05-01",
  "displayDate": "May 2026",
  "tags": ["award"],
  "text": "Your update text, kept verbatim."
}
```

`date` is ISO (`YYYY-MM-DD`, used only for sorting); `displayDate` is the label
shown on the page. `tags` is optional.

### Adding / editing a team member

Add an object to the relevant group in `team.json`. **Only `name` is
required**; every other field is optional and the card degrades gracefully:

```json
{
  "name": "Jane Doe",
  "role": "Mechanical Engineering 2027",
  "photo": "/images/team/doe.jpg",
  "email": "doe@utulsa.edu",
  "education": ["B.S., Mechanical Engineering, The University of Tulsa"],
  "coAdvisor": "Co-advised by Dr. X",
  "interests": ["Fatigue", "Additive manufacturing"],
  "links": [{ "label": "Google Scholar", "href": "https://..." }]
}
```

**Photos:** drop a square-ish image in [`public/images/team/`](./public/images/team)
and set `"photo": "/images/team/<file>"`. If omitted, the card shows a monogram
avatar of the person's initials. (Undergraduate photos from the old Google Sites
site were not reliably recoverable, so they currently use monograms — add real
photos any time using this workflow.)

### Adding an alumni entry

In `alumni.json`, `detailed` groups (Master's) take `{ name, thesis, placement }`;
`names` groups take a simple array of name strings.

---

## Theme & colors

The palette is **"Slate Navy & Cyan"**, hand-authored in
[`content/theme.json`](./content/theme.json). At build time,
[`src/layouts/Base.astro`](./src/layouts/Base.astro) turns those tokens into CSS
custom properties (`--c-brand-primary`, `--c-brand-accent`, …) that every
component references — so **changing a color is a one-line edit** in
`theme.json`.

All foreground/background text pairings in the palette meet WCAG AA contrast.
If you change colors, re-check contrast (e.g. with the
[WebAIM contrast checker](https://webaim.org/resources/contrastchecker/)).

### Regenerating the theme from another site (optional)

There's a generic extractor that can *seed* tokens from any site's CSS:

```bash
node scripts/extract-theme.mjs https://example.edu        # extract + write content/theme.json
node scripts/extract-theme.mjs https://example.edu --dry   # print only
node scripts/extract-theme.mjs                             # rewrite the safe fallback palette
```

It fetches the page, discovers linked + inline CSS, and pulls out CSS custom
properties and the most-used hex colors, mapping them to semantic tokens
(falling back to the safe palette for anything it can't determine). The mapping
is heuristic — **always eyeball the result for contrast.** `content/theme.json`
remains the committed source of truth; this script is just a convenience.

---

## Accessibility

Built to WCAG 2.1 / 2.2 Level AA. Key features:

- Semantic landmarks (`header` / `nav` / `main` / `footer`), one `h1`, correctly
  nested headings, and a **skip link** to `#main`.
- Visible focus ring on every interactive element (contrast-safe on light *and*
  dark surfaces); logical tab order; no keyboard traps.
- `prefers-reduced-motion` is respected: smooth scrolling, the carousel's
  auto-rotation, and transitions are all disabled.
- Carousel: `aria-roledescription`, prev/next, slide dots (≥24 px targets),
  pause/play for auto-rotation, a polite live-region status, and pause on
  hover/focus.
- Alumni accordion: real `<button>`s with `aria-expanded` / `aria-controls`,
  labelled regions, and working Expand all / Collapse all.
- Color is never the only signal; images have meaningful `alt` text.

### Automated tests

```bash
npm run test:a11y:install   # one-time: install the Playwright Chromium browser
npm run test:a11y           # build, preview, and run axe-core + interaction checks
```

[`tests/a11y.spec.ts`](./tests/a11y.spec.ts) runs **axe-core** against the built
site with the `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` rule tags and
asserts zero violations, plus checks the skip link, landmarks, accordion, and
carousel.

### Manual checklist

- [ ] Tab from the top: the skip link appears first and jumps to main content.
- [ ] Every link/button shows a clearly visible focus ring.
- [ ] Tab order follows the visual order; nothing is unreachable or traps focus.
- [ ] Carousel: prev/next/dots/pause all work from the keyboard; Pause stops rotation.
- [ ] Turn on OS "Reduce Motion": the carousel does not auto-advance and scrolling isn't animated.
- [ ] Accordion: each header toggles with Enter/Space; Expand all / Collapse all work; state is announced.
- [ ] Headings read in a logical outline (one `h1`, no skipped levels).
- [ ] Zoom to 200%: layout reflows without loss of content or horizontal scrolling.
- [ ] Screen-reader pass (VoiceOver: ⌘+F5) of nav, carousel, and accordion.

---

## Hero stage & video

The hero is configured in [`content/hero.json`](./content/hero.json). With
`"mode": "carousel"` it shows the photo carousel (`slides`). To embed a video
later, set `"mode": "video"` and fill **one** source:

```jsonc
"mode": "video",
"video": {
  "type": "youtube",            // "youtube" | "vimeo" | "file"
  "youtubeId": "abc123",        // for YouTube
  "vimeoId": "",                // for Vimeo
  "src": "",                    // for self-hosted: "/videos/clip.mp4"
  "poster": "",                 // optional poster image for self-hosted
  "title": "AMDG lab overview", // accessible iframe title (required for embeds)
  "captionsHref": "",           // for self-hosted: "/videos/clip.en.vtt"
  "transcriptHref": ""
}
```

If `mode` is `video` but no usable source is set, the hero falls back to the
carousel automatically.

**Accessibility expectations for video (AA):**
- **Captions are required** for any video with speech (SC 1.2.2). For YouTube/Vimeo,
  upload accurate captions on the platform (auto-captions must be corrected). For
  self-hosted `<video>`, provide a `.vtt` caption file via `captionsHref` — it's
  wired up as a `<track kind="captions">`.
- Provide a **transcript** (link via `transcriptHref`) — good practice and covers
  audio description needs (SC 1.2.3/1.2.5).
- Give embeds a descriptive `title`. Do **not** autoplay with sound.

### Replacing carousel photos

Drop images in [`public/images/hero/`](./public/images/hero) and update the
`slides` array in `hero.json` (each slide is `{ "src", "alt" }`). Write
**descriptive alt text** for each. Slides use `object-fit: contain` so figures
with embedded labels aren't cropped.

---

## Deployment — GitHub Pages + custom domain

Deploys happen automatically via GitHub Actions
([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)) on every push
to `main`. `public/CNAME` (=`amdg.science`) and `public/.nojekyll` are copied
into the build.

### One-time setup

1. **Create the repo** and push this project to the `main` branch
   (e.g. `https://github.com/<your-username>/amdg-web`).
2. In **GitHub → Settings → Pages**, set **Source = GitHub Actions**.
3. Push to `main`. The workflow builds and deploys to GitHub Pages.

### DNS for the apex domain `amdg.science`

At your domain registrar / DNS host, set these records (this is what points the
domain at GitHub Pages). The apex (`@`) uses GitHub's four A records; `www`
points at your Pages host:

```
Type   Name   Value
A      @      185.199.108.153
A      @      185.199.109.153
A      @      185.199.110.153
A      @      185.199.111.153
AAAA   @      2606:50c0:8000::153
AAAA   @      2606:50c0:8001::153
AAAA   @      2606:50c0:8002::153
AAAA   @      2606:50c0:8003::153
CNAME  www    <your-username>.github.io.
```

Then, in **GitHub → Settings → Pages → Custom domain**, enter `amdg.science`
and save (this verifies the `CNAME`). Once DNS propagates, tick **Enforce
HTTPS** — GitHub provisions a free Let's Encrypt certificate automatically (can
take a few minutes to an hour).

> **Moving off Google Sites with minimal downtime:** keep the current site up,
> add the DNS records above and confirm the GitHub Pages build is green and
> reachable at `https://<your-username>.github.io/`. Then switch the apex
> `A`/`AAAA` records (and the `www` `CNAME`) from Google to GitHub. Lower your
> DNS TTL a day beforehand so the cutover is quick. Remove the old Google Sites
> domain mapping after GitHub's HTTPS certificate is active.

### Deploying to a project subpath instead

If you ever serve from `https://<user>.github.io/amdg-web/` rather than the apex
domain, set `base: '/amdg-web'` in [`astro.config.mjs`](./astro.config.mjs) and
prefix the root-absolute asset paths in `content/*.json` with the base. The apex
setup above needs no base change.

---

## Project structure

```
content/        # all editable content (JSON) — the source of truth
public/         # static assets served as-is: fonts, images, CNAME, robots, favicon
src/
  layouts/Base.astro          # <head>, fonts, theme tokens, skip link
  pages/index.astro           # the single page; composes the sections
  components/                 # Nav, Hero, Section, Highlights, Projects, Team, AlumniAccordion, Contact, Footer, MissionVisionApproach
  lib/content.ts              # typed loaders for content/*.json
  styles/global.css           # design tokens, base styles, focus, reduced motion
scripts/extract-theme.mjs     # optional theme extractor
tests/a11y.spec.ts            # Playwright + axe accessibility tests
.github/workflows/deploy.yml  # GitHub Pages deployment
```

---

## License / content

Site content © William LePage, Department of Mechanical Engineering, The
University of Tulsa.
