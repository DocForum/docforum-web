import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import esMessages from '../../../i18n/messages/es.json';
import { render, screen } from '../../../test/render';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { useCareHub } from '../hooks/useCareHub';
import { CareCardList } from './CareCardList';
import { useDependents } from '../../dependents/hooks/useDependents';
import { useHealthEntries } from '../../health-profile/hooks/useHealthEntries';
import { useMyAppointments } from '../../appointments/hooks/useAppointments';
import { useMyOrders } from '../../orders/hooks/useOrders';

vi.mock('../../dependents/hooks/useDependents');
vi.mock('../../health-profile/hooks/useHealthEntries');
vi.mock('../../appointments/hooks/useAppointments');
vi.mock('../../orders/hooks/useOrders');

function renderSpanish(ui: ReactNode) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

function HubProbe() {
  const { cards } = useCareHub(new Date('2026-10-20T12:00:00Z'));
  return <CareCardList cards={cards} />;
}

describe('care hub (es)', () => {
  it('translates card titles, details and badges produced by useCareHub', () => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    useProfileStore.setState({
      profiles: [{ id: 'pp-1', fullName: 'Self', isSelf: true }],
      selectedProfileId: 'pp-1',
    });
    vi.mocked(useDependents).mockReturnValue({
      data: [
        {
          id: 'dep-1',
          fullName: 'Lucía',
          handoverStatus: 'invited',
          claimInviteExpiresAt: '2026-01-01T00:00:00Z',
        },
      ],
      isSuccess: true,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useDependents>);
    vi.mocked(useMyAppointments).mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useMyAppointments>);
    vi.mocked(useMyOrders).mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useMyOrders>);
    vi.mocked(useHealthEntries).mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useHealthEntries>);

    renderSpanish(<HubProbe />);

    expect(screen.getByText('Reenviar la invitación de Lucía')).toBeInTheDocument();
    expect(
      screen.getByText(/invitación de traspaso caducó antes de que la aceptara/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Invitación caducada')).toBeInTheDocument();
    expect(
      screen.getByText('Añade tus alergias, afecciones y medicamentos'),
    ).toBeInTheDocument();
  });
});
