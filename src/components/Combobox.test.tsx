import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '../test/render';
import userEvent from '@testing-library/user-event';
import { Combobox, type ComboboxOption } from './Combobox';

const OPTIONS: ComboboxOption[] = [
  { id: 'rash', label: 'Rash', hint: 'Dermatology' },
  { id: 'chest-pain', label: 'Chest pain', hint: 'Cardiology' },
  { id: 'sore-throat', label: 'Sore throat', hint: 'General practice' },
];

/** Parent harness — the Combobox is controlled, so tests drive it through a
 * minimal stateful wrapper the way the symptom combobox does in the app. */
function Harness({
  options = OPTIONS,
  loading = false,
  onSelect = vi.fn(),
}: {
  options?: ComboboxOption[];
  loading?: boolean;
  onSelect?: (optionId: string | null) => void;
}) {
  const [text, setText] = useState('');
  const [selected, setSelected] = useState('');

  return (
    <Combobox
      id="test-combobox"
      label="Symptoms"
      selectedOptionId={selected}
      inputValue={text}
      onInputChange={setText}
      onSelect={(optionId) => {
        setSelected(optionId ?? '');
        setText(optionId ? (options.find((option) => option.id === optionId)?.label ?? '') : '');
        onSelect(optionId);
      }}
      options={options}
      loading={loading}
      placeholder="e.g. rash"
      emptyMessage="No matching symptoms"
      helpText="Describe what feels wrong."
    />
  );
}

function getInput() {
  return screen.getByRole('combobox');
}

describe('Combobox', () => {
  it('renders collapsed with the right combobox ARIA wiring', () => {
    render(<Harness />);
    const input = getInput();

    expect(screen.getByLabelText('Symptoms')).toBe(input);
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-controls');
    expect(input).toHaveAccessibleDescription(/Describe what feels wrong/);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens on typing and announces the suggestion count in a live region', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(getInput(), 'r');

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getAllByRole('option')).toHaveLength(3);
    expect(getInput()).toHaveAttribute('aria-expanded', 'true');

    expect(screen.getByRole('status')).toHaveTextContent(
      '3 suggestions available. Use up and down arrows to browse, Enter to select.',
    );
  });

  it('moves the active option with ArrowDown/ArrowUp, wrapping, and tracks aria-activedescendant', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = getInput();

    await user.type(input, 'r');
    expect(input).not.toHaveAttribute('aria-activedescendant');

    // ArrowDown opens highlight on the first option.
    await user.keyboard('{ArrowDown}');
    const options = screen.getAllByRole('option');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);

    // Wrap forward past the end.
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);

    // Wrap backward past the start.
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', options[2].id);

    await user.keyboard('{Home}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    await user.keyboard('{End}');
    expect(input).toHaveAttribute('aria-activedescendant', options[2].id);

    // Focus never left the input — the whole point of active-descendant.
    expect(input).toHaveFocus();
  });

  it('commits the active option with Enter and closes the popup', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);

    await user.type(getInput(), 'chest');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith('rash');
    expect(getInput()).toHaveValue('Rash');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('commits an option on mouse click', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);

    await user.type(getInput(), 'r');
    await user.click(screen.getByRole('option', { name: /Chest pain/ }));

    expect(onSelect).toHaveBeenCalledWith('chest-pain');
    expect(getInput()).toHaveValue('Chest pain');
  });

  it('Escape closes the popup first, then clears the committed selection', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);

    await user.type(getInput(), 'rash');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('rash');

    // Re-open by typing, then Escape only closes the popup (keeps the selection).
    await user.type(getInput(), 's');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onSelect).toHaveBeenLastCalledWith('rash');

    // Escape again clears the selection.
    await user.keyboard('{Escape}');
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(getInput()).toHaveValue('');
  });

  it('offers a Clear button while a selection is committed', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);

    expect(screen.queryByRole('button', { name: /clear symptoms/i })).not.toBeInTheDocument();

    await user.type(getInput(), 'rash');
    await user.keyboard('{ArrowDown}{Enter}');
    await user.click(screen.getByRole('button', { name: /clear symptoms/i }));

    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(getInput()).toHaveValue('');
  });

  it('shows the empty message when nothing matches', async () => {
    const user = userEvent.setup();
    render(<Harness options={[]} />);

    await user.type(getInput(), 'zz');

    expect(screen.queryByRole('listbox')).toBeInTheDocument();
    // Shown in the popup AND echoed in the live region for screen readers.
    expect(screen.getAllByText('No matching symptoms')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('No matching symptoms');
  });

  it('reflects the loading state', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness loading={false} />);

    await user.type(getInput(), 'ch');
    rerender(<Harness loading={true} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading suggestions');
  });
});
