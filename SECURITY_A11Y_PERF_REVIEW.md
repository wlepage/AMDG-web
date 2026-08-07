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

**Revalidated 2026-08-07:** a new high-severity `js-yaml` advisory
(`CVE-2026-59870` / `GHSA-5p4m-2wfm-xmqj`) had appeared since this review. Ran
`npm audit fix`, updating `js-yaml` 4.3.0 → 4.3.1 in `package-lock.json`; a fresh
`npm audit` again reports 0 vulnerabilities.

**Hardened 2026-08-07 — deployment supply chain and dependency monitoring.**
Pinned all four GitHub-hosted actions in `.github/workflows/deploy.yml` to the
full immutable commit SHAs for their current releases, retaining version comments
for readability and Dependabot maintenance. Added `.github/dependabot.yml` with
weekly grouped npm and GitHub Actions updates. Enabled Dependabot vulnerability
alerts and automated security-fix pull requests in the GitHub repository; the
API confirms alerts are active and automated fixes are enabled and unpaused.
Secret scanning and repository push protection were also enabled on 2026-08-07;
the GitHub API confirms both report `enabled`.

Additional low-risk hardening moved `pages: write` and `id-token: write` from
workflow-wide permissions to the deploy job only, disabled persisted checkout
credentials, added 10-minute job timeouts, and added a production-dependency
audit gate before each build. Updated compatible tooling to Astro 7.2.0,
Playwright 1.62.1, and axe-playwright 4.12.1; the full build and browser suite
pass and `npm audit` reports 0 vulnerabilities.

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
script-src-attr 'none'; base-uri 'self'; form-action 'none';
object-src 'none'; upgrade-insecure-requests
```
plus `<meta name="referrer" content="strict-origin-when-cross-origin">`.
`script-src-attr 'none'` still blocks injected event-handler attributes, and
`upgrade-insecure-requests` prevents accidental mixed-content loads.
**Known limitation, documented inline in `Base.astro`:** this site's build
inlines its component `<script>` blocks and the theme-vars `<style
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
workflow gives the build job only `contents: read`; `pages: write` and
`id-token: write` are scoped to the deploy job.

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

**Improved — carousel rotation follows the ARIA APG interaction pattern.** The
rotation control is now the first carousel control in the tab order, has a
changing Start/Stop accessible label instead of `aria-pressed`, and keyboard
focus stops rotation until the visitor explicitly restarts it. Hover and hidden
tabs still pause temporarily, and `prefers-reduced-motion` remains respected.

**Fixed — every Highlights tag is now included in contrast testing.** Tag text
is mixed to 65% of its category color against black. Opening the normally closed
"Earlier highlights" disclosure during the axe scan exposed and fixed both the
orange `feature` case and a 4.32:1 gold `award` case; the expanded scan now passes.

**Expanded 2026-08-07 — all disclosure content is covered by the Axe scan.**
The regression test now opens every `<details>` element before running axe-core,
so both older Highlights and Completed Projects remain covered as new cards are
added. The expanded desktop and mobile scans pass with no WCAG A/AA violations.

**No action needed — nav and disclosure widgets.** Nav controls are real
`<button>`s with `aria-expanded`/`aria-controls`, focus returns to the toggle on
Escape, and the Highlights "Earlier highlights" fold
uses a native `<details>/<summary>`, which gets correct keyboard/AT semantics
for free. Skip link and `lang="en"` are present and wired correctly. Alt text
is meaningful on all photographic images; decorative sponsor/institution logos
correctly use `alt=""`.

**Fixed — Alumni test now matches the always-expanded design.**
The site owner confirmed that Alumni should remain a fully visible static list,
with no disclosure controls. Replaced the stale accordion interaction test with
coverage that verifies every alumni group heading and list is visible and that
the section contains no `<details>`, `aria-expanded`, `.acc-trigger`, or button
controls.

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

**Improved 2026-08-07 — oversized display logos now use right-sized WebP.**
DOE, ONR, NSF, and Northwestern marks display at only 30px high but previously
accounted for 777 KB of decoded initial image data. Transparent 270px masters
now live under `src/assets/images/` and flow through `astro:assets`, producing
roughly 1–6 KB delivery images while preserving high-density display quality.
The same optimized NSF output is reused by the Community Resources badge.
In an identical clean production-browser trace, initial decoded payload fell
from 1.09 MB to 328 KB and full-scroll payload from 1.29 MB to 529 KB; no legacy
oversized logo URL was requested.

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

**Fixed — inactive carousel photos no longer download during initial load.**
Inactive slides now use `content-visibility: hidden`; their images remain lazy
and low priority, while the first image is eager and high priority. A clean
production-browser measurement at 1440×900 requested only the active glovebox
photo initially, down from all six carousel photos (about 331 KB combined in the
earlier measurement).

## Verification performed

- `npx astro build` succeeds cleanly after every change (dependency upgrade,
  CSP addition, image pipeline migration).
- `npm audit` — 0 vulnerabilities (was 6: 1 low, 5 high).
- `npm run test:a11y` (Playwright + axe-core against the real production
  build via `astro build && astro preview`) — all 5 tests pass, including the
  expanded-content WCAG 2.x A/AA axe scan, carousel rotation behavior, and the
  always-expanded Alumni behavior check.
- Production browser request trace at 1440×900 — one initial carousel image
  request (`glovebox…webp`), with all five inactive images deferred.
- Spot-checked `dist/index.html` and the generated `_astro/*.css` to confirm
  the CSP/referrer meta tags render, `<Image>`-generated `srcset`/webp output
  is present, and Astro's scoped-CSS `data-astro-cid-*` attributes still land
  on the new `<Image>`-rendered `<img>` tags (so existing component styles —
  e.g. `.funders img`, `.person__avatar img` — still apply).
- Ran `astro dev` locally and diffed the dev-mode HTML output against the same
  expectations (image count, `srcset` presence, CSP meta tag) as a second,
  independent check.

## Files changed
- `package.json` / `package-lock.json` — Astro 5.18.2 → 7.2.0,
  `@astrojs/sitemap` and test tooling updated, transitive audit fixes
- `src/layouts/Base.astro` — CSP + referrer-policy meta tags, inline-handler
  blocking, and insecure-request upgrading
- `src/components/ProjectCard.astro` — removed inline `onerror=`, added `<Image>` for raster logos
- `src/components/Hero.astro`, `Team.astro`, `Projects.astro` — `<Image>` adoption;
  Hero also defers inactive slides and implements APG-style rotation controls
- `src/components/Highlights.astro` — WCAG-AA tag text colors
- `src/lib/images.ts` — new glob-based image resolver
- `src/assets/images/**` — raster photos moved here from `public/images/**` (git-tracked renames)
- `public/images/partners/doe.svg`, `nsf.svg`, `public/images/institutions/northwestern.svg` — svgo-compressed in place
- `tests/a11y.spec.ts` — replaced the stale accordion test, opens hidden
  Highlights for axe, and tests carousel rotation behavior.
- `.github/workflows/deploy.yml` — pinned all actions to full commit SHAs,
  least-privilege job permissions, non-persisted checkout credentials, bounded
  runtimes, and a high-severity production audit gate.
- `.github/dependabot.yml` — weekly grouped npm and GitHub Actions updates.
