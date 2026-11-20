import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { MessageThread } from './MessageThread';
import { ApiError } from '../../../services/api-client';
import * as messagingService from '../../../services/messaging-service';
import type { Message, MessagePage, MessageThread as Thread } from '../../../types/models';

vi.mock('../../../services/messaging-service');
// The stream itself is covered by event-stream-service tests; here we only
// care about the thread's fallback/refresh behaviour.
vi.mock('../../../hooks/useServerEvents', () => ({
  useServerEvent: () => undefined,
}));

const THREAD: Thread = {
  id: 'thread-1',
  appointmentId: 'appt-1',
  status: 'open',
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
};

function message(id: string, body: string, createdAt: string): Message {
  return {
    id,
    threadId: 'thread-1',
    senderProfileId: 'profile-1',
    body,
    attachments: [],
    createdAt,
  };
}

const FIRST_PAGE: MessagePage = {
  messages: [
    message('m-2', 'Second message', '2026-10-01T10:05:00.000Z'),
    message('m-1', 'First message', '2026-10-01T10:00:00.000Z'),
  ],
  nextCursor: 'older-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(messagingService.getThread).mockResolvedValue(THREAD);
  vi.mocked(messagingService.listMessages).mockResolvedValue(FIRST_PAGE);
  vi.mocked(messagingService.sendMessage).mockImplementation(async (_threadId, input) =>
    message('m-3', input.body, '2026-10-01T10:10:00.000Z'),
  );
});

describe('MessageThread', () => {
  it('renders messages oldest first, even when the page arrives unordered', async () => {
    render(<MessageThread threadId="thread-1" />, { role: 'patient' });

    await screen.findByText('First message');
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('First message');
    expect(items[1]).toHaveTextContent('Second message');
  });

  it('loads older history on demand and prepends it', async () => {
    vi.mocked(messagingService.listMessages)
      .mockResolvedValueOnce(FIRST_PAGE)
      .mockResolvedValueOnce({
        messages: [message('m-0', 'Oldest message', '2026-10-01T09:30:00.000Z')],
        nextCursor: null,
      });

    const user = userEvent.setup();
    render(<MessageThread threadId="thread-1" />, { role: 'patient' });

    await user.click(await screen.findByRole('button', { name: /load older messages/i }));

    await waitFor(() =>
      expect(messagingService.listMessages).toHaveBeenLastCalledWith(
        'thread-1',
        'older-1',
        'test-patient-token',
      ),
    );
    await screen.findByText('Oldest message');
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Oldest message');
  });

  it('shows the message immediately while sending, then keeps the confirmed copy', async () => {
    let resolveSend: (value: Message) => void = () => undefined;
    vi.mocked(messagingService.sendMessage).mockImplementation(
      () => new Promise<Message>((resolve) => { resolveSend = resolve; }),
    );

    const user = userEvent.setup();
    render(<MessageThread threadId="thread-1" />, { role: 'patient' });

    await screen.findByText('First message');
    await user.type(screen.getByLabelText('Message'), 'Optimistic hello');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText('Optimistic hello')).toBeInTheDocument();
    expect(screen.getByText('Sending…')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toHaveValue('');

    // The next page read includes the confirmed message, as the real server
    // would after a successful send.
    vi.mocked(messagingService.listMessages).mockResolvedValue({
      messages: [
        ...FIRST_PAGE.messages,
        message('m-3', 'Optimistic hello', '2026-10-01T10:10:00.000Z'),
      ],
      nextCursor: null,
    });
    resolveSend(message('m-3', 'Optimistic hello', '2026-10-01T10:10:00.000Z'));

    await waitFor(() => expect(screen.queryByText('Sending…')).not.toBeInTheDocument());
    expect(await screen.findByText('Optimistic hello')).toBeInTheDocument();
  });

  it('keeps a failed message in the thread and retries it from there', async () => {
    vi.mocked(messagingService.sendMessage)
      .mockRejectedValueOnce(new ApiError('Network down', 0))
      .mockResolvedValueOnce(message('m-4', 'Please retry me', '2026-10-01T10:12:00.000Z'));

    const user = userEvent.setup();
    render(<MessageThread threadId="thread-1" />, { role: 'patient' });

    await screen.findByText('First message');
    await user.type(screen.getByLabelText('Message'), 'Please retry me');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText('Not sent')).toBeInTheDocument();
    expect(screen.getByText('Please retry me')).toBeInTheDocument();

    vi.mocked(messagingService.listMessages).mockResolvedValue({
      messages: [
        ...FIRST_PAGE.messages,
        message('m-4', 'Please retry me', '2026-10-01T10:12:00.000Z'),
      ],
      nextCursor: null,
    });
    await user.click(screen.getByRole('button', { name: /^retry$/i }));

    await waitFor(() => expect(screen.queryByText('Not sent')).not.toBeInTheDocument());
    expect(messagingService.sendMessage).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Please retry me')).toBeInTheDocument();
  });

  it('replaces the composer with a closed-thread explanation, keeping history readable', async () => {
    vi.mocked(messagingService.getThread).mockResolvedValue({ ...THREAD, status: 'closed' });
    render(<MessageThread threadId="thread-1" />, { role: 'patient' });

    expect(await screen.findByText('First message')).toBeInTheDocument();
    expect(screen.getByText(/this consultation is closed/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
  });

  it('renders message text safely: no HTML, no script links, safe http links only', async () => {
    vi.mocked(messagingService.listMessages).mockResolvedValue({
      messages: [
        message(
          'm-xss',
          '<script>alert(1)</script> javascript:alert(2) see https://example.test/help.',
          '2026-10-01T10:00:00.000Z',
        ),
      ],
      nextCursor: null,
    });

    const { container } = render(<MessageThread threadId="thread-1" />, { role: 'patient' });

    await screen.findByText(/alert\(1\)/);
    expect(container.querySelector('script')).toBeNull();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://example.test/help');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    expect(links[0]).toHaveAttribute('target', '_blank');
    // The javascript: text stayed text, not a link.
    expect(screen.queryByRole('link', { name: /javascript:/i })).not.toBeInTheDocument();
  });

  it('keeps drafts in memory across unmounts and never touches browser storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const open = vi.fn();
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: { open } });

    const user = userEvent.setup();
    const first = render(<MessageThread threadId="thread-1" />, { role: 'patient' });

    await screen.findByText('First message');
    await user.type(screen.getByLabelText('Message'), 'Half-written question');

    expect(setItem).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();

    first.unmount();

    render(<MessageThread threadId="thread-1" />, { role: 'patient' });
    expect(await screen.findByLabelText('Message')).toHaveValue('Half-written question');

    expect(setItem).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('clears the draft once the message is queued', async () => {
    const user = userEvent.setup();
    render(<MessageThread threadId="thread-1" />, { role: 'patient' });

    await screen.findByText('First message');
    await user.type(screen.getByLabelText('Message'), 'Sent then gone');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => expect(screen.getByLabelText('Message')).toHaveValue(''));
  });
});
