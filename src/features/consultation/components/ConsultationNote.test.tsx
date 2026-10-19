import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { ConsultationNote } from './ConsultationNote';
import { useAuthStore } from '../../../store/auth-store';
import * as consultationService from '../../../services/consultation-service';
import type { ConsultationNote as ConsultationNoteType } from '../../../types/models';

vi.mock('../../../services/consultation-service');

const NOTE: ConsultationNoteType = {
  id: 'note-1',
  appointmentId: 'appt-1',
  content: 'Initial note content.',
  signedAt: null,
  signedBy: null,
  autoSignOffAt: '2026-01-01T17:00:00Z',
  addenda: [],
};

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(consultationService.getConsultationNote).mockResolvedValue(NOTE);
  vi.mocked(consultationService.signOffNote).mockResolvedValue({
    ...NOTE,
    signedAt: '2026-01-01T10:00:00Z',
    signedBy: 'dr-1',
  });
  vi.mocked(consultationService.addAddendum).mockResolvedValue({
    id: 'add-1',
    noteId: 'note-1',
    content: 'New addendum.',
    createdAt: '2026-01-01T11:00:00Z',
  });
});

describe('ConsultationNote', () => {
  it('renders a draft note with edit and sign-off', async () => {
    render(<ConsultationNote appointmentId="appt-1" />);

    await screen.findByDisplayValue('Initial note content.');
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign and lock/i })).toBeInTheDocument();
  });

  it('signs and locks the note after confirmation', async () => {
    render(<ConsultationNote appointmentId="appt-1" />);
    const user = userEvent.setup();

    await screen.findByDisplayValue('Initial note content.');
    await user.click(screen.getByRole('button', { name: /sign and lock/i }));

    // Confirmation dialog appears explaining immutability.
    expect(await screen.findByText(/immutable/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /sign and lock/i }));

    await waitFor(() => {
      expect(consultationService.signOffNote).toHaveBeenCalledWith('note-1', 'test-token');
    });
    expect(await screen.findByText(/signed · locked/i)).toBeInTheDocument();
  });

  it('is read-only after sign-off with an addendum composer and no edit path', async () => {
    const signed = { ...NOTE, signedAt: '2026-01-01T10:00:00Z', signedBy: 'dr-1' };
    vi.mocked(consultationService.getConsultationNote).mockResolvedValue(signed);

    render(<ConsultationNote appointmentId="appt-1" />);
    const user = userEvent.setup();

    await screen.findByText(/signed · locked/i);
    // No edit path after sign-off.
    expect(screen.queryByRole('button', { name: /edit note/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign and lock/i })).not.toBeInTheDocument();

    // Add addendum composer present.
    await user.type(screen.getByPlaceholderText(/add an addendum/i), 'New addendum.');
    await user.click(screen.getByRole('button', { name: /add addendum/i }));

    await waitFor(() => {
      expect(consultationService.addAddendum).toHaveBeenCalledWith('note-1', { content: 'New addendum.' }, 'test-token');
    });
    expect(await screen.findByText('New addendum.')).toBeInTheDocument();
  });

  it('shows the auto sign-off deadline for drafts', async () => {
    render(<ConsultationNote appointmentId="appt-1" />);
    expect(await screen.findByText(/auto sign-off/i)).toBeInTheDocument();
  });
});
