// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Production site lives on the custom apex domain. Because we deploy to the
// domain root (not a project subpath), `base` stays '/'. If you ever deploy to
// https://<user>.github.io/amdg-web/ instead, set `base: '/amdg-web'` and the
// root-absolute asset paths in content JSON will need the BASE_URL prefix.
export default defineConfig({
  site: 'https://amdg.science',
  base: '/',
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'auto',
  },
  integrations: [sitemap()],
});
