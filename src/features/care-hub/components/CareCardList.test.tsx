import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { render, screen } from '../../../test/render';
import { CareCardList } from './CareCardList';
import type { CareCard } from '../ranking';

const CARD: CareCard = {
  id: 'confirm-order-ord-1',
  section: 'action',
  priority: 20,
  title: 'Confirm receipt of Demo Amoxicillin (fake)',
  detail: 'Your order was fulfilled. Please confirm you received it or report a problem.',
  to: '/patient/orders/ord-1',
  badge: 'Action needed',
};

describe('CareCardList', () => {
  it('renders each care card as a link with its badge and detail', () => {
    render(<CareCardList cards={[CARD]} />);

    const link = screen.getByRole('link', { name: /Confirm receipt of Demo Amoxicillin/ });
    expect(link).toHaveAttribute('href', '/patient/orders/ord-1');
    expect(link).toHaveTextContent('Your order was fulfilled. Please confirm you received it or report a problem.');
    expect(link).toHaveTextContent('Action needed');
  });

  it('omits the badge when the card has none', () => {
    const { badge: _badge, ...withoutBadge } = CARD;
    render(<CareCardList cards={[withoutBadge as CareCard]} />);

    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(screen.queryByText('Action needed')).not.toBeInTheDocument();
  });

  it('renders an empty list when there are no cards', () => {
    render(<CareCardList cards={[]} />);

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('has no axe violations', async () => {
    const { container } = render(<CareCardList cards={[CARD]} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
