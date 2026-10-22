import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { RecordSearch } from './RecordSearch';
import type { CareThread, User } from '../../../types/models';

vi.mock('../../care-thread/hooks/useCareThread', () => ({
  useCareThreads: () => ({}),
}));
vi.mock('../../queue/hooks/useQueue', () => ({
  useAppointments: () => ({}),
}));
vi.mock('../../messaging/hooks/useMessageThreads', () => ({
  useMessageThreads: () => ({}),
}));

const USER: User = {
  id: 'patient-user',
  email: 'patient@example.test',
  role: 'patient',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function careThread(id: string, profileId: string, title: string): CareThread {
  return {
    id,
    patientProfileId: profileId,
    title,
    doctorName: 'Dr. Ada',
    specialty: 'Cardiology',
    startedAt: '2026-03-02T10:00:00Z',
    updatedAt: '2026-03-02T10:00:00Z',
    status: 'active',
    steps: [{
      id: `${id}-order`,
      stepType: 'order',
      title,
      description: 'Blood test',
      status: 'pending',
    }],
  };
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderSearch(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RecordSearch />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RecordSearch', () => {
  afterEach(cleanup);

  beforeEach(() => {
    useAuthStore.setState({ user: USER, accessToken: 'token' });
    useProfileStore.setState({
      profiles: [{ id: 'profile-1', fullName: 'Patient One', isSelf: true }],
      selectedProfileId: 'profile-1',
    });
  });

  it('groups loaded records and navigates with keyboard selection', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['care-threads', 'profile-1'], [
      careThread('thread-1', 'profile-1', 'CBC panel'),
    ]);
    renderSearch(queryClient);

    const input = screen.getByRole('combobox', { name: 'Search your records' });
    await userEvent.type(input, 'CBC');

    expect(screen.getByRole('group', { name: 'Orders' })).toBeInTheDocument();
    const option = screen.getByRole('option', { name: /CBC panel/ });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', option.id);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('location')).toHaveTextContent('/care/thread-1');
  });

  it('updates results when a list is fetched after the search surface mounts', async () => {
    const queryClient = new QueryClient();
    renderSearch(queryClient);

    const input = screen.getByRole('combobox', { name: 'Search your records' });
    await userEvent.type(input, 'CBC');
    expect(screen.getByText('No matching records found.')).toBeInTheDocument();

    act(() => {
      queryClient.setQueryData(['care-threads', 'profile-1'], [
        careThread('thread-1', 'profile-1', 'CBC panel'),
      ]);
    });

    expect(await screen.findByRole('option', { name: /CBC panel/ })).toBeInTheDocument();
  });

  it('drops the prior profile index and clears its search when the acting profile changes', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['care-threads', 'profile-1'], [
      careThread('thread-1', 'profile-1', 'CBC panel'),
    ]);
    queryClient.setQueryData(['care-threads', 'profile-2'], [
      careThread('thread-2', 'profile-2', 'Metabolic panel'),
    ]);
    renderSearch(queryClient);

    const input = screen.getByRole('combobox', { name: 'Search your records' });
    await userEvent.type(input, 'CBC');
    expect(screen.getByRole('option', { name: /CBC panel/ })).toBeInTheDocument();

    act(() => useProfileStore.getState().selectProfile('profile-2'));

    await waitFor(() => expect(input).toHaveValue(''));
    expect(screen.queryByRole('option', { name: /CBC panel/ })).not.toBeInTheDocument();
    await userEvent.type(input, 'Metabolic');
    expect(screen.getByRole('option', { name: /Metabolic panel/ })).toBeInTheDocument();
  });

  it('removes the search surface when the session logs out', () => {
    const queryClient = new QueryClient();
    renderSearch(queryClient);

    act(() => useAuthStore.getState().clearSession());

    expect(screen.queryByRole('combobox', { name: 'Search your records' })).not.toBeInTheDocument();
  });

  it('clears cached records when the signed-in identity changes', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['care-threads', 'profile-1'], [
      careThread('thread-1', 'profile-1', 'CBC panel'),
    ]);
    renderSearch(queryClient);

    act(() => useAuthStore.setState({
      user: { ...USER, id: 'different-patient' },
      accessToken: 'new-token',
    }));

    await waitFor(() => expect(queryClient.getQueryCache().getAll()).toHaveLength(0));
  });
});
