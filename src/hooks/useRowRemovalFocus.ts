import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** The first thing a keyboard user can act on inside a row. */
const DEFAULT_CONTROL_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Attribute that identifies a row; one per rendered item, in visual order. */
export const ROW_ID_ATTRIBUTE = 'data-row-id';

export interface RowRemovalFocusOptions {
  /** Element holding one row per id, in visual order (a `<tbody>` or a list). */
  containerRef: RefObject<HTMLElement | null>;
  /** Where focus goes when the list becomes empty — usually the list heading. */
  fallbackRef: RefObject<HTMLElement | null>;
  /** Attribute identifying a row. Defaults to `data-row-id`. */
  rowAttribute?: string;
  /** Primary control inside a row. Defaults to its first enabled control. */
  controlSelector?: string;
}

export interface RowRemovalFocus {
  /** Call with the row's id immediately before the removal is sent. */
  rememberRemovedRow: (id: string) => void;
  /** Drop the pending request, for a removal that failed without a rollback. */
  forgetRemovedRow: () => void;
}

/**
 * Keeps focus in the list when a row is removed (WCAG 2.4.3 Focus Order,
 * issue #245).
 *
 * Removing a row deletes the element that had focus, so the browser drops
 * focus onto `<body>` and keyboard/screen-reader users are thrown back to the
 * top of the document. After the list settles this moves focus to the removed
 * row's *neighbour*: the row that took its place, else the row above it, else
 * the list heading (`fallbackRef`).
 *
 * A rollback (an optimistic removal that comes back on the next list change)
 * restores focus to the restored row instead. The request is cleared as soon
 * as it has been handled, so a later, unrelated change — a new member joining,
 * a refetch adding a row — never moves focus again.
 */
export function useRowRemovalFocus(
  ids: readonly string[],
  {
    containerRef,
    fallbackRef,
    rowAttribute = ROW_ID_ATTRIBUTE,
    controlSelector = DEFAULT_CONTROL_SELECTOR,
  }: RowRemovalFocusOptions,
): RowRemovalFocus {
  const pending = useRef<{ id: string; index: number } | null>(null);
  // The previous render's ids, so a rollback (a removed id coming back on the
  // very next change) can be told apart from a later, unrelated addition.
  const previousIds = useRef<readonly string[]>(ids);
  const lastRemoved = useRef<ReadonlySet<string>>(new Set());
  // Effects must re-run when the *content* of the list changes, not on every
  // render: callers rebuild the array on each pass.
  const listKey = ids.join('\u0000');

  const rememberRemovedRow = useCallback(
    (id: string) => {
      const index = ids.indexOf(id);
      if (index === -1) return;
      pending.current = { id, index };
    },
    [ids],
  );

  const forgetRemovedRow = useCallback(() => {
    pending.current = null;
  }, []);

  useEffect(() => {
    // Rebuild the current ids from `listKey`: the effect must depend on the
    // list's content, not on the array identity callers recreate every render.
    const currentIdList = listKey === '' ? [] : listKey.split('\u0000');
    const currentIds = new Set(currentIdList);
    const previous = previousIds.current;
    previousIds.current = currentIdList;

    const rows = containerRef.current
      ? Array.from(containerRef.current.querySelectorAll<HTMLElement>(`[${rowAttribute}]`))
      : [];
    const rowFor = (id: string) => rows.find((row) => row.getAttribute(rowAttribute) === id);
    const focusRow = (row: HTMLElement | undefined) => {
      const target =
        row?.querySelector<HTMLElement>(controlSelector) ?? row ?? fallbackRef.current;
      target?.focus();
    };

    const previousSet = new Set(previous);
    const removedNow = previous.filter((id) => !currentIds.has(id));
    const addedNow = currentIdList.filter((id) => !previousSet.has(id));

    // A row that disappeared on the previous change is back: that is an
    // optimistic removal rolling back, so focus returns to it.
    const restoredId = addedNow.find((id) => lastRemoved.current.has(id));
    if (restoredId) {
      pending.current = null;
      focusRow(rowFor(restoredId));
      lastRemoved.current = new Set(removedNow);
      return;
    }

    const request = pending.current;
    if (request) {
      pending.current = null;
      // Only move focus when the remembered row has actually gone. A failed
      // request without a rollback leaves the list untouched, so focus stays
      // on the control the user pressed.
      if (!currentIds.has(request.id)) {
        focusRow(rows[Math.min(request.index, rows.length - 1)]);
      }
    }

    lastRemoved.current = new Set(removedNow);
  }, [listKey, containerRef, fallbackRef, rowAttribute, controlSelector]);

  return { rememberRemovedRow, forgetRemovedRow };
}
