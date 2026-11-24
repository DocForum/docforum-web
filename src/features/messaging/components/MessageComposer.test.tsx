import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from '../../../test/render';
import { MessageComposer } from './MessageComposer';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as messagingService from '../../../services/messaging-service';
import type { MessageAttachment } from '../../../types/models';

vi.mock('../../../services/messaging-service');
vi.mock('../image-utils', () => ({
  prepareImageForUpload: vi.fn((file: File) => Promise.resolve(file)),
}));

const attachment: MessageAttachment = {
  id: 'att-1',
  messageId: 'm-1',
  fileName: 'rash.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 2048,
  kind: 'image',
  createdAt: '2026-10-16T00:00:00.000Z',
};

function jpeg(): File {
  return new File([new Uint8Array([1, 2, 3])], 'rash.jpg', { type: 'image/jpeg' });
}

function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe('MessageComposer', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(messagingService.uploadAttachment).mockReset();
    vi.mocked(messagingService.sendMessage).mockReset();
  });

  it('keeps send disabled until there is a body or an uploaded attachment', () => {
    render(<MessageComposer threadId="thread-1" />);
    expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled();
  });

  it('sends a text-only message', async () => {
    vi.mocked(messagingService.sendMessage).mockResolvedValue({
      id: 'm-9',
      threadId: 'thread-1',
      senderProfileId: 'p-1',
      body: 'Hello',
      attachments: [],
      createdAt: '2026-10-16T00:00:00.000Z',
    });
    const user = userEvent.setup();

    render(<MessageComposer threadId="thread-1" />);
    await user.type(screen.getByLabelText('Message'), 'Hello');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() =>
      expect(messagingService.sendMessage).toHaveBeenCalledWith(
        'thread-1',
        { body: 'Hello', attachmentIds: undefined },
        'test-token',
      ),
    );
  });

  it('uploads a picked attachment and includes its id when sending', async () => {
    vi.mocked(messagingService.uploadAttachment).mockResolvedValue(attachment);
    vi.mocked(messagingService.sendMessage).mockResolvedValue({
      id: 'm-10',
      threadId: 'thread-1',
      senderProfileId: 'p-1',
      body: 'Here is the photo',
      attachments: [attachment],
      createdAt: '2026-10-16T00:00:00.000Z',
    });
    const user = userEvent.setup();

    const { container } = render(<MessageComposer threadId="thread-1" />);
    fireEvent.change(fileInput(container), { target: { files: [jpeg()] } });

    expect(await screen.findByText('Uploaded')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Message'), 'Here is the photo');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() =>
      expect(messagingService.sendMessage).toHaveBeenCalledWith(
        'thread-1',
        { body: 'Here is the photo', attachmentIds: ['att-1'] },
        'test-token',
      ),
    );
  });

  it('rejects a disallowed file with a clear message and never uploads it', async () => {
    const { container } = render(<MessageComposer threadId="thread-1" />);
    fireEvent.change(fileInput(container), {
      target: { files: [new File(['x'], 'script.svg', { type: 'image/svg+xml' })] },
    });

    expect(await screen.findByText(/supported file/i)).toBeInTheDocument();
    expect(messagingService.uploadAttachment).not.toHaveBeenCalled();
  });

  it('lets a stalled upload be cancelled and retried', async () => {
    vi.mocked(messagingService.uploadAttachment).mockImplementation((_threadId, _file, _token, options) => {
      return new Promise<MessageAttachment>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new ApiError('Upload cancelled', 0, undefined, { cancelled: true })));
      });
    });
    const user = userEvent.setup();

    const { container } = render(<MessageComposer threadId="thread-1" />);
    fireEvent.change(fileInput(container), { target: { files: [jpeg()] } });

    await user.click(await screen.findByRole('button', { name: /^cancel$/i }));
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^retry$/i })).toBeInTheDocument();
  });
});
