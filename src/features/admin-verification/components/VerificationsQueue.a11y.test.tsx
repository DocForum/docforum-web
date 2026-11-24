import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { renderWithProviders, screen } from '../../../test/render';
import { VerificationsQueue } from './VerificationsQueue';
import { useVerificationQueue } from '../hooks/useVerifications';
import type { VerificationQueueItem } from '../../../types/models';

vi.mock('../hooks/useVerifications');

const ITEMS: VerificationQueueItem[] = [
  {
    doctorProfileId: 'doc-1',
    fullName: 'Dr. Ficticia Example',
    specialties: ['Cardiology'],
    submittedAt: '2026-10-10T09:00:00.000Z',
    documentCount: 3,
    verificationStatus: 'pending',
  },
  {
    doctorProfileId: 'doc-2',
    fullName: 'Dr. Placeholder Two',
    specialties: [],
    submittedAt: '2026-10-20T09:00:00.000Z',
    documentCount: 1,
    verificationStatus: 'pending',
  },
];

describe('VerificationsQueue accessibility (#247)', () => {
  beforeEach(() => {
    vi.mocked(useVerificationQueue).mockReturnValue({
      data: { pages: [{ items: ITEMS, nextCursor: null }] },
      error: null,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      dataUpdatedAt: Date.parse('2026-10-21T12:00:00.000Z'),
    } as never);
  });

  it('has no detectable axe violations', async () => {
    const { container } = renderWithProviders(<VerificationsQueue />, {
      route: '/admin/verifications',
      role: 'admin',
    });

    expect(
      await screen.findByRole('heading', { name: 'Doctor verification' }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('gives each review link a distinct accessible name', async () => {
    renderWithProviders(<VerificationsQueue />, { route: '/admin/verifications', role: 'admin' });

    const links = await screen.findAllByRole('link', { name: 'Review' });
    expect(links).toHaveLength(ITEMS.length);
    expect(links[0]).toHaveAttribute('href', '/admin/verifications/doc-1');
  });
});
