import { useEffect } from 'react';
import { useT } from '../i18n/useT';

/**
 * Sets `document.title` for the current screen (WCAG 2.4.2 Page Titled,
 * issue #237).
 *
 * Every route is titled `<page> · DocForum`. `page` comes from the route
 * metadata in `src/navigation/breadcrumbs.ts`, which only ever holds generic
 * labels ("Order details", "Care thread") — never a patient name, a
 * medication or another record detail — so a title can't leak PHI into the
 * tab strip, the window switcher or a screen reader's announcement.
 *
 * The title is built through `t`, so it also follows a language change.
 * Pass `null` for routes that own their metadata (the prerendered public
 * pages, see `usePageMeta`): nothing is written and the previous title is
 * left alone.
 */
export function useDocumentTitle(page: string | null): void {
  const t = useT();
  const title = page === null ? null : t('app.documentTitle', '{page} · DocForum', { page });

  useEffect(() => {
    if (title === null) return undefined;
    const previous = document.title;
    document.title = title;
    // Restore what this screen replaced — but never clobber a title that a
    // page which owns its own metadata has set in the meantime.
    return () => {
      if (document.title === title) document.title = previous;
    };
  }, [title]);
}
