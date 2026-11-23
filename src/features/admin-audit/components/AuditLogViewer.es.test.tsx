import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/render';
import { makeAuditEvent } from '../../../test/factories';
import { AuditLogViewer } from './AuditLogViewer';
import { useAccessLogs, useAuditEvents } from '../hooks/useAuditLog';

vi.mock('../hooks/useAuditLog');

const EVENTS = {
  data: { items: [makeAuditEvent()], nextCursor: null },
  error: null,
  isLoading: false,
  isFetching: false,
  isPlaceholderData: false,
  refetch: vi.fn(),
};

const ACCESS = {
  data: { items: [], nextCursor: null },
  error: null,
  isLoading: false,
  isFetching: false,
  isPlaceholderData: false,
  refetch: vi.fn(),
};

describe('AuditLogViewer in Spanish (#248)', () => {
  beforeEach(() => {
    vi.mocked(useAuditEvents).mockReturnValue(EVENTS as never);
    vi.mocked(useAccessLogs).mockReturnValue(ACCESS as never);
  });

  it('renders the console chrome, tabs and subtitle from the Spanish catalogue', () => {
    renderWithProviders(<AuditLogViewer />, {
      locale: 'es',
      route: '/admin/audit',
    });

    expect(screen.getByRole('heading', { name: 'Registro de auditoría' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cambios de estado' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Acceso a registros' })).toBeInTheDocument();
    expect(
      screen.getByText(/Vista de solo lectura de los registros de auditoría de solo anexado de docforum-core/),
    ).toBeInTheDocument();
  });

  it('translates filter labels while keeping API action tokens untranslated', () => {
    renderWithProviders(<AuditLogViewer />, {
      locale: 'es',
      route: '/admin/audit',
    });

    expect(screen.getByText('appointment.booked')).toBeInTheDocument();
    expect(screen.queryByText('State changes')).not.toBeInTheDocument();
  });
});
