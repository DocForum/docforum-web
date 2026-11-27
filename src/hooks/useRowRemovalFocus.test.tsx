import { describe, expect, it } from 'vitest';
import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useRowRemovalFocus } from './useRowRemovalFocus';

function activeName(): string | null {
  return document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? null;
}

function Harness({ initial }: { initial: readonly string[] }) {
  const [ids, setIds] = useState<string[]>([...initial]);
  const listRef = useRef<HTMLUListElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { rememberRemovedRow } = useRowRemovalFocus(ids, {
    containerRef: listRef,
    fallbackRef: headingRef,
  });

  const remove = (id: string) => {
    rememberRemovedRow(id);
    setIds((current) => current.filter((entry) => entry !== id));
  };

  return (
    <section>
      <h2 ref={headingRef} tabIndex={-1}>
        Items
      </h2>
      <ul ref={listRef}>
        {ids.map((id) => (
          <li key={id} data-row-id={id}>
            <button onClick={() => remove(id)}>Remove {id}</button>
          </li>
        ))}
      </ul>
      <button onClick={() => setIds([...initial])}>Restore all</button>
      <button onClick={() => setIds((current) => [...current, `extra-${current.length}`])}>Add row</button>
    </section>
  );
}

describe('useRowRemovalFocus', () => {
  it('moves focus to the next row when a middle row is removed', () => {
    render(<Harness initial={['a', 'b', 'c']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove b' }));

    expect(activeName()).toBe('Remove c');
  });

  it('falls back to the previous row when the last row is removed', () => {
    render(<Harness initial={['a', 'b', 'c']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove c' }));

    expect(activeName()).toBe('Remove b');
  });

  it('falls back to the list heading when the last row in the list goes', () => {
    render(<Harness initial={['only']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove only' }));

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Items' }));
  });

  it('returns focus to the restored row when a removal rolls back', () => {
    render(<Harness initial={['a', 'b', 'c']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove b' }));
    expect(activeName()).toBe('Remove c');

    fireEvent.click(screen.getByRole('button', { name: 'Restore all' }));

    expect(activeName()).toBe('Remove b');
  });

  it('does not move focus again when an unrelated row is added later', () => {
    render(<Harness initial={['a', 'b', 'c']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove b' }));
    expect(activeName()).toBe('Remove c');

    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));

    // The removal has been handled; a later change must not yank focus back.
    expect(activeName()).toBe('Remove c');
  });

  it('leaves focus alone when no removal was requested', () => {
    render(<Harness initial={['a', 'b']} />);
    screen.getByRole('button', { name: 'Remove a' }).focus();

    fireEvent.click(screen.getByRole('button', { name: 'Restore all' }));

    expect(activeName()).toBe('Remove a');
  });
});
