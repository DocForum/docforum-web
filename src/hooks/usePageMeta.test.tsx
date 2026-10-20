import { afterEach, describe, expect, it } from 'vitest';
import { PublicPage } from '../components/PublicPage';
import { publicPageByPath } from '../pages/public-routes';
import { render, screen } from '../test/render';

const privacy = publicPageByPath('/privacy')!;
const faq = publicPageByPath('/faq')!;

describe('usePageMeta (via PublicPage)', () => {
  afterEach(() => {
    for (const selector of ['link[rel="canonical"]', 'meta[property="og:title"]']) {
      document.head.querySelectorAll(selector).forEach((el) => el.remove());
    }
  });

  it('sets title, description, canonical and Open Graph tags for the route', () => {
    render(
      <PublicPage path="/privacy">
        <p>Privacy body.</p>
      </PublicPage>,
    );

    expect(document.title).toBe(privacy.title);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      privacy.description,
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://docforum.github.io/docforum-web/privacy/',
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      privacy.title,
    );
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      'https://docforum.github.io/docforum-web/privacy/',
    );
  });

  it('updates the metadata when navigating to another public page', () => {
    const { rerender } = render(
      <PublicPage path="/privacy">
        <p>Privacy body.</p>
      </PublicPage>,
    );

    rerender(
      <PublicPage path="/faq">
        <p>FAQ body.</p>
      </PublicPage>,
    );

    expect(document.title).toBe(faq.title);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://docforum.github.io/docforum-web/faq/',
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      faq.title,
    );
  });

  it('renders the registry heading as the page h1 and the callout as a labelled landmark', () => {
    render(
      <PublicPage path="/faq">
        <p>FAQ body.</p>
      </PublicPage>,
    );
    expect(screen.getByRole('heading', { level: 1, name: faq.heading })).toBeInTheDocument();
    expect(screen.getByText('FAQ body.')).toBeInTheDocument();
  });
});
