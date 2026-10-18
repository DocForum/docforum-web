import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../../App';
import { AuditLogViewer } from './AuditLogViewer';
import { ApiError } from '../../../services/api-client';
import * as auditService from '../../../services/audit-service';
import { useAuthStore } from '../../../store/auth-store';
import type { AccessLog, AuditEvent, Role } from '../../../types/models';

vi.mock('../../../services/audit-service');

const BOOKED: AuditEvent = {
  id: 'evt-1',
  actorUserId: 'user-patient-1',
  actorRole: 'patient',
  entityType: 'Appointment',
  entityId: 'appt-1',
  action: 'appointment.booked',
  fromState: null,
  toState: 'booked',
  requestId: 'req-abc',
  metadata: { availabilitySlotId: 'slot-9' },
  createdAt: '2026-10-18T09:00:00.000Z',
};

const RELEASED: AuditEvent = {
  id: 'evt-2',
  actorUserId: 'user-admin-1',
  actorRole: 'admin',
  entityType: 'PaymentIntent',
  entityId: 'pi-42',
  action: 'payment_intent.released',
  fromState: 'escrowed',
  toState: 'released',
  requestId: 'req-def',
  metadata: null,
  createdAt: '2026-10-17T15:30:00.000Z',
};

const VIEWED: AccessLog = {
  id: 'log-1',
  actorUserId: 'user-doctor-7',
  actorRole: 'doctor',
  entityType: 'ConsultationNote',
  entityId: 'note-3',
  route: 'GET /consultation-notes/:appointmentId',
  createdAt: '2026-10-18T10:15:00.000Z',
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function signIn(role: Role) {
  useAuthStore.setState({
    accessToken: 'admin-token',
    user: { id: `${role}-1`, email: `${role}@docforum.org`, role, createdAt: '', updatedAt: '' },
  });
}

function renderViewer(path = '/admin/audit') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuditLogViewer />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const currentLocation = () => screen.getByTestId('location').textContent;
const lastEventsQuery = () => vi.mocked(auditService.listAuditEvents).mock.lastCall?.[0];

beforeEach(() => {
  signIn('admin');
  vi.mocked(auditService.listAuditEvents).mockReset();
  vi.mocked(auditService.listAccessLogs).mockReset();
  vi.mocked(auditService.listAuditEvents).mockResolvedValue({ items: [BOOKED, RELEASED], nextCursor: null });
  vi.mocked(auditService.listAccessLogs).mockResolvedValue({ items: [VIEWED], nextCursor: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.getState().clearSession();
});

describe('AuditLogViewer — URL-synced filters', () => {
  it('loads the newest page of state-change events by default', async () => {
    renderViewer();

    expect(await screen.findByText('appointment.booked')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'State changes' })).toHaveAttribute('aria-selected', 'true');
    expect(lastEventsQuery()).toEqual(expect.objectContaining({ cursor: null, limit: 50 }));
    expect(vi.mocked(auditService.listAuditEvents).mock.lastCall?.[1]).toBe('admin-token');
  });

  it('reads filters from the URL, fills the form, and sends them to the API', async () => {
    renderViewer('/admin/audit?entityType=PaymentIntent&entityId=pi-42&actor=user-admin-1&from=2026-10-01&to=2026-10-18');

    await screen.findByText('payment_intent.released');
    expect(lastEventsQuery()).toEqual({
      entityType: 'PaymentIntent',
      entityId: 'pi-42',
      actorUserId: 'user-admin-1',
      from: '2026-10-01',
      to: '2026-10-18',
      cursor: null,
      limit: 50,
    });
    expect(screen.getByLabelText('Entity type')).toHaveValue('PaymentIntent');
    expect(screen.getByLabelText('Entity id')).toHaveValue('pi-42');
    expect(screen.getByLabelText('Actor user id')).toHaveValue('user-admin-1');
    expect(screen.getByLabelText('From')).toHaveValue('2026-10-01');
    expect(screen.getByLabelText('To')).toHaveValue('2026-10-18');
  });

  it('writes applied filters to the URL and resets to the first page', async () => {
    const user = userEvent.setup();
    renderViewer('/admin/audit?cursor=abc123');
    await screen.findByText('appointment.booked');

    await user.type(screen.getByLabelText('Entity type'), 'Appointment');
    await user.type(screen.getByLabelText('Entity id'), 'appt-1');
    await user.type(screen.getByLabelText('Actor user id'), 'user-patient-1');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() =>
      expect(currentLocation()).toBe('/admin/audit?entityType=Appointment&entityId=appt-1&actor=user-patient-1'),
    );
    await waitFor(() =>
      expect(lastEventsQuery()).toEqual(
        expect.objectContaining({ entityType: 'Appointment', entityId: 'appt-1', actorUserId: 'user-patient-1', cursor: null }),
      ),
    );
  });

  it('blocks an entity id without an entity type instead of sending a request the API rejects', async () => {
    const user = userEvent.setup();
    renderViewer();
    await screen.findByText('appointment.booked');
    const callsBefore = vi.mocked(auditService.listAuditEvents).mock.calls.length;

    await user.type(screen.getByLabelText('Entity id'), 'appt-1');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(await screen.findByText('Choose an entity type to filter by entity id.')).toBeInTheDocument();
    expect(currentLocation()).toBe('/admin/audit');
    expect(vi.mocked(auditService.listAuditEvents).mock.calls.length).toBe(callsBefore);
  });

  it('reports and ignores invalid filters from a hand-edited link', async () => {
    renderViewer('/admin/audit?entityType=%3Cscript%3E&from=2026-13-40');

    await screen.findByText('appointment.booked');
    const notice = screen.getByText(/Some filters in this link were ignored/).closest('div')!;
    expect(within(notice).getAllByRole('listitem')).toHaveLength(2);
    expect(lastEventsQuery()).toEqual(expect.objectContaining({ entityType: undefined, from: undefined }));
  });

  it('clears filters back to an empty query string', async () => {
    const user = userEvent.setup();
    renderViewer('/admin/audit?actor=user-admin-1');
    await screen.findByText('appointment.booked');

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => expect(currentLocation()).toBe('/admin/audit'));
  });
});

