import { act, render } from '@testing-library/react';
import { useCallback, useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { motionDuration, useMotion } from './useMotion';

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

  it('reverts the context when setup throws, so hidden targets are shown again', async () => {
    mocks.noPreference = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setup = vi.fn(() => {
      throw new Error('Invalid motion duration token: --motion-duration-fast');
    });
    render(<MotionProbe setup={setup} />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(setup).toHaveBeenCalledOnce();
    expect(mocks.context.mock.results[0]?.value.revert).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      'Motion setup failed; showing content without animation',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});

describe('motionDuration', () => {
  const root = document.documentElement;
  const token = '--motion-duration-test' as const;

  it.each([
    ['100ms', 0.1],
    ['.1s', 0.1],
    ['.5s', 0.5],
    ['0.3s', 0.3],
    ['1.4s', 1.4],
    ['50ms', 0.05],
    ['1s', 1],
  ])('parses %s (source and minified forms) as %s seconds', (value, seconds) => {
    root.style.setProperty(token, value);
    expect(motionDuration(token)).toBeCloseTo(seconds);
  });

  it.each(['', 'fast', '1.s', '-1s', '100'])('rejects %j', (value) => {
    root.style.setProperty(token, value);
    expect(() => motionDuration(token)).toThrow('Invalid motion duration token');
  });
});
