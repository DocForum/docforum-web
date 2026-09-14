import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('is disabled and marked busy while loading', () => {
    render(<Button loading>Log in</Button>);
    const button = screen.getByRole('button', { name: /log in/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('is not disabled when not loading', () => {
    render(<Button>Log in</Button>);
    expect(screen.getByRole('button', { name: /log in/i })).not.toBeDisabled();
  });

  it('respects an explicit disabled prop independent of loading', () => {
    render(<Button disabled>Log in</Button>);
    expect(screen.getByRole('button', { name: /log in/i })).toBeDisabled();
  });
});
