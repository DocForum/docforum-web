import { describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

interface TrapProps {
  active: boolean;
  onClose: () => void;
  /** Panel with no focusable children: the trap falls back to the panel. */
  empty?: boolean;
  /** Render nothing at all, so the container ref stays null. */
  withoutPanel?: boolean;
}

function Trap({ active, onClose, empty = false, withoutPanel = false }: TrapProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active, onClose);

  if (withoutPanel) return null;

  return (
    <div ref={ref} tabIndex={-1}>
      {empty ? null : (
        <>
          <button type="button">First</button>
          <input aria-label="Middle" />
          <button type="button" disabled>
            Disabled
          </button>
          <button type="button" aria-hidden="true">
            Hidden
          </button>
          <button type="button" tabIndex={-1}>
            Negative tab index
          </button>
          <button type="button">Last</button>
        </>
      )}
    </div>
  );
}

/** The trigger lives outside the trapped subtree, so it survives its unmount. */
function Harness({ mount, showTrigger = true, ...trap }: TrapProps & { mount: boolean; showTrigger?: boolean }) {
  return (
    <>
      {showTrigger ? <button type="button">Trigger</button> : null}
      {mount ? <Trap {...trap} /> : null}
    </>
  );
}

function press(key: 'Tab' | 'Escape', shift = false) {
  const target = document.activeElement ?? document.body;
  // fireEvent returns false once a handler has called preventDefault.
  return fireEvent.keyDown(target, { key, shiftKey: shift });
}

describe('useFocusTrap', () => {
  it('moves focus to the first focusable element when it activates', () => {
    render(<Harness mount active onClose={vi.fn()} />);

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));
  });

  it('focuses the panel itself when it holds nothing focusable', () => {
    const { container } = render(<Harness mount active empty onClose={vi.fn()} />);

    expect(document.activeElement).toBe(container.querySelector('div[tabindex="-1"]'));
  });

  it('wraps Tab from the last item back to the first', () => {
    render(<Harness mount active onClose={vi.fn()} />);
    screen.getByRole('button', { name: 'Last' }).focus();

    expect(press('Tab')).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));
  });

  it('wraps Shift+Tab from the first item to the last', () => {
    render(<Harness mount active onClose={vi.fn()} />);
    screen.getByRole('button', { name: 'First' }).focus();

    expect(press('Tab', true)).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Last' }));
  });

  it('treats Shift+Tab on the panel itself as the start of the sequence', () => {
    const { container } = render(<Harness mount active onClose={vi.fn()} />);
    const panelElement = container.querySelector<HTMLElement>('div[tabindex="-1"]');
    panelElement?.focus();

    expect(press('Tab', true)).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Last' }));
  });

  it('holds focus on a panel with nothing focusable', () => {
    const { container } = render(<Harness mount active empty onClose={vi.fn()} />);
    const panelElement = container.querySelector<HTMLElement>('div[tabindex="-1"]');
    panelElement?.focus();

    expect(press('Tab')).toBe(false);
    expect(document.activeElement).toBe(panelElement);
  });

  it('does not treat disabled, aria-hidden or tabindex=-1 items as the ends of the sequence', () => {
    render(<Harness mount active onClose={vi.fn()} />);

    // Focus sits inside the panel, so a plain Tab is left to the browser:
    // the trap only intervenes at the two ends it computed.
    const hidden = screen.getByText('Hidden');
    hidden.focus();
    expect(press('Tab')).toBe(true);
    expect(document.activeElement).toBe(hidden);

    screen.getByRole('button', { name: 'Negative tab index' }).focus();
    expect(press('Tab', true)).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Negative tab index' }));

    // The real ends still wrap.
    screen.getByRole('button', { name: 'Last' }).focus();
    expect(press('Tab')).toBe(false);
  });

  it('calls onClose and swallows the Escape keystroke', () => {
    const onClose = vi.fn();
    render(<Harness mount active onClose={onClose} />);

    expect(press('Escape')).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does nothing while inactive', () => {
    const onClose = vi.fn();
    render(<Harness mount active={false} onClose={onClose} />);

    expect(document.activeElement).toBe(document.body);
    press('Escape');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stays inert when the panel is not mounted', () => {
    const onClose = vi.fn();
    render(<Harness mount active withoutPanel onClose={onClose} />);

    press('Escape');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('returns focus to what held it before activation, on deactivation', () => {
    const { rerender } = render(<Harness mount active={false} onClose={vi.fn()} />);
    screen.getByRole('button', { name: 'Trigger' }).focus();

    rerender(<Harness mount active onClose={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));

    rerender(<Harness mount active={false} onClose={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Trigger' }));
  });

  it('restores focus when the trapped subtree unmounts', () => {
    const { rerender } = render(<Harness mount active={false} onClose={vi.fn()} />);
    screen.getByRole('button', { name: 'Trigger' }).focus();

    rerender(<Harness mount active onClose={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));

    rerender(<Harness mount={false} active onClose={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Trigger' }));
  });

  it('leaves focus alone when the trigger left the document first', () => {
    const { rerender } = render(<Harness mount showTrigger active={false} onClose={vi.fn()} />);
    screen.getByRole('button', { name: 'Trigger' }).focus();

    rerender(<Harness mount showTrigger active onClose={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));

    // A screen swap can drop the trigger while the dialog is still open: the
    // trap must not try to focus a detached node.
    expect(() =>
      rerender(<Harness mount={false} showTrigger={false} active onClose={vi.fn()} />),
    ).not.toThrow();
    expect(document.activeElement).toBe(document.body);
  });

  it('stops trapping once deactivated', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Harness mount active onClose={onClose} />);

    rerender(<Harness mount active={false} onClose={onClose} />);
    press('Escape');

    expect(onClose).not.toHaveBeenCalled();
  });
});
