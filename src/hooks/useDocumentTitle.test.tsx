import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { render, cleanup } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import esMessages from '../i18n/messages/es.json';
import { useDocumentTitle } from './useDocumentTitle';

function Titled({ page }: { page: string | null }) {
  useDocumentTitle(page);
  return <h1>{page ?? 'public page'}</h1>;
}

function withIntl(children: ReactNode, locale = 'en', messages: Record<string, string> = {}) {
  return (
    <IntlProvider locale={locale} defaultLocale="en" messages={messages} onError={() => undefined}>
      {children}
    </IntlProvider>
  );
}

describe('useDocumentTitle', () => {
  afterEach(() => {
    cleanup();
    document.title = 'DocForum';
  });

  it('titles the screen with the page label and the site name', () => {
    render(withIntl(<Titled page="Orders" />));

    expect(document.title).toBe('Orders · DocForum');
  });

  it('updates the title when the page label changes', () => {
    const { rerender } = render(withIntl(<Titled page="Orders" />));
    expect(document.title).toBe('Orders · DocForum');

    rerender(withIntl(<Titled page="Order details" />));

    expect(document.title).toBe('Order details · DocForum');
  });

  it('follows the current language, not the language at mount', () => {
    const { rerender } = render(withIntl(<Titled page="Orders" />));
    expect(document.title).toBe('Orders · DocForum');

    // The app re-renders every translator on a language change, so the hook
    // must read the new catalogue: same page, translated title.
    rerender(
      withIntl(<Titled page="Pedidos" />, 'es', esMessages),
    );

    expect(document.title).toBe('Pedidos · DocForum');
  });

  it('restores the previous title when the screen unmounts', () => {
    document.title = 'DocForum — before';
    const { unmount } = render(withIntl(<Titled page="Payments" />));
    expect(document.title).toBe('Payments · DocForum');

    unmount();

    expect(document.title).toBe('DocForum — before');
  });

  it('leaves the title alone for pages that own their metadata', () => {
    document.title = 'Privacy — DocForum';
    const { rerender } = render(withIntl(<Titled page={null} />));

    expect(document.title).toBe('Privacy — DocForum');

    rerender(withIntl(<Titled page={null} />));
    expect(document.title).toBe('Privacy — DocForum');
  });
});
