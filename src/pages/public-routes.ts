/**
 * Single source of truth for DocForum's public, prerendered pages (issue
 * #120): route definitions, headings, metadata, canonical-URL policy and
 * the helpers that move a prerendered path back into the app's HashRouter
 * on boot.
 *
 * Deliberately pure — no DOM access at module scope. It is imported by the
 * client bundle, by the build-time prerender entry
 * (`src/prerender/entry-server.tsx`, which `scripts/prerender.mjs` runs
 * after `vite build`) and by tests.
 */

export interface PublicPageDef {
  /** Router path: leading slash, no trailing slash. `'/'` is the landing page. */
  path: string;
  /** The page's `<h1>`. The landing page renders its own in `HomePage`. */
  heading: string;
  /** `<title>` — unique per route. */
  title: string;
  /** `meta description` — unique per route. */
  description: string;
}

/**
 * The canonical production origin, verified from this repo's deployment
 * configuration (`ARCHITECTURE_ESSENTIALS.md` "Deployment" and
 * `.github/workflows/deploy-pages.yml`): the GitHub Pages project site.
 * Overridable for a fork or a future custom domain via
 * `VITE_PUBLIC_SITE_ORIGIN` — the canonical URL is absolute metadata about
 * the deployed site, so it must not depend on where a given build runs.
 */
export const SITE_ORIGIN =
  (import.meta.env.VITE_PUBLIC_SITE_ORIGIN as string | undefined) ?? 'https://docforum.github.io';

/** Path prefix of the deployed GitHub Pages project site. */
export const SITE_BASE = '/docforum-web/';

export const PUBLIC_PAGES: readonly PublicPageDef[] = [
  {
    path: '/',
    heading: 'The hospital visit, collapsed into one thread.',
    title: 'DocForum — the hospital visit, collapsed into one thread',
    description:
      'One continuous thread from symptom to results: booking, referral, structured orders, and escrow-secured fulfillment. DocForum public preview.',
  },
  {
    path: '/how-it-works',
    heading: 'How DocForum works',
    title: 'How it works — DocForum',
    description:
      'Book a verified doctor\u2019s real availability, consult, get referred with context, receive structured orders, and fulfil them at a chosen facility.',
  },
  {
    path: '/for-doctors',
    heading: 'DocForum for doctors',
    title: 'For doctors — DocForum',
    description:
      "Today's queue, consultation notes, a messages inbox across patient threads, and private practice insights — for verified doctors on DocForum.",
  },
  {
    path: '/for-facilities',
    heading: 'DocForum for facilities',
    title: 'For facilities — DocForum',
    description:
      'Verify orders by QR or token, run an attributed fulfillment queue, track escrow payouts, and manage staff accounts on DocForum.',
  },
  {
    path: '/privacy',
    heading: 'Privacy',
    title: 'Privacy — DocForum',
    description:
      'What DocForum stores and who can see it: sessions, health records, location handling, data export, and deletion. Draft pending legal review.',
  },
  {
    path: '/accessibility',
    heading: 'Accessibility statement',
    title: 'Accessibility statement — DocForum',
    description:
      'Keyboard support, visible focus, reduced motion, high-contrast theming, and the accessibility gaps DocForum is still tracking.',
  },
  {
    path: '/faq',
    heading: 'Frequently asked questions',
    title: 'FAQ — DocForum',
    description:
      'Who can sign up, what the public preview includes, how facility accounts work, and how DocForum handles your data.',
  },
];

export function publicPageByPath(path: string): PublicPageDef | undefined {
  return PUBLIC_PAGES.find((page) => page.path === path);
}

/** Join `path` onto a site base, always with a trailing slash (directory URL). */
export function publicPathUrl(path: string, base: string = SITE_BASE): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const trimmed = path === '/' ? '' : path.replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed ? `${normalizedBase}${trimmed}/` : normalizedBase;
}

/** Absolute canonical URL for a public route on the production origin. */
export function canonicalUrl(path: string): string {
  return `${SITE_ORIGIN.replace(/\/+$/, '')}${publicPathUrl(path)}`;
}

/** The metadata tags every public page must carry (head + client nav). */
export interface MetaTag {
  attribute: 'name' | 'property' | 'rel';
  key: string;
  content?: string;
  href?: string;
}

export function metaTagsFor(def: PublicPageDef): MetaTag[] {
  const url = canonicalUrl(def.path);
  return [
    { attribute: 'name', key: 'description', content: def.description },
    { attribute: 'rel', key: 'canonical', href: url },
    { attribute: 'property', key: 'og:title', content: def.title },
    { attribute: 'property', key: 'og:description', content: def.description },
    { attribute: 'property', key: 'og:url', content: url },
    { attribute: 'property', key: 'og:type', content: 'website' },
    { attribute: 'property', key: 'og:site_name', content: 'DocForum' },
    { attribute: 'name', key: 'twitter:card', content: 'summary' },
    { attribute: 'name', key: 'twitter:title', content: def.title },
    { attribute: 'name', key: 'twitter:description', content: def.description },
  ];
}

/**
 * Map a real request path (`/docforum-web/how-it-works/`) back to the
 * public route the router knows (`/how-it-works`), or `null` when the
 * path is not one of the prerendered public pages.
 */
export function publicRoutePathFromLocation(pathname: string, base: string): string | null {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  let candidate = pathname;

  if (normalizedBase !== '/') {
    if (candidate === normalizedBase.slice(0, -1)) {
      candidate = '/';
    } else if (candidate.startsWith(normalizedBase)) {
      candidate = candidate.slice(normalizedBase.length - 1);
    } else {
      return null;
    }
  }

  candidate = candidate.replace(/\/index\.html$/, '');
  if (candidate.length > 1 && candidate.endsWith('/')) candidate = candidate.slice(0, -1);

  return publicPageByPath(candidate) ? candidate : null;
}

/**
 * Crawlers index the prerendered, path-based URLs; the app itself routes
 * with `HashRouter`. When the browser lands on a public path with no hash
 * yet, rewrite it to the equivalent hash route *before* React Router reads
 * it — same page, no reload, no flash of unrelated content (the prerendered
 * markup is the same page React is about to render).
 *
 * Returns `true` when it rewrote the URL (used by tests).
 */
export function restorePublicPathIntoHash(
  location: Pick<Location, 'pathname' | 'hash' | 'search'>,
  replaceState: (url: string) => void,
  base: string,
): boolean {
  if (location.hash) return false;
  const route = publicRoutePathFromLocation(location.pathname, base);
  if (!route) return false;

  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  replaceState(`${normalizedBase}#${route}${location.search}`);
  return true;
}

/**
 * Sitemap for the deployed site. URLs are always the production canonical
 * ones (origin + `SITE_BASE`) regardless of the `base` a given build ran
 * with, so the sitemap never advertises a 404 for a CI-built artifact.
 */
export function buildSitemap(paths: readonly string[]): string {
  const entries = paths
    .map((path) => `  <url><loc>${canonicalUrl(path)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function buildRobots(): string {
  return [
    '# DocForum public site — only prerendered public pages are advertised',
    '# to crawlers. Authenticated screens live behind hash routes that are',
    '# never listed here.',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${canonicalUrl('/')}sitemap.xml`,
    '',
  ].join('\n');
}
