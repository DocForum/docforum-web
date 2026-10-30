import { useEffect, useMemo, useState } from 'react';
import { Combobox } from '../../../components/Combobox';
import {
  MIN_SYMPTOM_QUERY_LENGTH,
  useSymptomSuggestions,
} from '../hooks/useSymptomSuggestions';
import type { SymptomSuggestion } from '../../../types/models';

const NO_SUGGESTIONS: SymptomSuggestion[] = [];

interface SymptomComboboxProps {
  /** The applied symptom's slug (from the URL), '' when none. */
  selectedSlug: string;
  /** The canonical term for `selectedSlug`, once its mapping has loaded. */
  selectedTerm?: string;
  onSelect: (slug: string | null) => void;
  /** Test seam: override the debounce (ms) to keep real-timer tests fast. */
  debounceMs?: number;
}

/**
 * Symptom search input: patients describe what's wrong ("rash", "chest
 * pain") and pick from the backend's controlled vocabulary — free text is
 * never sent to the doctor-search endpoint. The committed selection is the
 * slug; the text in the box is cosmetic and resets to the canonical term.
 */
export function SymptomCombobox({
  selectedSlug,
  selectedTerm,
  onSelect,
  debounceMs,
}: SymptomComboboxProps) {
  const [inputValue, setInputValue] = useState(selectedTerm ?? '');

  const { data: suggestions = NO_SUGGESTIONS, isFetching } = useSymptomSuggestions(
    inputValue,
    debounceMs,
  );

  // Keep the text in sync when the applied symptom changes from outside the
  // box: a clear, a back/forward navigation, or the mapping load confirming
  // the canonical term after a pick. Deliberately does nothing while the
  // text differs only because the user is typing.
  useEffect(() => {
    if (!selectedSlug) {
      setInputValue('');
      return;
    }
    if (selectedTerm) setInputValue(selectedTerm);
  }, [selectedSlug, selectedTerm]);

  const handleInputChange = (text: string) => {
    setInputValue(text);
    // Emptying the box is unambiguous — nothing left to search for.
    if (text === '') onSelect(null);
  };

  const handleSelect = (optionId: string | null) => {
    if (!optionId) {
      setInputValue('');
      onSelect(null);
      return;
    }
    const picked = suggestions.find((suggestion) => suggestion.slug === optionId);
    setInputValue(picked?.term ?? optionId);
    onSelect(optionId);
  };

  const options = useMemo(
    () => suggestions.map((suggestion) => ({ id: suggestion.slug, label: suggestion.term })),
    [suggestions],
  );

  const minLengthReached = inputValue.trim().length >= MIN_SYMPTOM_QUERY_LENGTH;

  return (
    <Combobox
      id="symptom-search"
      label="What’s bothering you?"
      placeholder="e.g. rash, chest pain"
      selectedOptionId={selectedSlug}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onSelect={handleSelect}
      options={options}
      loading={isFetching}
      emptyMessage={
        minLengthReached ? 'No matching symptoms in our list — try a simpler description.' : ''
      }
      helpText="Pick a symptom from the list — we match it to the specialties that treat it. This is guidance, not a diagnosis."
    />
  );
}
