import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { render, screen } from '../test/render';
import { LiveRegion } from './LiveRegion';

describe('LiveRegion (#290)', () => {
  it('is a polite status region by default', () => {
    render(<LiveRegion message="3 invitations sent" />);

    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('3 invitations sent');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
  });

  it('becomes an assertive alert when asked for errors', () => {
    render(<LiveRegion message="Session expired" politeness="assertive" />);

    const region = screen.getByRole('alert');
    expect(region).toHaveAttribute('aria-live', 'assertive');
    expect(region).toHaveAttribute('aria-atomic', 'true');
  });

  it('stays visually hidden through the srOnly class', () => {
    render(<LiveRegion message="Saved" />);

    expect(screen.getByRole('status')).toHaveClass('srOnly');
  });

  it('keeps one mounted region and swaps its text', () => {
    const { rerender } = render(<LiveRegion message="First" />);
    const region = screen.getByRole('status');

    rerender(<LiveRegion message="Second" />);

    expect(screen.getByRole('status')).toBe(region);
    expect(screen.getByRole('status')).toHaveTextContent('Second');
    expect(screen.queryByText('First')).not.toBeInTheDocument();
  });

  it('has no detectable axe violations while polite', async () => {
    const { container } = render(<LiveRegion message="Queue updated" />);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no detectable axe violations while assertive', async () => {
    const { container } = render(<LiveRegion message="Dispense failed" politeness="assertive" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
