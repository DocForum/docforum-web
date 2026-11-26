import { describe, expect, it } from 'vitest';
import { render, screen } from '../../../test/render';
import {
  VerificationChecklist,
  checklistSummary,
  deriveChecklistItems,
  latestCredentialByType,
  type ChecklistItemState,
} from './VerificationChecklist';
import { REQUIRED_CREDENTIALS } from '../requirements';
import type { ClaimItemStatus, CredentialType, DoctorCredential, DoctorSpecialtyClaim } from '../../../types/models';

function credential(
  type: CredentialType,
  status: ClaimItemStatus,
  overrides: Partial<DoctorCredential> = {},
): DoctorCredential {
  return {
    id: `dc-${type}-${status}`,
    doctorProfileId: 'dp-1',
    type,
    fileName: `${type}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    status,
    rejectionReason: null,
    submittedAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-05T00:00:00Z',
    ...overrides,
  };
}

const ALL_PENDING: DoctorCredential[] = REQUIRED_CREDENTIALS.map((requirement) =>
  credential(requirement.type, 'pending'),
);

/** Table-driven over every per-item state the backend reports, plus the one
 * state that has no backend row at all. */
const ITEM_STATES: {
  label: string;
  credentials: DoctorCredential[];
  state: ChecklistItemState;
  text: string;
  reason?: RegExp;
}[] = [
  {
    label: 'nothing submitted',
    credentials: [],
    state: 'not_submitted',
    text: 'Not submitted yet',
  },
  {
    label: 'pending',
    credentials: [credential('medical_license', 'pending')],
    state: 'pending',
    text: 'Pending review',
  },
  {
    label: 'verified',
    credentials: [credential('medical_license', 'verified')],
    state: 'verified',
    text: 'Verified',
  },
  {
    label: 'rejected with a reason',
    credentials: [credential('medical_license', 'rejected', { rejectionReason: 'The seal is cut off.' })],
    state: 'rejected',
    text: 'Rejected',
    reason: /the seal is cut off/i,
  },
  {
    label: 'rejected without a reason',
    credentials: [credential('medical_license', 'rejected', { rejectionReason: null })],
    state: 'rejected',
    text: 'Rejected',
    reason: /no reason was recorded/i,
  },
];

describe('deriveChecklistItems', () => {
  it.each(ITEM_STATES)('derives the $label document state', ({ credentials, state }) => {
    const item = deriveChecklistItems(credentials).find((candidate) => candidate.key === 'credential:medical_license');

    expect(item?.state).toBe(state);
  });

  it('lists one row per required document, in policy order', () => {
    const items = deriveChecklistItems(ALL_PENDING);
    expect(items).toHaveLength(REQUIRED_CREDENTIALS.length);
    expect(items.map((item) => item.label)).toEqual(REQUIRED_CREDENTIALS.map((requirement) => requirement.label));
  });

  it('adds a row per claimed specialty with its own status', () => {
    const claims: DoctorSpecialtyClaim[] = [
      {
        id: 'sc-1',
        doctorProfileId: 'dp-1',
        specialtyId: 'sp-1',
        specialty: { id: 'sp-1', name: 'Cardiology', slug: 'cardiology' },
        status: 'rejected',
        rejectionReason: 'Certificate does not cover this specialty.',
        submittedAt: '2026-01-05T00:00:00Z',
        updatedAt: '2026-01-05T00:00:00Z',
      },
    ];

    const items = deriveChecklistItems(ALL_PENDING, claims);
    const claimItem = items.find((item) => item.key === 'claim:sc-1');

    expect(items).toHaveLength(REQUIRED_CREDENTIALS.length + 1);
    expect(claimItem?.label).toBe('Specialty claim: Cardiology');
    expect(claimItem?.state).toBe('rejected');
    expect(claimItem?.reason).toMatch(/certificate does not cover/i);
  });

  it('reads the newest submission per type, not the first one', () => {
    const latest = latestCredentialByType([
      credential('medical_license', 'rejected', { updatedAt: '2026-01-01T00:00:00Z' }),
      credential('medical_license', 'verified', { updatedAt: '2026-02-01T00:00:00Z' }),
    ]);

    expect(latest.get('medical_license')?.status).toBe('verified');
    expect(deriveChecklistItems([credential('medical_license', 'verified', { updatedAt: '2026-02-01T00:00:00Z' })])[0]?.state).toBe(
      'verified',
    );
  });
});

describe('checklistSummary', () => {
  it('counts only verified items toward progress', () => {
    const items = deriveChecklistItems([
      credential('medical_license', 'verified'),
      credential('degree_certificate', 'pending'),
      credential('specialty_certificate', 'rejected'),
    ]);
    const summary = checklistSummary(items);

    expect(summary.total).toBe(REQUIRED_CREDENTIALS.length);
    expect(summary.verified).toBe(1);
    expect(summary.pending).toBe(1);
    expect(summary.rejected).toBe(1);
    expect(summary.notSubmitted).toBe(1);
    expect(summary.percent).toBe(25);
  });

  it('is 100 percent only when every row is verified', () => {
    const items = deriveChecklistItems(REQUIRED_CREDENTIALS.map((requirement) => credential(requirement.type, 'verified')));
    expect(checklistSummary(items).percent).toBe(100);
  });

  it('reports zero for an empty checklist rather than dividing by nothing', () => {
    expect(checklistSummary([]).percent).toBe(0);
  });
});

describe('VerificationChecklist', () => {
  it('renders the overall progress bar with an accessible value', () => {
    render(<VerificationChecklist credentials={[credential('medical_license', 'verified'), ...REQUIRED_CREDENTIALS.slice(1).map((r) => credential(r.type, 'pending'))]} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '25');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByText(/25% complete — 1 of 4 items verified/i)).toBeInTheDocument();
  });

  it.each(ITEM_STATES)('shows the $label row with its status as text', ({ credentials, text, reason }) => {
    render(<VerificationChecklist credentials={credentials} />);

    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    if (reason) expect(screen.getByText(reason)).toBeInTheDocument();
  });

  it('states plainly that the requirement list is review policy', () => {
    render(<VerificationChecklist credentials={[]} />);
    expect(screen.getByText(/current review policy/i)).toBeInTheDocument();
  });
});
