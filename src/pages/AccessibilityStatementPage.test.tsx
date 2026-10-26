import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { render, screen } from '../test/render';
import { AccessibilityStatementPage } from './AccessibilityStatementPage';

describe('AccessibilityStatementPage (#89)', () => {
  it('has no detectable axe violations', async () => {
    const { container } = render(<AccessibilityStatementPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('states conformance honestly and links to the feedback channel', () => {
    render(<AccessibilityStatementPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /accessibility statement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/partially conformant/i)).toBeInTheDocument();
    expect(screen.getByText(/manual NVDA and VoiceOver pass/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open an accessibility issue/i })).toBeInTheDocument();
    const reviewed = screen.getByText('2026-10-18');
    expect(reviewed.tagName).toBe('TIME');
    expect(reviewed).toHaveAttribute('datetime', '2026-10-18');
  });
});
