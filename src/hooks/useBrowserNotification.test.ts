import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBrowserNotification } from './useBrowserNotification';

/** Stands in for the browser's Notification API, counting how many times a
 * prompt would actually have reached the user. */
class TestNotification {
  static permission: NotificationPermission = 'default';
  /** What the browser answers the next time it is asked. */
  static answer: NotificationPermission = 'granted';
  static promptCount = 0;
  static sent: TestNotification[] = [];

  constructor(
    public readonly title: string,
    public readonly options?: NotificationOptions,
  ) {
    TestNotification.sent.push(this);
  }

  static requestPermission(): Promise<NotificationPermission> {
    TestNotification.promptCount += 1;
    TestNotification.permission = TestNotification.answer;
    return Promise.resolve(TestNotification.answer);
  }
}

describe('useBrowserNotification', () => {
  beforeEach(() => {
    TestNotification.permission = 'default';
    TestNotification.answer = 'granted';
    TestNotification.promptCount = 0;
    TestNotification.sent = [];
    vi.stubGlobal('Notification', TestNotification);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('never asks just because the queue rendered', () => {
    const { result } = renderHook(() => useBrowserNotification());

    expect(result.current.permission).toBe('default');
    expect(TestNotification.promptCount).toBe(0);
  });

  it('asks once when the patient opts in, and remembers the answer', async () => {
    const { result } = renderHook(() => useBrowserNotification());

    // The permission answer arrives as a promise, and the hook stores it in
    // state — act() is what makes that update land before the assertions.
    await act(async () => {
      await result.current.requestPermission();
    });

    expect(TestNotification.promptCount).toBe(1);
    expect(result.current.canNotify).toBe(true);
    expect(result.current.canRequest).toBe(false);
  });

  it('does not ask again when the browser already answered', async () => {
    TestNotification.permission = 'granted';
    const { result } = renderHook(() => useBrowserNotification());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(TestNotification.promptCount).toBe(0);
    expect(result.current.canNotify).toBe(true);
  });

  // The constraint in #32: a refusal must not be followed by more prompts.
  it('does not ask a second time after the patient said no', async () => {
    TestNotification.answer = 'denied';
    const { result } = renderHook(() => useBrowserNotification());

    await act(async () => {
      await result.current.requestPermission();
    });
    await act(async () => {
      await result.current.requestPermission();
    });
    await act(async () => {
      await result.current.requestPermission();
    });

    expect(TestNotification.promptCount).toBe(1);
    expect(result.current.canRequest).toBe(false);
    expect(result.current.canNotify).toBe(false);
  });

  it('sends nothing while permission is not granted', () => {
    const { result } = renderHook(() => useBrowserNotification());

    result.current.notify('Only 2 ahead of you.');

    expect(TestNotification.sent).toHaveLength(0);
  });

  it('sends the body it was given once granted', () => {
    TestNotification.permission = 'granted';
    const { result } = renderHook(() => useBrowserNotification());

    result.current.notify('It is your turn now.');

    expect(TestNotification.sent[0].title).toBe('DocForum');
    expect(TestNotification.sent[0].options?.body).toBe('It is your turn now.');
  });

  it('reports an unsupported browser without offering an opt-in that cannot work', () => {
    vi.stubGlobal('Notification', undefined);
    const { result } = renderHook(() => useBrowserNotification());

    expect(result.current.permission).toBe('unsupported');
    expect(result.current.canRequest).toBe(false);
    expect(result.current.canNotify).toBe(false);
  });
});
