import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { render, screen } from '../test/render';
import { FormError } from './FormError';

describe('FormError (#290)', () => {
  it('renders nothing without a message', () => {
    const { container } = render(<FormError message={null} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders nothing for an empty string', () => {
    render(<FormError message="" />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces the message as an alert', () => {
    render(<FormError message="Only facility owners can send invitations." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Only facility owners can send invitations.');
  });

  it('replaces the previous message instead of stacking alerts', () => {
    const { rerender } = render(<FormError message="First problem" />);
    rerender(<FormError message="Second problem" />);

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('Second problem');
  });

  it('has no detectable axe violations', async () => {
    const { container } = render(<FormError message="Could not save the price." />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
