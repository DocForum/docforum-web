import { describe, expect, it } from 'vitest';
import { render, screen } from '../../../test/render';
import { SnapshotContextViewer } from './SnapshotContextViewer';
import type { ReferralDetail, ReferralStatus } from '../../../types/models';

const SNAPSHOT_TAKEN_AT = '2026-09-30T08:15:00.000Z';
const INTAKE_SUBMITTED_AT = '2026-09-28T17:40:00.000Z';
const SNAPSHOT_NOTES = 'Referred for palpitations \u2014 \u201curgent\u201d. ECG readings attached.';
const FREE_TEXT_NOTES = 'Feels worse at night, still can\u2019t sleep.';

function humanDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function makeDetail(status: ReferralStatus): ReferralDetail {
  return {
    id: `ref-${status}`,
    status,
    snapshotNotes: SNAPSHOT_NOTES,
    referringDoctor: { id: 'doc-1', fullName: 'Dr. Amara Okafor' },
    targetSpecialty: { id: 'sp-1', name: 'Cardiology', slug: 'cardiology' },
    snapshotTakenAt: SNAPSHOT_TAKEN_AT,
    createdAt: SNAPSHOT_TAKEN_AT,
    updatedAt: '2026-10-02T10:00:00.000Z',
    intakeSnapshot: {
      id: 'intake-1',
      symptoms: ['Palpitations', 'Shortness of breath', 'Insomnia'],
      freeTextNotes: FREE_TEXT_NOTES,
      submittedAt: INTAKE_SUBMITTED_AT,
    },
  };
}

describe('SnapshotContextViewer', () => {
  it('labels the snapshot with a human-readable date for every referral status', () => {
    const statuses: ReferralStatus[] = ['pending', 'accepted', 'declined', 'completed', 'expired'];
    const { container } = render(
      <div>
        {statuses.map((status) => (
          <SnapshotContextViewer key={status} referral={makeDetail(status)} />
        ))}
      </div>,
    );

    const stamps = container.querySelectorAll('strong');
    expect(stamps).toHaveLength(statuses.length);
    stamps.forEach((stamp) => {
      expect(stamp.textContent).toBe(`Snapshot taken ${humanDate(SNAPSHOT_TAKEN_AT)}`);
    });
  });

  it('names the referring doctor and shows the frozen notes verbatim, not paraphrased', () => {
    render(<SnapshotContextViewer referral={makeDetail('pending')} />);

    expect(screen.getByText('Referring doctor')).toBeInTheDocument();
    expect(screen.getByText('Dr. Amara Okafor')).toBeInTheDocument();
    expect(screen.getByText(SNAPSHOT_NOTES)).toBeInTheDocument();
    expect(screen.getByText(FREE_TEXT_NOTES)).toBeInTheDocument();
  });

  it('lists the snapshot intake symptoms and ties each date to a machine-readable <time>', () => {
    const { container } = render(<SnapshotContextViewer referral={makeDetail('accepted')} />);

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Palpitations',
      'Shortness of breath',
      'Insomnia',
    ]);
    expect(container.querySelector(`time[datetime="${SNAPSHOT_TAKEN_AT}"]`)).not.toBeNull();
    expect(container.querySelector(`time[datetime="${INTAKE_SUBMITTED_AT}"]`)).not.toBeNull();
  });
});
