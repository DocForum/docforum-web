import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/render';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

const CUSTOM_MESSAGE = 'Discard your edits to the price list?';

function GuardHarness() {
  const [dirty, setDirty] = useState(true);
  useUnsavedChangesGuard(dirty);
  return (
    <div>
      <button type="button" onClick={() => setDirty(false)}>
        Mark clean
      </button>
      <a href="#/facility/team">Leave settings</a>
    </div>
  );
}

// Every navigation the guard has to tell apart, in one dirty harness, so each
// test can pick the link its case is about without restating the others.
function GuardedLinksHarness() {
  useUnsavedChangesGuard(true, CUSTOM_MESSAGE);
  return (
    <nav>
      <a href="#/facility/team">Team</a>
      <a href="#/facility/team" target="_blank">
        Team in a new tab
      </a>
      <a href="#/facility/team" target="_self">
        Team in this tab
      </a>
      <a href="/price-list.csv" download>
        Download price list
      </a>
      <a href={window.location.href}>Reload this page</a>
      <button type="button">Save draft</button>
    </nav>
  );
}

/**
 * Dispatches a click the way the browser would (bubbling, cancelable) and hands
 * the event back so a test can read `defaultPrevented`.
 */
function dispatchClick(target: EventTarget, init: MouseEventInit = {}) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function link(name: string) {
  return screen.getByRole('link', { name });
}

beforeEach(() => {
  vi.restoreAllMocks();
  // A click the guard allows really navigates the test document, and happy-dom
  // keeps that URL for the rest of the file — every later link would then look
  // like "the page you are already on" and be skipped. Start each test on the
  // hash-free URL the app loads at.
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useUnsavedChangesGuard', () => {
  it('asks for confirmation before an in-app link leaves unsaved settings', async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    const user = userEvent.setup();
    render(<GuardHarness />);

    await user.click(screen.getByRole('link', { name: /leave settings/i }));
    expect(confirm).toHaveBeenCalledWith(
      expect.stringMatching(/unsaved changes/i),
    );
  });

  it('does not prompt once the editor is clean', async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    const user = userEvent.setup();
    render(<GuardHarness />);

    await user.click(screen.getByRole('button', { name: /mark clean/i }));
    await user.click(screen.getByRole('link', { name: /leave settings/i }));
    expect(confirm).not.toHaveBeenCalled();
  });

  it('warns before a full page unload while changes are unsaved', () => {
    render(<GuardHarness />);

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('stops warning on unload once the editor is clean', async () => {
    const user = userEvent.setup();
    render(<GuardHarness />);
    await user.click(screen.getByRole('button', { name: /mark clean/i }));

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('blocks the navigation and uses the caller’s copy while changes are unsaved', () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    render(<GuardedLinksHarness />);

    const event = dispatchClick(link('Team'));

    expect(confirm).toHaveBeenCalledWith(CUSTOM_MESSAGE);
    expect(event.defaultPrevented).toBe(true);
  });

  it('lets the navigation through once the user agrees to discard', () => {
    const confirm = vi.fn(() => true);
    vi.stubGlobal('confirm', confirm);
    render(<GuardedLinksHarness />);

    const event = dispatchClick(link('Team'));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  // A modified click is the browser's own "open this elsewhere" gesture, and a
  // non-left button is usually "paste"/"close tab"; neither is a visit.
  it.each(['ctrlKey', 'metaKey', 'shiftKey', 'altKey'] as const)(
    'leaves a %s click alone',
    (modifier) => {
      const confirm = vi.fn(() => false);
      vi.stubGlobal('confirm', confirm);
      render(<GuardedLinksHarness />);

      const event = dispatchClick(link('Team'), { [modifier]: true });

      expect(confirm).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    },
  );

  it('leaves a non-left click alone', () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    render(<GuardedLinksHarness />);

    dispatchClick(link('Team'), { button: 1 });

    expect(confirm).not.toHaveBeenCalled();
  });

  it('leaves a click another handler already cancelled alone', () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    render(<GuardedLinksHarness />);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    event.preventDefault();
    link('Team').dispatchEvent(event);

    expect(confirm).not.toHaveBeenCalled();
  });

  it('ignores a click that is not on a link', () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    render(<GuardedLinksHarness />);

    dispatchClick(screen.getByRole('button', { name: /save draft/i }));

    expect(confirm).not.toHaveBeenCalled();
  });

  it('ignores a click whose target is not an element', () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    render(<GuardedLinksHarness />);

    document.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(confirm).not.toHaveBeenCalled();
  });

  it('ignores a link that opens its own tab', () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    render(<GuardedLinksHarness />);

    dispatchClick(link('Team in a new tab'));

    expect(confirm).not.toHaveBeenCalled();
  });

  it('still guards a link that targets this tab explicitly', () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    render(<GuardedLinksHarness />);

    dispatchClick(link('Team in this tab'));

    expect(confirm).toHaveBeenCalledWith(CUSTOM_MESSAGE);
  });

  it('ignores a download link', () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    render(<GuardedLinksHarness />);

    dispatchClick(link('Download price list'));

    expect(confirm).not.toHaveBeenCalled();
  });

  it('ignores a link that points at the page you are already on', () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    render(<GuardedLinksHarness />);

    const event = dispatchClick(link('Reload this page'));

    expect(confirm).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
