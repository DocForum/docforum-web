import { describe, expect, it } from 'vitest';
import { render, screen } from '../../../test/render';
import { VerificationStatusBanner } from './VerificationStatusBanner';
import type { VerificationStatus } from '../../../types/models';

/** Table-driven over every state `GET /doctors/me` can report, plus the two
 * shapes a rejection can arrive in (with and without a reason string). */
const PROFILE_STATES: {
  status: VerificationStatus;
  expectedLabel: string;
  expectedHeadline: RegExp;
}[] = [
  { status: 'pending', expectedLabel: 'Application pending', expectedHeadline: /application is with a reviewer/i },
  { status: 'verified', expectedLabel: 'Doctor verified', expectedHeadline: /doctor account is verified/i },
  { status: 'rejected', expectedLabel: 'Application rejected', expectedHeadline: /was not approved/i },
];

describe('VerificationStatusBanner', () => {
  it.each(PROFILE_STATES)('renders the profile-level $status state', ({ status, expectedLabel, expectedHeadline }) => {
    const { container } = render(<VerificationStatusBanner status={status} />);

    // The state is spelled out in text, and the colour band is only an
    // attribute on the wrapper — never the only signal.
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    expect(screen.getByRole(status === 'rejected' ? 'alert' : 'status')).toBeInTheDocument();
    expect(screen.getByRole(status === 'rejected' ? 'alert' : 'status')).toHaveTextContent(expectedHeadline);
    expect(container.querySelector(`[data-status="${status}"]`)).not.toBeNull();
  });

  it('shows a profile-level rejection reason when there is one', () => {
    render(
      <VerificationStatusBanner
        status="rejected"
        rejectionReason="Two documents do not match the name on your account."
      />,
    );

    expect(screen.getByText(/two documents do not match the name/i)).toBeInTheDocument();
    expect(screen.getByText(/reason:/i)).toBeInTheDocument();
  });

  it('still gives next steps when the rejection has no reason', () => {
    render(<VerificationStatusBanner status="rejected" rejectionReason={null} />);

    expect(screen.getByText(/no reason was recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/resubmit them/i)).toBeInTheDocument();
  });

  it('does not show a reason line for pending or verified applications', () => {
    const { rerender } = render(<VerificationStatusBanner status="pending" rejectionReason="should not appear" />);
    expect(screen.queryByText(/reason:/i)).toBeNull();

    rerender(<VerificationStatusBanner status="verified" rejectionReason="should not appear" />);
    expect(screen.queryByText(/reason:/i)).toBeNull();
  });

  it('greets the doctor by name when the profile carries one', () => {
    render(<VerificationStatusBanner status="verified" fullName="Dr. Amara Okafor" />);

    expect(screen.getByRole('status')).toHaveTextContent('Dr. Amara Okafor');
  });
});
