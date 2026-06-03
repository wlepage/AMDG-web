// Typed, central access to the data-driven content in /content.
// Components import from here so no list is ever hardcoded in markup.
import site from '@content/site.json';
import theme from '@content/theme.json';
import hero from '@content/hero.json';
import about from '@content/about.json';
import highlights from '@content/highlights.json';
import projects from '@content/projects.json';
import team from '@content/team.json';
import alumni from '@content/alumni.json';

export interface NavItem { id: string; label: string; }
export interface Site {
  name: string; shortName: string; acronymExpanded: string; descriptor: string;
  affiliation: string; affiliationShort: string; url: string; description: string;
  nav: NavItem[];
}

export interface ThemeTokens { [key: string]: string; }
export interface Theme { name: string; tokens: ThemeTokens; }

export interface HeroVideo {
  type: 'youtube' | 'vimeo' | 'file' | null;
  youtubeId: string; vimeoId: string; src: string; poster: string;
  title: string; captionsHref: string; transcriptHref: string;
}
export interface HeroSlide { src: string; alt: string; }
export interface Hero {
  mode: 'carousel' | 'video';
  eyebrow: string; kicker: string; autoAdvanceMs: number;
  video: HeroVideo; slides: HeroSlide[];
}

export interface Pillar { title: string; text: string; }
export interface About {
  mission: { eyebrow: string; text: string };
  vision: { eyebrow: string; text: string };
  approach: { eyebrow: string; intro: string; pillars: Pillar[]; closing: string };
}

export interface Highlight { date: string; displayDate: string; tags?: string[]; text: string; link?: string; }
export interface Project { title: string; sponsor?: string; collaborators?: string[]; description?: string; earlier?: boolean; }
export interface Funders { image: string; alt: string; heading: string; }

export interface PersonLink { label: string; href: string; }
export interface Person {
  name: string; role?: string; photo?: string; email?: string; bio?: string;
  interests?: string[]; education?: string[]; coAdvisor?: string; links?: PersonLink[];
}
export interface TeamGroup { title: string; members: Person[]; }

export interface AlumniMember { name: string; thesis?: string; placement?: string; }
export interface AlumniGroup {
  id: string; title: string; type: 'detailed' | 'names';
  members: (AlumniMember | string)[];
}

export const SITE = site as Site;
export const THEME = theme as unknown as Theme;
export const HERO = hero as unknown as Hero;
export const ABOUT = about as About;
export const PROJECTS = (projects.items as Project[]);
export const FUNDERS = (projects.funders as Funders);
export const TEAM = (team.groups as unknown as TeamGroup[]);
export const ALUMNI = (alumni.groups as unknown as AlumniGroup[]);

// Highlights are always returned newest-first regardless of source order.
export const HIGHLIGHTS: Highlight[] = [...(highlights.items as Highlight[])].sort(
  (a, b) => b.date.localeCompare(a.date)
);

/** Build a CSS custom-property block from the theme tokens. */
export function themeCssVars(t: Theme = THEME): string {
  return Object.entries(t.tokens)
    .map(([k, v]) => `  --c-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v};`)
    .join('\n');
}

/** Initials for a monogram avatar fallback (e.g. "Avin Long" -> "AL"). */
export function initials(name: string): string {
  const parts = name.replace(/,.*$/, '').trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
