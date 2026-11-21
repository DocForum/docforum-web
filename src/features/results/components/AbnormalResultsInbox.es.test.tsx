import type { ReactElement } from 'react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/render';
import esMessages from '../../../i18n/messages/es.json';
import { useAuthStore } from '../../../store/auth-store';
import * as messagingService from '../../../services/messaging-service';
import { AbnormalResultsInbox } from './AbnormalResultsInbox';

vi.mock('../../../services/messaging-service');

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(messagingService.findThreadIdsForPatients).mockResolvedValue({
    p1: 'thread-1',
    p2: 'thread-2',
  });
});

vi.mock('../hooks/useResults', () => ({
  usePendingAbnormalResults: () => ({
    data: [
      {
        id: 'r1',
        patientProfileId: 'p1',
        patientName: 'Ada Obi',
        testName: 'ECG',
        value: 'Abnormal',
        referenceRange: 'normal',
        isCritical: true,
        isAbnormal: true,
        issuedAt: '2026-10-01T08:00:00.000Z',
      },
      {
        id: 'r2',
        patientProfileId: 'p2',
        patientName: 'Bola Ade',
        testName: 'CBC',
        value: '12.1',
        referenceRange: '12-16',
        isCritical: false,
        isAbnormal: false,
        issuedAt: '2026-10-02T08:00:00.000Z',
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useAcknowledgeAbnormalResult: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function renderEs(ui: ReactElement) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

describe('AbnormalResultsInbox in Spanish', () => {
  it('translates the heading, ICU counts, table headers and buttons', async () => {
    renderEs(<AbnormalResultsInbox />);

    expect(screen.getByRole('heading', { name: 'Resultados que requieren revisión' })).toBeInTheDocument();
    expect(screen.getByText('1 crítico, 2 totales')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Paciente' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Acción' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Confirmar' })).toHaveLength(2);
    expect(await screen.findAllByRole('button', { name: /^Escribir a / })).toHaveLength(2);
  });
});