describe('AuditLogViewer — cursor pagination', () => {
  it('pages older via nextCursor and back to newer, keeping the cursor in the URL', async () => {
    const user = userEvent.setup();
    vi.mocked(auditService.listAuditEvents).mockImplementation(async (query) =>
      query.cursor === 'page-2'
        ? { items: [RELEASED], nextCursor: null }
        : { items: [BOOKED], nextCursor: 'page-2' },
    );
    renderViewer('/admin/audit?actor=user-admin-1');

    await screen.findByText('appointment.booked');
    expect(screen.getByRole('button', { name: '← Newer' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Older →' }));
    await screen.findByText('payment_intent.released');
    expect(currentLocation()).toBe('/admin/audit?actor=user-admin-1&cursor=page-2');
    expect(lastEventsQuery()).toEqual(expect.objectContaining({ actorUserId: 'user-admin-1', cursor: 'page-2' }));
    expect(screen.getByText(/page 2/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Older →' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '← Newer' }));
    await screen.findByText('appointment.booked');
    expect(currentLocation()).toBe('/admin/audit?actor=user-admin-1');
  });

  it('offers a way back to the newest page from a stale cursor link', async () => {
    const user = userEvent.setup();
    vi.mocked(auditService.listAuditEvents).mockImplementation(async (query) => {
      if (query.cursor) throw new ApiError('INVALID_CURSOR', 400, { message: 'INVALID_CURSOR' });
      return { items: [BOOKED], nextCursor: null };
    });
    renderViewer('/admin/audit?cursor=expired');

    expect(await screen.findByText('This page position is no longer valid.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to newest' }));

    await screen.findByText('appointment.booked');
    expect(currentLocation()).toBe('/admin/audit');
  });
});

describe('AuditLogViewer — tabs', () => {
  it('switches to access logs, carrying entity filters over and dropping the action filter', async () => {
    const user = userEvent.setup();
    renderViewer('/admin/audit?entityType=ConsultationNote&entityId=note-3&action=booked&cursor=abc');
    await screen.findByText(/Action is matched within each loaded page/);

    await user.click(screen.getByRole('tab', { name: 'Record access' }));

    expect(await screen.findByText('GET /consultation-notes/:appointmentId')).toBeInTheDocument();
    expect(currentLocation()).toBe('/admin/audit?tab=access&entityType=ConsultationNote&entityId=note-3');
    expect(vi.mocked(auditService.listAccessLogs).mock.lastCall?.[0]).toEqual(
      expect.objectContaining({ entityType: 'ConsultationNote', entityId: 'note-3', cursor: null }),
    );
    expect(screen.queryByLabelText('Action')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Record access' })).toHaveAttribute('aria-selected', 'true');
  });

  it('supports arrow-key navigation between tabs', async () => {
    const user = userEvent.setup();
    renderViewer();
    await screen.findByText('appointment.booked');

    screen.getByRole('tab', { name: 'State changes' }).focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => expect(currentLocation()).toBe('/admin/audit?tab=access'));
    expect(screen.getByRole('tab', { name: 'Record access' })).toHaveFocus();
  });

  it("explains when docforum-core doesn't serve access logs yet", async () => {
    vi.mocked(auditService.listAccessLogs).mockRejectedValue(new ApiError('Not Found', 404));
    renderViewer('/admin/audit?tab=access');

    expect(await screen.findByRole('alert')).toHaveTextContent(/doesn't serve access logs yet/);
  });
});

describe('AuditLogViewer — rows', () => {
  it('filters actions within the loaded page and says so', async () => {
    renderViewer('/admin/audit?action=released');

    await screen.findByText('payment_intent.released');
    expect(screen.queryByText('appointment.booked')).not.toBeInTheDocument();
    expect(screen.getByText(/1 of 2 audit events on this page match the action filter/)).toBeInTheDocument();
    expect(lastEventsQuery()).not.toHaveProperty('action');
  });

  it('links entities to their record view where one exists, and offers an entity history filter', async () => {
    renderViewer();
    await screen.findByText('appointment.booked');

    expect(screen.getByRole('link', { name: 'pi-42' })).toHaveAttribute('href', '/admin?intent=pi-42');
    // Appointments have no admin-facing view, so the id is plain text.
    expect(screen.queryByRole('link', { name: 'appt-1' })).not.toBeInTheDocument();
    expect(screen.getByText('appt-1')).toBeInTheDocument();

    const historyLinks = screen.getAllByRole('link', { name: 'Entity history' });
    expect(historyLinks[0]).toHaveAttribute('href', '/admin/audit?entityType=Appointment&entityId=appt-1');
  });

  it('narrows to an actor when their id is clicked', async () => {
    const user = userEvent.setup();
    renderViewer();
    await screen.findByText('appointment.booked');

    await user.click(screen.getByRole('link', { name: 'user-admin-1' }));

    await waitFor(() => expect(currentLocation()).toBe('/admin/audit?actor=user-admin-1'));
    expect(screen.getByLabelText('Actor user id')).toHaveValue('user-admin-1');
  });

  it('shows an empty state when nothing matches', async () => {
    vi.mocked(auditService.listAuditEvents).mockResolvedValue({ items: [], nextCursor: null });
    renderViewer('/admin/audit?actor=nobody');

    expect(await screen.findByText('No audit events match these filters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export page as CSV' })).toBeDisabled();
  });

  it('exports exactly the rows on screen as CSV', async () => {
    const user = userEvent.setup();
    let exported: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      exported = blob as Blob;
      return 'blob:audit';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderViewer('/admin/audit?action=released');
    await screen.findByText('payment_intent.released');

    await user.click(screen.getByRole('button', { name: 'Export page as CSV' }));

    const text = (await exported!.text()).replace(/^﻿/, '');
    const lines = text.trim().split('\r\n');
    expect(lines[0]).toBe('createdAt,action,entityType,entityId,fromState,toState,actorUserId,actorRole,requestId,metadata,id');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('payment_intent.released,PaymentIntent,pi-42,escrowed,released');
    expect(vi.mocked(auditService.listAuditEvents)).toHaveBeenCalledTimes(1);
  });

  it('never writes audit rows to the console', async () => {
    const spies = (['log', 'info', 'debug', 'warn', 'error'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    renderViewer();
    await screen.findByText('appointment.booked');

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe('/admin/audit route', () => {
  function renderApp() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/audit']}>
          <App />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('is reachable by admins', async () => {
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Audit trail' })).toBeInTheDocument();
  });

  // RequireAuth sends them to `/`, which forwards signed-in users to their own dashboard.
  it.each<Role>(['patient', 'doctor', 'facility'])('redirects a %s away without fetching anything', async (role) => {
    signIn(role);
    renderApp();

    await waitFor(() => expect(currentLocation()).toBe(`/${role}`));
    expect(screen.queryByRole('heading', { name: 'Audit trail' })).not.toBeInTheDocument();
    expect(auditService.listAuditEvents).not.toHaveBeenCalled();
  });
});
