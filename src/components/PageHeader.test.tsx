import { describe, expect, it } from 'vitest';
import { render, screen, within } from '../test/render';
import { PageHeader } from './PageHeader';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

function renderHeader(props: Parameters<typeof PageHeader>[0], route = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PageHeader {...props} />
    </QueryClientProvider>,
    { route },
  );
}

function currentCrumb(label: string) {
  const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
  return within(nav).getByText(label);
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

  it('never links a consultation route intermediate that has no route', () => {
    renderHeader({ title: 'Consultation note' }, '/doctor/consultation/apt-1');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Doctor dashboard' })).toHaveAttribute('href', '/doctor');
    expect(screen.queryByRole('link', { name: /consultation/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Apt 1')).not.toBeInTheDocument();
    expect(currentCrumb('Consultation note')).toHaveAttribute('aria-current', 'page');
  });

  it('links a care thread to the care hub, not /care/threads', () => {
    renderHeader({ title: 'Care thread' }, '/care/threads/x');

    expect(screen.getByRole('link', { name: 'Care journey' })).toHaveAttribute('href', '/care');
    expect(screen.queryByRole('link', { name: 'Care thread' })).not.toBeInTheDocument();
    expect(screen.queryByText('Threads')).not.toBeInTheDocument();
    expect(currentCrumb('Care thread')).toHaveAttribute('aria-current', 'page');
  });

  it('labels a patient chart crumb without rendering the profile id', () => {
    renderHeader({ title: 'Patient chart' }, '/doctor/patient-chart/p1');

    expect(screen.getByRole('link', { name: 'Doctor dashboard' })).toHaveAttribute('href', '/doctor');
    expect(currentCrumb('Patient chart')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('P1')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /patient chart/i })).not.toBeInTheDocument();
  });

  it('renders a role dashboard as Home → current page', () => {
    renderHeader({ title: 'Patient dashboard' }, '/patient');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(currentCrumb('Patient dashboard')).toHaveAttribute('aria-current', 'page');
  });

  it('falls back to Home and the title for an unregistered path, with no invented links', () => {
    renderHeader({ title: 'Unknown page' }, '/doctor/unknown/xyz');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(currentCrumb('Unknown page')).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});
