# Security, accessibility & performance review

Date: 2026-07-28. Scope: the whole Astro static site (single page, deployed to
GitHub Pages at amdg.science). Each finding is Status → What → Why it matters →
Fix. "No action needed" items include the verification data so the conclusion
is checkable later, not just asserted.

## Security

**Fixed — outdated dependencies with known CVEs.**
`npm audit` on the pre-review lockfile showed 6 advisories (1 low, 5 high),
including several Astro XSS advisories (`GHSA-8hv8-536x-4wqp` reflected XSS via
unescaped slot name, `GHSA-jrpj-wcv7-9fh9` XSS via spread props,
`GHSA-2pvr-wf23-7pc7` SSRF in prerendered error pages) and a high-severity
`sharp`/libvips advisory. Astro was on `5.18.2`; none of the fixes back-ported
to a 5.x or 6.x patch, only `astro@7.1.5`+. Upgraded `astro` 5.18.2 → **7.1.5**
and `@astrojs/sitemap` → latest, then ran `npm audit fix` for the remaining
transitive `sharp`/`svgo` bumps. **`npm audit` now reports 0 vulnerabilities.**
Verified with a full `astro build` before and after — output is equivalent,
config (`astro.config.mjs`) needed no changes since this site only uses `site`,
`base`, `trailingSlash`, `build.inlineStylesheets`, and the sitemap integration,
none of which changed between major versions.

