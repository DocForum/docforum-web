import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { AttachmentPreview } from './AttachmentPreview';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as messagingService from '../../../services/messaging-service';
import type { MessageAttachment } from '../../../types/models';

vi.mock('../../../services/messaging-service');

const imageAttachment: MessageAttachment = {
  id: 'att-image',
  messageId: 'm-1',
  fileName: 'rash.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 2048,
  kind: 'image',
  createdAt: '2026-10-16T00:00:00.000Z',
};

const pdfAttachment: MessageAttachment = {
  id: 'att-pdf',
  messageId: 'm-1',
  fileName: 'report.pdf',
  contentType: 'application/pdf',
  sizeBytes: 4096,
  kind: 'pdf',
  createdAt: '2026-10-16T00:00:00.000Z',
};

describe('AttachmentPreview', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(messagingService.requestAttachmentDownloadUrl).mockReset();
    vi.spyOn(window, 'open').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a PDF chip and opens a signed URL on click', async () => {
    vi.mocked(messagingService.requestAttachmentDownloadUrl).mockResolvedValue({
      url: 'https://signed/pdf-1',
      expiresAt: '2026-10-16T00:05:00.000Z',
    });
    const user = userEvent.setup();

    render(<AttachmentPreview threadId="thread-1" attachment={pdfAttachment} />);

    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /report.pdf/i }));

    await waitFor(() =>
      expect(messagingService.requestAttachmentDownloadUrl).toHaveBeenCalledWith(
        'thread-1',
        'att-pdf',
        'test-token',
      ),
    );
    expect(window.open).toHaveBeenCalledWith('https://signed/pdf-1', '_blank', 'noopener,noreferrer');
  });

  it('previews an image inline and mints a fresh URL on every click', async () => {
    vi.mocked(messagingService.requestAttachmentDownloadUrl)
      .mockResolvedValueOnce({ url: 'https://signed/preview', expiresAt: '' })
      .mockResolvedValueOnce({ url: 'https://signed/fresh-1', expiresAt: '' })
      .mockResolvedValueOnce({ url: 'https://signed/fresh-2', expiresAt: '' });
    const user = userEvent.setup();

    render(<AttachmentPreview threadId="thread-1" attachment={imageAttachment} />);

    await waitFor(() =>
      expect(screen.getByAltText('rash.jpg')).toHaveAttribute('src', 'https://signed/preview'),
    );

    await user.click(screen.getByRole('button', { name: /open rash.jpg/i }));
    await waitFor(() => expect(messagingService.requestAttachmentDownloadUrl).toHaveBeenCalledTimes(2));
    expect(window.open).toHaveBeenLastCalledWith('https://signed/fresh-1', '_blank', 'noopener,noreferrer');

    await user.click(screen.getByRole('button', { name: /open rash.jpg/i }));
    await waitFor(() => expect(messagingService.requestAttachmentDownloadUrl).toHaveBeenCalledTimes(3));
    expect(window.open).toHaveBeenLastCalledWith('https://signed/fresh-2', '_blank', 'noopener,noreferrer');
  });

  it('shows an error when the signed URL cannot be minted', async () => {
    vi.mocked(messagingService.requestAttachmentDownloadUrl).mockRejectedValue(
      new ApiError('Attachment not found', 404),
    );
    const user = userEvent.setup();

    render(<AttachmentPreview threadId="thread-1" attachment={pdfAttachment} />);
    await user.click(screen.getByRole('button', { name: /report.pdf/i }));

    expect(await screen.findByText('Attachment not found')).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
  });
});
