/**
 * Pure HTML assembly for the prerendered public pages (issue #120):
 * `<head>` metadata, swapping the app's loading shell for rendered markup,
 * and turning router links into real, crawlable paths (or into hash links
 * that boot the SPA) so the static output works without client JS.
 *
 * Everything here is string-in/string-out and unit-tested against the real
 * `index.html` template; `scripts/prerender.mjs` only does file I/O.
 */
import {
  PUBLIC_PAGES,
  canonicalUrl,
  metaTagsFor,
  type MetaTag,
  type PublicPageDef,
} from '../pages/public-routes';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderMetaTag(tag: MetaTag): string {
  if (tag.attribute === 'rel') {
    return `<link rel="${escapeHtml(tag.key)}" href="${escapeHtml(tag.href ?? '')}" />`;
  }
  return `<meta ${tag.attribute}="${escapeHtml(tag.key)}" content="${escapeHtml(tag.content ?? '')}" />`;
}

/** Swap the template's generic `<title>` and inject this route's metadata. */
export function applyHeadMeta(template: string, def: PublicPageDef): string {
  const titleTag = `<title>${escapeHtml(def.title)}</title>`;
  let html = template.replace(/<title>[^<]*<\/title>/, titleTag);
  if (!html.includes(titleTag)) {
    throw new Error(`Template has no <title> element to replace (page ${def.path})`);
  }

  const tags = metaTagsFor(def)
    .map((tag) => `    ${renderMetaTag(tag)}`)
    .join('\n');
  if (!html.includes('</head>')) {
    throw new Error(`Template has no </head> to inject metadata into (page ${def.path})`);
  }
  return html.replace('</head>', `${tags}\n  </head>`);
}

/**
 * Router links render as root-absolute paths under the prerender entry's
 * MemoryRouter. Make them survive a static file host *and* a crawler:
 * public pages become real paths (navigable with no JS at all), everything
 * else becomes a hash route under the site base so clicking it boots the
 * SPA instead of 404ing.
 *
 * Rewrites only `href="..."` — `src`, stylesheet and script URLs are left
 * to the template.
 */
export function rewriteInternalLinks(appHtml: string, base: string): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const publicPathSet = new Set(PUBLIC_PAGES.map((page) => page.path));

  return appHtml.replace(/href="(\/[^"]*)"/g, (_match, rawPath: string) => {
    const [pathOnly, query = ''] = rawPath.split('?');
    const querySuffix = query ? `?${query}` : '';

    // Asset URLs (…/index.css, /favicon.svg) are files, not routes — only
    // route-shaped paths are rewritten.
    if (/\.[a-z0-9]+$/i.test(pathOnly)) return _match;

    if (publicPathSet.has(pathOnly)) {
      const trimmed = pathOnly === '/' ? '' : pathOnly.replace(/^\/+/, '').replace(/\/+$/, '');
      return `href="${normalizedBase}${trimmed ? `${trimmed}/` : ''}${querySuffix}"`;
    }

    return `href="${normalizedBase}#${pathOnly}${querySuffix}"`;
  });
}

/** Replace the loading shell inside `#root` with the rendered page. */
export function injectAppHtml(template: string, appHtml: string): string {
  const openTag = '<div id="root">';
  const start = template.indexOf(openTag);
  const end = template.lastIndexOf('</div>');
  const bodyEnd = template.indexOf('</body>');

  if (start === -1) {
    throw new Error('Template has no <div id="root"> to prerender into');
  }
  if (end === -1 || end < start) {
    throw new Error('Template has no closing </div> for #root');
  }
  if (bodyEnd === -1 || end > bodyEnd) {
    throw new Error('#root does not close before </body> — refusing to splice');
  }

  return `${template.slice(0, start + openTag.length)}\n      ${appHtml}\n    ${template.slice(end)}`;
}

export interface PrerenderPageInput {
  template: string;
  appHtml: string;
  def: PublicPageDef;
  base: string;
}

export function prerenderPage({ template, appHtml, def, base }: PrerenderPageInput): string {
  return injectAppHtml(applyHeadMeta(template, def), rewriteInternalLinks(appHtml, base));
}

/**
 * Extract the markup inside `<div id="root">…</div>` by counting nested
 * divs — the closing tag is not necessarily the last `</div>` before
 * `</body>` (the source template keeps the module script in the body).
 */
export function extractRootContent(html: string): string | null {
  const openTag = '<div id="root">';
  const start = html.indexOf(openTag);
  if (start === -1) return null;

  const contentStart = start + openTag.length;
  const tagPattern = /<div\b|<\/div>/gi;
  tagPattern.lastIndex = contentStart;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(html)) !== null) {
    depth += match[0].toLowerCase() === '</div>' ? -1 : 1;
    if (depth === 0) return html.slice(contentStart, match.index);
  }
  return html.slice(contentStart);
}

/** Problems found in generated HTML; an empty array means the page is good. */
export function validatePrerenderedHtml(html: string, def: PublicPageDef): string[] {
  const problems: string[] = [];
  const tags = metaTagsFor(def);
  const titleTag = `<title>${escapeHtml(def.title)}</title>`;
  if (!html.includes(titleTag)) problems.push(`missing or wrong <title> (want ${def.title})`);

  const description = tags.find((tag) => tag.key === 'description');
  if (!description || !html.includes(renderMetaTag(description))) {
    problems.push('missing meta description');
  }

  const canonical = tags.find((tag) => tag.key === 'canonical');
  if (!canonical || !html.includes(renderMetaTag(canonical))) {
    problems.push('missing canonical link');
  }

  if (!html.includes(`property="og:url" content="${escapeHtml(canonicalUrl(def.path))}"`)) {
    problems.push('missing og:url');
  }

  const rootContent = extractRootContent(html);
  if (rootContent === null) {
    problems.push('no <div id="root"> container in output');
  } else if (!rootContent.trim()) {
    problems.push('#root is empty — page content is not in the HTML');
  } else {
    if (!rootContent.includes('<h1')) problems.push('no <h1> in prerendered content');
    if (!rootContent.includes(escapeHtml(def.heading))) {
      problems.push(`heading text not found (want "${def.heading}")`);
    }
    if (rootContent.includes('<div id="app-loading"')) {
      problems.push('loading shell still present — prerender did not replace it');
    }
    // Public-route isolation: prerendering must never run the signed-in
    // branch of the layout (issue #120: "no authenticated code paths").
    if (rootContent.includes('Log out')) {
      problems.push('authenticated UI leaked into a public page');
    }
  }

  return problems;
}
