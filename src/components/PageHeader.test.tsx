import { describe, expect, it } from 'vitest';
import { render, screen } from '../test/render';
import { PageHeader } from './PageHeader';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

function renderHeader(props: Parameters<typeof PageHeader>[0]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PageHeader {...props} />
    </QueryClientProvider>,
  );
}

describe('PageHeader', () => {
  it('renders the title as an h1', () => {
    renderHeader({ title: 'Health profile' });
    expect(screen.getByRole('heading', { name: 'Health profile', level: 1 })).toBeInTheDocument();
  });

  it('renders a single Home breadcrumb at the root route', () => {
    renderHeader({ title: 'Dashboard' });
    const home = screen.getByText('Home');
    expect(home).toHaveAttribute('aria-current', 'page');
    expect(home.parentElement?.tagName).toBe('LI');
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    renderHeader({ title: 'Dashboard', actions: <button>Export</button> });
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('supports h2 heading override', () => {
    renderHeader({ title: 'Section title', as: 'h2' });
    expect(screen.getByRole('heading', { name: 'Section title', level: 2 })).toBeInTheDocument();
  });

  it('uses explicit breadcrumbs when provided', () => {
    renderHeader({
      title: 'Custom page',
      breadcrumbs: [
        { label: 'Home', to: '/' },
        { label: 'Custom', to: '/custom' },
      ],
    });
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByText('Custom')).toHaveAttribute('aria-current', 'page');
  });
});
