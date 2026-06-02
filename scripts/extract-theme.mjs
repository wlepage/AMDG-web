#!/usr/bin/env node
/**
 * extract-theme.mjs — generic site → theme token extractor.
 *
 * Fetches a URL, discovers its CSS (linked stylesheets + inline <style>),
 * pulls out CSS custom properties and the most frequently used hex/rgb colors,
 * and emits semantic tokens to content/theme.json.
 *
 * Usage:
 *   node scripts/extract-theme.mjs <url>          # extract + write content/theme.json
 *   node scripts/extract-theme.mjs <url> --dry     # print only, do not write
 *   node scripts/extract-theme.mjs                 # no url: (re)write the safe fallback palette
 *
 * NOTE: AMDG intentionally uses a hand-authored palette ("Slate Navy & Cyan").
 * This script is an optional convenience for seeding a theme from another site;
 * content/theme.json remains the committed source of truth. Heuristic color
 * mapping is approximate — always eyeball the result for WCAG AA contrast.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../content/theme.json');

// Safe, documented fallback (matches the committed palette).
const FALLBACK = {
  name: 'Slate Navy & Cyan',
  tokens: {
    brandPrimary: '#1E3A5F',
    brandSecondary: '#14283F',
    brandAccent: '#06B6D4',
    accentStrong: '#0E6F86',
    background: '#FFFFFF',
    surface: '#F1F5F9',
    surfaceAlt: '#E7EEF5',
    text: '#0F1B2A',
    mutedText: '#51637A',
    onBrand: '#FFFFFF',
    onBrandMuted: '#C6D6E8',
    border: '#D5DEE8',
    focusRing: '#1E3A5F',
    focusGlow: '#22D3EE',
  },
};

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const url = args.find((a) => !a.startsWith('--'));

const write = (theme, note) => {
  if (dry) {
    console.log(note);
    console.log(JSON.stringify(theme, null, 2));
    return;
  }
  const payload = {
    _comment:
      "Semantic color tokens for AMDG. Palette: 'Slate Navy & Cyan'. " +
      'Generated/seeded by scripts/extract-theme.mjs; verify WCAG AA contrast after editing. ' +
      'This file is the committed source of truth consumed by src/layouts/Base.astro.',
    ...theme,
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`${note}\nWrote ${OUT}`);
};

if (!url) {
  write(FALLBACK, 'No URL given — writing the safe fallback palette.');
  process.exit(0);
}

const fetchText = async (u) => {
  const res = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 amdg-theme-extractor' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${u}`);
  return res.text();
};

const normalizeHex = (h) => {
  h = h.toLowerCase();
  if (h.length === 4) h = '#' + [...h.slice(1)].map((c) => c + c).join('');
  return h.slice(0, 7);
};

try {
  const html = await fetchText(url);
  const base = new URL(url);

  // Discover stylesheet hrefs + inline <style> blocks.
  const cssSources = [];
  for (const m of html.matchAll(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi)) {
    const href = m[0].match(/href=["']([^"']+)["']/i)?.[1];
    if (href) cssSources.push(new URL(href, base).href);
  }
  let css = '';
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) css += '\n' + m[1];
  for (const href of cssSources) {
    try { css += '\n' + (await fetchText(href)); } catch (e) { console.warn(`  skip ${href}: ${e.message}`); }
  }

  // CSS custom properties that hold colors.
  const vars = {};
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g)) {
    vars[m[1]] = m[2];
  }

  // Frequency of hex colors (rough theme signal).
  const freq = new Map();
  for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const hex = normalizeHex(m[0]);
    if (/^#(fff|000)/.test(hex)) continue; // ignore pure white/black noise
    freq.set(hex, (freq.get(hex) || 0) + 1);
  }
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);

  // Heuristic mapping; fall back to the safe palette for anything missing.
  const tokens = { ...FALLBACK.tokens };
  const pick = (names) => names.map((n) => vars[n]).find(Boolean);
  if (pick(['--color-primary', '--brand-primary', '--primary'])) tokens.brandPrimary = pick(['--color-primary', '--brand-primary', '--primary']);
  if (pick(['--color-secondary', '--brand-secondary', '--secondary'])) tokens.brandSecondary = pick(['--color-secondary', '--brand-secondary', '--secondary']);
  if (pick(['--color-accent', '--brand-accent', '--accent'])) tokens.brandAccent = pick(['--color-accent', '--brand-accent', '--accent']);
  if (!vars['--color-primary'] && ranked[0]) tokens.brandPrimary = ranked[0];
  if (ranked[1]) tokens.brandAccent = tokens.brandAccent === FALLBACK.tokens.brandAccent ? ranked[1] : tokens.brandAccent;

  console.log(`Discovered ${Object.keys(vars).length} color custom-properties and ${freq.size} distinct hex colors.`);
  console.log(`Top colors: ${ranked.slice(0, 6).join(', ') || '(none)'}`);
  write({ name: `Extracted from ${base.hostname}`, tokens }, 'Extraction complete.');
} catch (err) {
  console.error(`Extraction failed: ${err.message}`);
  write(FALLBACK, 'Falling back to the safe palette.');
  process.exit(0);
}
