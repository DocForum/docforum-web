import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import { render, screen } from '../test/render';

// GSAP is mocked so animation setup can be made to fail deterministically:
// the requirement issue #120 puts on the landing page is that animation is
// a progressive enhancement — content must never be left invisible.
const mock = vi.hoisted(() => {
  const state = { failTo: true };

  const applyProps = (target: unknown, props: Record<string, unknown>) => {
    const list: unknown[] = Array.isArray(target) ? target : [target];
    for (const element of list) {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) continue;
      const style = element.style;
      if (typeof props.opacity === 'number') style.setProperty('opacity', String(props.opacity));
      if (typeof props.y === 'number') style.setProperty('transform', `translate(0px, ${props.y}px)`);
      if (typeof props.scale === 'number') style.setProperty('transform', `scale(${props.scale})`);
      if (typeof props.strokeDasharray === 'number') {
        style.setProperty('stroke-dasharray', String(props.strokeDasharray));
      }
      if (typeof props.strokeDashoffset === 'number') {
        style.setProperty('stroke-dashoffset', String(props.strokeDashoffset));
      }
    }
  };

  const failingTo = (target: unknown, props: Record<string, unknown>) => {
    if (state.failTo) throw new Error('simulated gsap failure');
    applyProps(target, props);
  };

  return {
    state,
    applyProps,
    gsap: {
      context: (fn: () => unknown) => {
        fn();
        return { revert: () => {} };
      },
      matchMedia: () => ({
        add: (_query: string, fn: () => unknown) => fn(),
        revert: () => {},
      }),
      set: applyProps,
      to: failingTo,
      timeline: () => ({ to: failingTo, kill: () => {}, play: () => {}, pause: () => {} }),
    },
  };
});

vi.mock('gsap', () => ({ gsap: mock.gsap }));

describe('HomePage progressive enhancement', () => {
  beforeEach(() => {
    mock.state.failTo = true;
  });

  it('renders the landing content without JS animation succeeding', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'The hospital visit, collapsed into one thread.',
    );
    expect(screen.getByText(/A symptom becomes a booking/)).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('Settle')).toBeInTheDocument();
  });

  it('leaves hero copy visible when gsap.to fails after the reveal was primed', () => {
    const { container } = render(<HomePage />);

    const headline = container.querySelector('[data-reveal]') as HTMLElement;
    // The mock's gsap.set primed opacity: 0 before gsap.to threw — the
    // failure path must have stripped it again.
    expect(headline.style.opacity).toBe('');
    expect(headline.style.transform).toBe('');
    expect(headline).toBeVisible();
  });

  it('leaves hero copy visible even when gsap.set itself fails', () => {
    mock.gsap.set = () => {
      throw new Error('simulated gsap.set failure');
    };
    try {
      const { container } = render(<HomePage />);
      const headline = container.querySelector('[data-reveal]') as HTMLElement;
      expect(headline.style.opacity).toBe('');
      expect(headline).toBeVisible();
    } finally {
      mock.gsap.set = mock.applyProps;
    }
  });

  it('animates hero copy to fully visible when GSAP works', () => {
    mock.state.failTo = false;
    const { container } = render(<HomePage />);

    const headline = container.querySelector('[data-reveal]') as HTMLElement;
    expect(headline.style.opacity).toBe('1');
    expect(headline).toBeVisible();
  });
});
