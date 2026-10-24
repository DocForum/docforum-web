import { act, render } from '@testing-library/react';
import { useCallback, useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMotion } from './useMotion';

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  matchMedia: vi.fn(),
  noPreference: false,
}));

vi.mock('gsap', () => ({
  gsap: {
    context: mocks.context,
    matchMedia: mocks.matchMedia,
  },
}));

function MotionProbe({ setup }: { setup: Parameters<typeof useMotion<HTMLDivElement>>[1] }) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const stableSetup = useCallback(setup, [setup]);
  useMotion(scopeRef, stableSetup);
  return <div ref={scopeRef} />;
}

describe('useMotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.noPreference = false;
    mocks.context.mockImplementation((callback: () => void) => {
      callback();
      return { revert: vi.fn() };
    });
    mocks.matchMedia.mockImplementation(() => {
      let cleanup: void | (() => void);
      return {
        add: (query: string, callback: () => void | (() => void)) => {
          if (query === '(prefers-reduced-motion: no-preference)' && mocks.noPreference) {
            cleanup = callback();
          }
        },
        revert: () => cleanup?.(),
      };
    });
  });

  it('does not run setup when reduced motion is preferred', async () => {
    const setup = vi.fn();
    render(<MotionProbe setup={setup} />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(setup).not.toHaveBeenCalled();
  });

  it('reverts the scoped animation and setup cleanup on unmount', async () => {
    mocks.noPreference = true;
    const cleanup = vi.fn();
    const setup = vi.fn(() => cleanup);
    const { unmount } = render(<MotionProbe setup={setup} />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(setup).toHaveBeenCalledOnce();

    unmount();

    expect(cleanup).toHaveBeenCalledOnce();
    expect(mocks.context.mock.results[0]?.value.revert).toHaveBeenCalledOnce();
  });
});
