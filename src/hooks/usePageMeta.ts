import { useEffect } from 'react';
import { metaTagsFor, type PublicPageDef } from '../pages/public-routes';

function upsertMetaTag(tag: { attribute: 'name' | 'property' | 'rel'; key: string; content?: string; href?: string }) {
  const selector =
    tag.attribute === 'rel'
      ? `link[rel="${tag.key}"]`
      : `meta[${tag.attribute}="${tag.key}"]`;

  let element = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!element) {
    element =
      tag.attribute === 'rel'
        ? document.head.appendChild(document.createElement('link'))
        : document.head.appendChild(document.createElement('meta'));
    if (tag.attribute === 'rel') {
      (element as HTMLLinkElement).rel = tag.key;
    } else {
      (element as HTMLMetaElement).setAttribute(tag.attribute, tag.key);
    }
  }

  if (tag.href !== undefined) {
    (element as HTMLLinkElement).href = tag.href;
  } else if (tag.content !== undefined) {
    (element as HTMLMetaElement).content = tag.content;
  }
}

/**
 * Keeps `document.title`, the meta description, the canonical link and the
 * Open Graph/Twitter tags in step with the current public page while the
 * SPA navigates, so client-side navigation leaves the same metadata the
 * prerendered HTML for that route already carries.
 */
export function usePageMeta(def: PublicPageDef): void {
  useEffect(() => {
    document.title = def.title;
    for (const tag of metaTagsFor(def)) {
      upsertMetaTag(tag);
    }
  }, [def]);
}
