import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ErrorBoundary } from './ErrorBoundary';

let shouldThrow = true;
let throwOnRender = true;

function Boom(): React.ReactElement {
  if (shouldThrow) {
    throw new Error('kaboom — internal detail that must not reach the UI');
  }
  return <p>Recovered content</p>;
}

function Flaky({ shouldCrash }: { shouldCrash: boolean }): React.ReactElement {
  if (shouldCrash && throwOnRender) throw new Error('section crashed');
  return <p>Section content</p>;
}

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <IntlProvider locale="en" defaultLocale="en" messages={{}} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    throwOnRender = true;
    // React reports caught render errors to console.error; expected here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('contains a crash to its own section — siblings stay mounted', () => {
    renderWithIntl(
      <div>
        <span>Header outside the boundary</span>
        <ErrorBoundary level="section">
          <Boom />
        </ErrorBoundary>
        <span>Sibling section</span>
      </div>,
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Header outside the boundary')).toBeInTheDocument();
    expect(screen.getByText('Sibling section')).toBeInTheDocument();
    expect(screen.getByText('This section could not be shown')).toBeInTheDocument();
    // Internal error text is logged, never rendered.
    expect(screen.queryByText(/kaboom/i)).not.toBeInTheDocument();
  });

  it('recovers with "try again" once the fault is gone', () => {
    renderWithIntl(
      <ErrorBoundary level="section">
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('This section could not be shown')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
  });

  it('uses page-level copy for route boundaries', () => {
    renderWithIntl(
      <ErrorBoundary level="route">
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('This page could not be shown')).toBeInTheDocument();
  });

  it('calls onReset after a retry so callers can refetch', () => {
    const onReset = vi.fn();
    throwOnRender = true;

    const { rerender } = renderWithIntl(
      <ErrorBoundary level="section" onReset={onReset}>
        <Flaky shouldCrash />
      </ErrorBoundary>,
    );

    throwOnRender = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onReset).toHaveBeenCalledTimes(1);

    rerender(
      <IntlProvider locale="en" defaultLocale="en" messages={{}} onError={() => undefined}>
        <ErrorBoundary level="section" onReset={onReset}>
          <Flaky shouldCrash={false} />
        </ErrorBoundary>
      </IntlProvider>,
    );
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });
});
