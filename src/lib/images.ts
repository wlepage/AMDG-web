// Maps the plain string paths stored in /content/*.json (e.g.
// "/images/team/lepage.jpg") to the matching imported module under
// src/assets/images, so components can hand the string straight to
// astro:assets's <Image> and still get real optimization (resize/webp/srcset)
// — content stays data, but the actual bytes flow through Vite's asset
// pipeline instead of being served untouched from public/.
import type { ImageMetadata } from 'astro';

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/**/*.{jpg,jpeg,png}',
  { eager: true }
);

const byPublicPath = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(modules)) {
  const publicPath = path.replace('/src/assets/images', '/images');
  byPublicPath.set(publicPath, mod.default);
}

/** Resolve a /images/... string path (as stored in content JSON) to an
 * optimizable ImageMetadata, for use with astro:assets's <Image>. */
export function resolveImage(src: string): ImageMetadata | undefined {
  return byPublicPath.get(src);
}
