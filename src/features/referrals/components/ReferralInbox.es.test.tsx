import type { ReactElement } from 'react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/render';
import esMessages from '../../../i18n/messages/es.json';
import { ReferralInbox } from './ReferralInbox';
import { useAuthStore } from '../../../store/auth-store';
import * as referralsService from '../../../services/referrals-service';
import type { CursorPage, ReferralSummary } from '../../../types/models';

vi.mock('../../../services/referrals-service');

const REFERRAL: ReferralSummary = {
  id: 'ref-1',
  status: 'pending',
  snapshotNotes: 'Notes for ref-1',
  referringDoctor: { id: 'doc-1', fullName: 'Dr. Amara Okafor' },
  snapshotTakenAt: '2026-09-30T08:15:00.000Z',
  createdAt: '2026-09-30T08:15:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
};

function renderEs(ui: ReactElement) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

describe('ReferralInbox in Spanish', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(referralsService.listReferrals).mockReset();
  });

  it('translates the heading, tabs, status pill and action copy', async () => {
    const page: CursorPage<ReferralSummary> = { items: [REFERRAL], nextCursor: null };
    vi.mocked(referralsService.listReferrals).mockResolvedValue(page);

    renderEs(<ReferralInbox />);

    expect(screen.getByRole('heading', { name: 'Derivaciones' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pendiente' })).toBeInTheDocument();
    expect(await screen.findByText('Instantánea tomada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Responder a la derivación' })).toHaveAttribute(
      'href',
      '/doctor/referrals/ref-1',
    );
    expect(screen.getAllByText('Pendiente')).toHaveLength(2);
  });
});
