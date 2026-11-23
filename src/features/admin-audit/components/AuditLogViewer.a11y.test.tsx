import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { renderWithProviders, screen } from '../../../test/render';
import { makeAuditEvent } from '../../../test/factories';
import { AuditLogViewer } from './AuditLogViewer';
import { useAccessLogs, useAuditEvents } from '../hooks/useAuditLog';

vi.mock('../hooks/useAuditLog');

function query<T>(items: T[]) {
  return {
    data: { items, nextCursor: null },
    error: null,
    isLoading: false,
    isFetching: false,
    isPlaceholderData: false,
    refetch: vi.fn(),
  } as never;
}

describe('AuditLogViewer accessibility (#247)', () => {
  beforeEach(() => {
    vi.mocked(useAuditEvents).mockReturnValue(
      query([
        makeAuditEvent(),
        makeAuditEvent({ action: 'payment_intent.released', entityType: 'PaymentIntent' }),
      ]),
    );
    vi.mocked(useAccessLogs).mockReturnValue(query([]));
  });

  it('has no detectable axe violations', async () => {
    const { container } = renderWithProviders(<AuditLogViewer />, {
      route: '/admin/audit',
      role: 'admin',
    });

    expect(await screen.findByText('appointment.booked')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('exposes the tab pattern with roving focus and accessible names', async () => {
    renderWithProviders(<AuditLogViewer />, { route: '/admin/audit', role: 'admin' });

    const tabs = screen.getByRole('tablist', { name: 'Audit record type' });
    expect(tabs).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'State changes' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('State changes');

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    screen.getByRole('tab', { name: 'State changes' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Record access' })).toHaveFocus();
  });
});
