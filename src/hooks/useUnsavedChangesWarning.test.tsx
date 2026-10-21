import { afterEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning';
import { useUnsavedChangesStore } from '../store/unsaved-changes-store';

describe('useUnsavedChangesWarning', () => {
  afterEach(() => {
    useUnsavedChangesStore.getState().reset();
  });

  it('registers while dirty and deregisters when clean or unmounted', () => {
    const { rerender, unmount } = renderHook(({ dirty }) => useUnsavedChangesWarning(dirty), {
      initialProps: { dirty: false },
    });
    expect(useUnsavedChangesStore.getState().count).toBe(0);

    rerender({ dirty: true });
    expect(useUnsavedChangesStore.getState().count).toBe(1);

    // Re-rendering with the same value must not double-register.
    rerender({ dirty: true });
    expect(useUnsavedChangesStore.getState().count).toBe(1);

    rerender({ dirty: false });
    expect(useUnsavedChangesStore.getState().count).toBe(0);

    rerender({ dirty: true });
    unmount();
    expect(useUnsavedChangesStore.getState().count).toBe(0);
  });

  it('counts multiple dirty forms independently', () => {
    const first = renderHook(() => useUnsavedChangesWarning(true));
    const second = renderHook(() => useUnsavedChangesWarning(true));
    expect(useUnsavedChangesStore.getState().count).toBe(2);
    first.unmount();
    expect(useUnsavedChangesStore.getState().count).toBe(1);
    second.unmount();
    expect(useUnsavedChangesStore.getState().count).toBe(0);
  });
});
