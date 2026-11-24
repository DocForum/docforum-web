import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '../../../test/render';
import userEvent from '@testing-library/user-event';
import { SymptomCombobox } from './SymptomCombobox';
import * as searchService from '../../../services/search-service';
import type { SymptomSuggestion } from '../../../types/models';

vi.mock('../../../services/search-service');

const SUGGESTIONS: SymptomSuggestion[] = [
  { slug: 'chest-pain', term: 'Chest pain' },
  { slug: 'palpitations', term: 'Heart palpitations' },
];

const KNOWN_TERMS: Record<string, string> = Object.fromEntries(
  SUGGESTIONS.map((s) => [s.slug, s.term]),
);

function Harness({
  onSelect = vi.fn(),
  debounceMs = 60,
}: {
  onSelect?: (slug: string | null) => void;
  debounceMs?: number;
}) {
  const [slug, setSlug] = useState('');
  return (
    <SymptomCombobox
      selectedSlug={slug}
      selectedTerm={KNOWN_TERMS[slug]}
      debounceMs={debounceMs}
      onSelect={(next) => {
        setSlug(next ?? '');
        onSelect(next);
      }}
    />
  );
}

describe('SymptomCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchService.searchSymptoms).mockResolvedValue([]);
  });

  it('debounces keystrokes into a single suggestion request', async () => {
    vi.mocked(searchService.searchSymptoms).mockResolvedValue(SUGGESTIONS);
    const user = userEvent.setup();
    render(<Harness debounceMs={80} />);

    // A burst of typing must produce one request, after the debounce.
    await user.type(screen.getByRole('combobox'), 'chest');
    expect(searchService.searchSymptoms).not.toHaveBeenCalled();

    await waitFor(() => expect(searchService.searchSymptoms).toHaveBeenCalledTimes(1));
    expect(searchService.searchSymptoms).toHaveBeenCalledWith('chest', null, expect.any(AbortSignal));
  });

  it('cancels the in-flight request when a newer keystroke supersedes it', async () => {
    const signals: AbortSignal[] = [];
    // Never-resolving responses keep both requests genuinely in flight, the
    // only situation where cancellation matters.
    vi.mocked(searchService.searchSymptoms).mockImplementation((_query, _token, signal) => {
      if (signal) signals.push(signal);
      return new Promise(() => {});
    });
    const user = userEvent.setup();
    render(<Harness debounceMs={60} />);

    await user.type(screen.getByRole('combobox'), 'ch');
    await waitFor(() => expect(signals).toHaveLength(1));

    await user.type(screen.getByRole('combobox'), 'est');
    await waitFor(() => expect(signals).toHaveLength(2));

    // The superseded request is aborted — it can never race the new one.
    await waitFor(() => expect(signals[0].aborted).toBe(true));
    expect(signals[1].aborted).toBe(false);
  });

  it('commits a suggestion picked with the keyboard and syncs the canonical term', async () => {
    vi.mocked(searchService.searchSymptoms).mockResolvedValue(SUGGESTIONS);
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'chest');

    // Wait for the (debounced) options before driving the keyboard.
    await screen.findByRole('option', { name: 'Chest pain' });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith('chest-pain');
    expect(input).toHaveValue('Chest pain');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows guidance when nothing in the vocabulary matches', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole('combobox'), 'zzz');

    // Shown in the popup AND echoed in the live region for screen readers.
    expect(await screen.findAllByText(/No matching symptoms in our list/)).toHaveLength(2);
  });

  it('resets the text when the selection is cleared from outside', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <SymptomCombobox selectedSlug="chest-pain" selectedTerm="Chest pain" onSelect={onSelect} />,
    );
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Chest pain');

    // e.g. the Clear button in the applied-symptom row.
    rerender(<SymptomCombobox selectedSlug="" onSelect={onSelect} />);
    await waitFor(() => expect(input).toHaveValue(''));

    // …and clearing the text itself clears the applied symptom.
    await user.type(input, 'ra');
    await user.clear(input);
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