**Fixed — inline event handlers blocked a real CSP.**
`ProjectCard.astro` had `onerror="this.remove()"` on two `<img>` tags (sponsor
and collaborator-institution logos) to hide broken images gracefully. Inline
handler attributes count as inline script for CSP purposes. Replaced both with
a `data-hide-on-error` attribute plus a single delegated listener
(`document.addEventListener('error', ..., true)` — capture phase, since
`error` doesn't bubble on `<img>`) in `ProjectCard.astro`'s module script.
Same visible behavior, no inline JS.

**Added — Content-Security-Policy and Referrer-Policy.**
There was no CSP or other security header anywhere. GitHub Pages serves no
custom HTTP headers at all, so the only lever is `<meta http-equiv>` in
`src/layouts/Base.astro`. Added:
```
default-src 'self'; img-src 'self' data:;
frame-src https://www.youtube-nocookie.com https://player.vimeo.com;
style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';
base-uri 'self'; form-action 'none'; object-src 'none'
```
plus `<meta name="referrer" content="strict-origin-when-cross-origin">`.
**Known limitation, documented inline in `Base.astro`:** this site's build
inlines its two component `<script>` blocks and the theme-vars `<style
set:html>` block directly into the HTML (single-page site, no external chunk
files), so there's no nonce/hash to pin them to — `script-src` and `style-src`
both need `'unsafe-inline'`. That means this CSP does **not** stop inline-script
XSS on its own; its real value is `default-src`/`object-src`/`base-uri`/
`form-action`/`frame-src`, which still block rogue iframes, base-tag
hijacking, form-based exfiltration, and loading any subresource from off-origin.
A stronger follow-up (not done here, since it adds real build complexity for a
site with no current injection sink) would be a postbuild step that hashes the
built inline scripts/styles and swaps them into the CSP automatically.

**No action needed — injection sinks are all locally trusted.**
The three `set:html` sinks (`Highlights.astro:29,60` for `highlights.json`
`text` fields, `Base.astro` theme-vars style block) are fed exclusively by
files committed to the repo and imported at build time — no runtime or network
input reaches them. If highlights content ever becomes crowd-sourced/CMS-driven
this assumption needs revisiting.

**No action needed — no forms, no secrets.**
The only "contact" mechanism is a `mailto:` link (`Team.astro`). Grepped the
whole repo for `API_KEY|SECRET|TOKEN|PASSWORD` (case-insensitive) — no hits
beyond the word "token" meaning CSS design tokens. The GitHub Actions deploy
workflow's permissions (`contents: read, pages: write, id-token: write`) are
already minimally scoped.

**No action needed — external links.** All 3 `target="_blank"` links already
pair `rel="noopener noreferrer"`. The YouTube/Vimeo embeds use the
privacy-conscious `youtube-nocookie.com` domain and scoped `allow` attributes.

## Accessibility

Ran the repo's existing Playwright + axe-core suite (`npm run test:a11y`)
against the production build both before and after the changes above — **the
automated WCAG 2.x A/AA scan passes, along with heading-structure, skip-link,
and carousel-control tests.**

**No action needed — color contrast, verified by hand.** `theme.json` claims
all text pairings meet WCAG AA; recomputed the two combinations most worth
double-checking:
- `mutedText #51637A` on `background #FFFFFF` → **6.15:1**
- `mutedText #51637A` on `surfaceAlt #E7EEF5` → **5.25:1**
- `onBrandMuted #C6D6E8` on `brandPrimary #1E3A5F` → **7.77:1**

All comfortably clear the 4.5:1 AA threshold for normal text. No color changes
made.

**No action needed — nav, carousel, disclosure widgets.** Nav toggle and
carousel controls are real `<button>`s with `aria-expanded`/`aria-controls`/
`aria-live`/`aria-current`, focus returns to the toggle on Escape, and
`prefers-reduced-motion` is respected. The Highlights "Earlier highlights" fold
uses a native `<details>/<summary>`, which gets correct keyboard/AT semantics
for free. Skip link and `lang="en"` are present and wired correctly. Alt text
is meaningful on all photographic images; decorative sponsor/institution logos
correctly use `alt=""`.

**Flagged, not changed — `AlumniAccordion.astro` doesn't actually collapse.**
Despite the name, it renders a fully static, always-expanded list — no
`<details>`, no expand/collapse JS. This is why `tests/a11y.spec.ts`'s
"alumni accordion toggles and Collapse all works" test currently fails looking
for a `.acc-trigger` element that doesn't exist in the component — **this is a
pre-existing stale test, not a regression from this review** (verified: the
component had no accordion behavior before any of today's changes either).
Whether the component should regain real collapse/expand behavior, or the test
should be deleted/rewritten to match the current static-list design, is a
product decision the site owner should make — left as-is here.

## Performance

**Fixed — wired up `astro:assets` for real image optimization.**
No component used `astro:assets`/`<Image>` before; every photo was served
byte-for-byte from `public/images/` with no resizing, format conversion, or
responsive `srcset`. Moved the raster photos that matter most (hero slides,
funders composite, team portraits, and the two oversized partner/institution
raster logos — `erdc.jpg`, `alabama.png`) into `src/assets/images/` so Vite's
image pipeline can process them, added `src/lib/images.ts` (a
`import.meta.glob` lookup keyed by the same `/images/...` string paths that
`content/*.json` already stores, so **content stays data** per the project's
architecture — components resolve the string to an optimizable module, falling
back to a plain `<img>` if a path isn't in the glob). Updated `Hero.astro`,
`Team.astro`, `Projects.astro`, and `ProjectCard.astro` to render `<Image>`
with explicit `widths`/`sizes` where responsive variants make sense.

Concrete before/after from the build log (`astro build` auto-generates WebP):
| Image | Before | After (largest variant) |
|---|---|---|
| `hero/sintering.jpg` | 378 KB | 153 KB (webp, still multi-width) |
| `hero/building.jpg` | 315 KB | 151 KB |
| `partners/erdc.jpg` | 438 KB | **2 KB** (rendered at its actual ~30px display size) |
| `institutions/alabama.png` | 83 KB | **<1 KB** |
| `funders.jpg` | 189 KB | 21–69 KB across responsive widths |
| team portraits (×7) | 47–63 KB each | 5–7 KB each |

Total `dist/` build size: **3.6 MB → 2.9 MB**, despite now shipping *more*
files (responsive width variants per image) — the previously-oversized partner
logos account for most of the remaining drop potential being already realized.

**Fixed — `doe.svg` and other oversized SVGs losslessly compressed.**
`doe.svg` (a genuine detailed vector seal, 2111 lines of real path data, not
raster bloat — inspected directly) went from 494 KB → 442 KB via `npx svgo
--multipass`. Also ran svgo on two other oversized SVG logos found during the
image pass: `partners/nsf.svg` 124 KB → 111 KB, `institutions/northwestern.svg`
107 KB → 67 KB. All lossless.

**No action needed — fonts.** Already self-hosted (not Google Fonts CDN), all
three `@font-face` rules use `font-display: swap`, and the two most-used fonts
are correctly preloaded in `Base.astro`.

**No action needed — render-blocking resources / script placement.** The
external stylesheet is small (~22 KB) and the module scripts are placed in
`<body>`; being `type="module"` they're deferred regardless of position. No
change made.

**No action needed — carousel/nav scripts.** No layout-thrashing pattern
(writes only in the render loop, no interleaved geometry reads);
`IntersectionObserver` is used for the nav scroll-spy instead of scroll-event
polling; slide transitions are pure `opacity` (compositor-friendly). No change
made.

## Verification performed

- `npx astro build` succeeds cleanly after every change (dependency upgrade,
  CSP addition, image pipeline migration).
- `npm audit` — 0 vulnerabilities (was 6: 1 low, 5 high).
- `npm run test:a11y` (Playwright + axe-core against the real production
  build via `astro build && astro preview`) — 4/5 pass, including the WCAG
  2.x A/AA axe scan; the 1 failure is the pre-existing stale alumni-accordion
  test described above, unrelated to this review's changes.
- Spot-checked `dist/index.html` and the generated `_astro/*.css` to confirm
  the CSP/referrer meta tags render, `<Image>`-generated `srcset`/webp output
  is present, and Astro's scoped-CSS `data-astro-cid-*` attributes still land
  on the new `<Image>`-rendered `<img>` tags (so existing component styles —
  e.g. `.funders img`, `.person__avatar img` — still apply).
- Ran `astro dev` locally and diffed the dev-mode HTML output against the same
  expectations (image count, `srcset` presence, CSP meta tag) as a second,
  independent check.

## Files changed
- `package.json` / `package-lock.json` — Astro 5.18.2 → 7.1.5, `@astrojs/sitemap` → latest, transitive audit fixes
- `src/layouts/Base.astro` — CSP + referrer-policy meta tags
- `src/components/ProjectCard.astro` — removed inline `onerror=`, added `<Image>` for raster logos
- `src/components/Hero.astro`, `Team.astro`, `Projects.astro` — `<Image>` adoption
- `src/lib/images.ts` — new glob-based image resolver
- `src/assets/images/**` — raster photos moved here from `public/images/**` (git-tracked renames)
- `public/images/partners/doe.svg`, `nsf.svg`, `public/images/institutions/northwestern.svg` — svgo-compressed in place

## Open item for the site owner
Decide whether `AlumniAccordion.astro` should regain real collapse/expand
behavior (matching its name and the existing but now-stale Playwright test),
or whether the test should be updated to match its current always-expanded
design. Not resolved here — it's a product decision, not a defect.
