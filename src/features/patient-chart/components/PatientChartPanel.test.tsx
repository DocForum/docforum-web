import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { axe } from 'jest-axe';
import { renderWithProviders, screen, server } from '../../../test/render';
import { PatientChartPanel } from './PatientChartPanel';
import type { CareThread, HealthEntry, LabResult, Order } from '../../../types/models';

const PROFILE_ID = 'prf-chart-test';

const ALLERGY: HealthEntry = {
  id: 'hev-allergy-1',
  patientProfileId: PROFILE_ID,
  section: 'allergies',
  name: 'Peanuts (fake)',
  details: 'Carries an auto-injector',
  version: 1,
  updatedAt: '2026-09-01T10:00:00.000Z',
  createdAt: '2026-09-01T10:00:00.000Z',
};

const THREAD: CareThread = {
  id: PROFILE_ID,
  patientProfileId: PROFILE_ID,
  title: 'Demo cough consult (fake)',
  doctorName: 'Dr. Ficticia Example (fake)',
  specialty: 'General practice (demo)',
  startedAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z',
  status: 'active',
  steps: [
    {
      id: 'st-1',
      stepType: 'consultation',
      title: 'Consultation completed (demo)',
      description: 'Discussed a persistent cough.',
      status: 'completed',
      timestamp: '2026-10-08T10:00:00.000Z',
    },
  ],
};

const ORDER: Order = {
  id: 'ord-chart-1',
  type: 'prescription',
  status: 'active',
  token: 'tok-demo',
  items: [{ name: 'Demo Amoxicillin 500mg (fake)', note: 'Take with food' }],
  issuedAt: '2026-10-09T08:30:00.000Z',
  expiresAt: '2026-11-09T08:30:00.000Z',
  doctorName: 'Dr. Ficticia Example (fake)',
  facilityName: null,
  patientProfileId: PROFILE_ID,
  createdAt: '2026-10-09T08:30:00.000Z',
  updatedAt: '2026-10-09T08:30:00.000Z',
};

const RESULT: LabResult = {
  id: 'res-chart-1',
  testName: 'Demo full blood count (fake)',
  value: '11.2 g/dL',
  referenceRange: '12–16 g/dL',
  isAbnormal: true,
  isCritical: false,
  issuedAt: '2026-10-10T09:00:00.000Z',
};

function serveChart(overrides: { health?: Record<string, HealthEntry[]> } = {}) {
  const health = overrides.health ?? {
    allergies: [ALLERGY],
    conditions: [],
    medications: [],
  };
  server.use(
    http.get('*/patients/:profileId/health/:section', ({ params }) =>
      HttpResponse.json(health[String(params.section)] ?? []),
    ),
    http.get(`*/care-threads/${PROFILE_ID}`, () => HttpResponse.json(THREAD)),
    http.get('*/patients/:profileId/orders/active', () => HttpResponse.json([ORDER])),
    http.get('*/patients/:profileId/results/recent', () => HttpResponse.json([RESULT])),
  );
}

function renderPanel() {
  return renderWithProviders(<PatientChartPanel patientProfileId={PROFILE_ID} />, { role: 'doctor' });
}

afterEach(() => server.resetHandlers());

describe('PatientChartPanel', () => {
  it('shows a loading skeleton while the chart loads', () => {
    server.use(http.get('*/patients/:profileId/health/:section', () => new Promise<never>(() => {})));
    renderPanel();

    expect(screen.getByRole('status')).toHaveTextContent('Loading patient chart…');
  });

  it('renders the health profile, prior consultations, orders and results', async () => {
    serveChart();
    renderPanel();

    expect(await screen.findByText(/Peanuts \(fake\)/)).toBeInTheDocument();
    expect(screen.getByText('No conditions recorded.')).toBeInTheDocument();
    expect(screen.getByText('No medications recorded.')).toBeInTheDocument();

    expect(screen.getByText(/Discussed a persistent cough/)).toBeInTheDocument();
    expect(screen.getByText('Demo Amoxicillin 500mg (fake)')).toBeInTheDocument();
    expect(screen.getByText('Take with food')).toBeInTheDocument();
    expect(screen.getByText('Demo full blood count (fake)')).toBeInTheDocument();
    expect(screen.getByText('Abnormal')).toBeInTheDocument();
  });

  it('shows empty states when the patient has no records at all', async () => {
    serveChart({ health: { allergies: [], conditions: [], medications: [] } });
    server.use(
      http.get(`*/care-threads/${PROFILE_ID}`, () => HttpResponse.json({ ...THREAD, steps: [] })),
      http.get('*/patients/:profileId/orders/active', () => HttpResponse.json([])),
      http.get('*/patients/:profileId/results/recent', () => HttpResponse.json([])),
    );
    renderPanel();

    expect(await screen.findByText('No allergies recorded.')).toBeInTheDocument();
    expect(screen.getByText('No conditions recorded.')).toBeInTheDocument();
    expect(screen.getByText('No medications recorded.')).toBeInTheDocument();
    expect(screen.getByText('No prior consultations in this care thread.')).toBeInTheDocument();
    expect(screen.getByText('No active orders.')).toBeInTheDocument();
    expect(screen.getByText('No recent results.')).toBeInTheDocument();
  });

  it('shows an error state when a chart read fails', async () => {
    server.use(
      http.get('*/patients/:profileId/health/:section', () =>
        HttpResponse.json({ message: 'Upstream unavailable' }, { status: 503 }),
      ),
    );
    renderPanel();

    expect(await screen.findByText("The patient chart couldn't be loaded")).toBeInTheDocument();
  });

  it('has no axe violations with a populated chart', async () => {
    serveChart();
    const { container } = renderPanel();
    await screen.findByText(/Peanuts \(fake\)/);

    expect(await axe(container)).toHaveNoViolations();
  });
});
