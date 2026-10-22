import type { ReactNode } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { publicPageByPath } from '../pages/public-routes';
import styles from './PublicPage.module.css';

interface PublicPageProps {
  /** Public route path as registered in `src/pages/public-routes.ts`. */
  path: string;
  children: ReactNode;
}

/**
 * Shell for the prerendered public pages: one semantic `<article>` with
 * the route's `<h1>` and the page metadata (title, description, canonical,
 * Open Graph) kept in sync while the SPA navigates. Child content is plain
 * prose — `styles.body` styles it, so every public page reads the same.
 */
export function PublicPage({ path, children }: PublicPageProps) {
  const def = publicPageByPath(path);
  if (!def) {
    throw new Error(`Unknown public page path: ${path}`);
  }

  usePageMeta(def);

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <p className={styles.brand}>DocForum</p>
        <h1 className={styles.heading}>{def.heading}</h1>
      </header>
      <div className={styles.body}>{children}</div>
    </article>
  );
}

interface PublicCalloutProps {
  tone?: 'info' | 'notice';
  title: string;
  children: ReactNode;
}

/**
 * A labelled aside used for the things a public page must not bury: the
 * privacy draft's legal-review status, preview limitations, and similar
 * caveats. Rendered as an `<aside>` so it is announced as a landmark with
 * an accessible name rather than being mistaken for body copy.
 */
export function PublicCallout({ tone = 'info', title, children }: PublicCalloutProps) {
  return (
    <aside className={styles.callout} data-tone={tone} aria-label={title}>
      <p className={styles.calloutTitle}>{title}</p>
      <div>{children}</div>
    </aside>
  );
}
