import { describe, expect, it } from 'vitest';
import { render, screen } from '../../../test/render';
import { ReferralStatusPill } from './ReferralStatusPill';
import type { ReferralStatus } from '../../../types/models';

const STATUS_LABELS: Array<{ status: ReferralStatus; label: string }> = [
  { status: 'pending', label: 'Pending' },
  { status: 'accepted', label: 'Accepted' },
  { status: 'declined', label: 'Declined' },
  { status: 'completed', label: 'Completed' },
  { status: 'expired', label: 'Expired' },
];

describe('ReferralStatusPill', () => {
  // One shared component renders status everywhere, and the label is text —
  // colour is reinforcement only, so each status must read as a word.
  STATUS_LABELS.forEach(({ status, label }) => {
    it(`renders "${label}" as text for a ${status} referral`, () => {
      render(<ReferralStatusPill status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
