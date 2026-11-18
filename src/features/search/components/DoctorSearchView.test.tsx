import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DoctorSearchView } from './DoctorSearchView';
import { ApiError } from '../../../services/api-client';
import * as searchService from '../../../services/search-service';
import type {
  DoctorSearchResult,
  SymptomSpecialtyMapping,
  SymptomSuggestion,
} from '../../../types/models';

vi.mock('../../../services/search-service');

const CHEST_PAIN_MAPPING: SymptomSpecialtyMapping = {
  slug: 'chest-pain',
  term: 'Chest pain',
  specialties: [
    { id: 'spc-cardio', name: 'Cardiology', slug: 'cardiology' },
    { id: 'spc-gp', name: 'General practice', slug: 'general-practice' },
  ],
};

const RASH_MAPPING: SymptomSpecialtyMapping = {
  slug: 'rash',
  term: 'Rash',
  specialties: [
    { id: 'spc-derm', name: 'Dermatology', slug: 'dermatology' },
    { id: 'spc-allergy', name: 'Allergy & immunology', slug: 'allergy-immunology' },
  ],
};

const CHEST_PAIN_DOCTORS: DoctorSearchResult[] = [
  {
    id: 'doc-1',
    fullName: 'Dr. Cora Sample (fake)',
    verificationStatus: 'verified',
    specialties: CHEST_PAIN_MAPPING.specialties,
    openSlotCount: 2,
    nextAvailableAt: new Date(Date.now() + 8 * 3_600_000).toISOString(),
  },
];

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderView(initialUrl = '/patient/search') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const ui: ReactElement = (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route
            path="/patient/search"
            element={
              <>
                <DoctorSearchView />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return rtlRender(ui);
}

describe('DoctorSearchView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchService.searchSymptoms).mockResolvedValue([]);
    vi.mocked(searchService.searchDoctors).mockResolvedValue([]);
    vi.mocked(searchService.getSymptomMapping).mockImplementation(async (slug) => {
      if (slug === 'chest-pain') return CHEST_PAIN_MAPPING;
      if (slug === 'rash') return RASH_MAPPING;
      throw new ApiError('Mock API: symptom not found', 404);
    });
  });

  it('shows which specialties the symptom maps to and the matching doctors', async () => {
    vi.mocked(searchService.searchDoctors).mockResolvedValue(CHEST_PAIN_DOCTORS);
    renderView('/patient/search?symptom=chest-pain');

    // Mapping line names the specialties.
    expect(await screen.findByText('Cardiology and General practice')).toBeInTheDocument();
    expect(screen.getByText(/Showing doctors in/)).toBeInTheDocument();

    // The doctor search used the mapped specialties.
    await waitFor(() =>
      expect(searchService.searchDoctors).toHaveBeenCalledWith(
        { specialtyIds: ['spc-cardio', 'spc-gp'], availability: 'any' },
        null,
        expect.any(AbortSignal),
      ),
    );

    expect(await screen.findByText('Dr. Cora Sample (fake)')).toBeInTheDocument();
    expect(screen.getByText('1 doctor found.')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('combines the availability filter with the symptom and syncs both to the URL', async () => {
    const user = userEvent.setup();
    renderView('/patient/search?symptom=chest-pain');

    await screen.findByText('Cardiology and General practice');

    await user.click(screen.getByRole('tab', { name: 'Today' }));

    expect(screen.getByTestId('location')).toHaveTextContent('symptom=chest-pain');
    expect(screen.getByTestId('location')).toHaveTextContent('availability=today');
    await waitFor(() =>
      expect(searchService.searchDoctors).toHaveBeenCalledWith(
        expect.objectContaining({ availability: 'today' }),
        null,
        expect.any(AbortSignal),
      ),
    );
  });

  it('reads availability from the URL on load', async () => {
    renderView('/patient/search?symptom=chest-pain&availability=week');

    await waitFor(() =>
      expect(searchService.searchDoctors).toHaveBeenCalledWith(
        { specialtyIds: ['spc-cardio', 'spc-gp'], availability: 'week' },
        null,
        expect.any(AbortSignal),
      ),
    );
  });

  it('guides the patient out of a no-match state', async () => {
    vi.mocked(searchService.searchDoctors).mockResolvedValue([]);
    const user = userEvent.setup();
    renderView('/patient/search?symptom=chest-pain&availability=today');

    expect(
      await screen.findByRole('heading', { name: 'No doctors match right now' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'None of the doctors in Cardiology and General practice have open slots today.',
      ),
    ).toBeInTheDocument();

    // One click takes them back to the unfiltered specialty list.
    await user.click(screen.getByRole('button', { name: /any availability/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('symptom=chest-pain');
    expect(screen.getByTestId('location')).not.toHaveTextContent('availability=');
    await waitFor(() =>
      expect(searchService.searchDoctors).toHaveBeenLastCalledWith(
        expect.objectContaining({ availability: 'any' }),
        null,
        expect.any(AbortSignal),
      ),
    );
  });

  it('applies a symptom chosen from the combobox and updates the URL', async () => {
    vi.mocked(searchService.searchSymptoms).mockResolvedValue([
      { slug: 'rash', term: 'Rash' },
    ] satisfies SymptomSuggestion[]);
    vi.mocked(searchService.searchDoctors).mockResolvedValue([]);
    const user = userEvent.setup();
    renderView();

    await user.type(screen.getByRole('combobox'), 'ra');
    // Wait for the (debounced) suggestion before driving the keyboard.
    await screen.findByRole('option', { name: 'Rash' });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('symptom=rash');
    expect(await screen.findByText('Dermatology and Allergy & immunology')).toBeInTheDocument();
    await waitFor(() =>
      expect(searchService.searchDoctors).toHaveBeenCalledWith(
        { specialtyIds: ['spc-allergy', 'spc-derm'], availability: 'any' },
        null,
        expect.any(AbortSignal),
      ),
    );
  });

  it('drops invalid URL params with a visible notice and no bogus requests', async () => {
    const user = userEvent.setup();
    renderView('/patient/search?symptom=NOT%20A%20SLUG&availability=nope');

    expect(await screen.findByText(/symptom link was not valid/i)).toBeInTheDocument();
    expect(screen.getByText(/availability filter was not valid/i)).toBeInTheDocument();

    expect(searchService.getSymptomMapping).not.toHaveBeenCalled();
    expect(searchService.searchDoctors).not.toHaveBeenCalled();

    // The page still works: clearing resets the URL.
    expect(screen.getByRole('heading', { name: 'Start with a symptom' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Any time' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^$/);
  });

  it('explains an unknown symptom slug instead of erroring', async () => {
    renderView('/patient/search?symptom=long-gone');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We don’t recognise “long-gone” any more.',
    );
    expect(
      await screen.findByRole('heading', { name: 'We can’t look that symptom up' }),
    ).toBeInTheDocument();

    // No specialty ids ⇒ no doctor request is ever fired.
    expect(searchService.searchDoctors).not.toHaveBeenCalled();
  });

  it('shows the starting guidance before any symptom is applied', async () => {
    renderView();

    expect(screen.getByRole('heading', { name: 'Start with a symptom' })).toBeInTheDocument();
    expect(searchService.searchDoctors).not.toHaveBeenCalled();
    expect(searchService.getSymptomMapping).not.toHaveBeenCalled();
  });
});
