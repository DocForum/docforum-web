import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAttachmentUploader } from './useAttachmentUploader';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as messagingService from '../../../services/messaging-service';
import type { MessageAttachment } from '../../../types/models';

vi.mock('../../../services/messaging-service');
vi.mock('../image-utils', () => ({
  prepareImageForUpload: vi.fn((file: File) => Promise.resolve(file)),
}));

function fakeFile(name: string, type: string, size = 1024): File {
  return { name, type, size } as unknown as File;
}

function attachmentFor(file: File, id: string): MessageAttachment {
  return {
    id,
    messageId: 'm-1',
    fileName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
    kind: file.type === 'application/pdf' ? 'pdf' : 'image',
    createdAt: '2026-10-16T00:00:00.000Z',
  };
}

describe('useAttachmentUploader', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(messagingService.uploadAttachment).mockReset();
  });

  it('uploads a picked file and exposes its server id', async () => {
    const file = fakeFile('rash.jpg', 'image/jpeg');
    vi.mocked(messagingService.uploadAttachment).mockResolvedValue(attachmentFor(file, 'att-1'));

    const { result } = renderHook(() => useAttachmentUploader('thread-1'));
    act(() => result.current.addFiles([file]));

    await waitFor(() => expect(result.current.items[0]?.status).toBe('done'));
    expect(result.current.items[0].progress).toBe(100);
    expect(result.current.uploadedIds).toEqual(['att-1']);
    expect(result.current.isUploading).toBe(false);
    expect(messagingService.uploadAttachment).toHaveBeenCalledTimes(1);
  });

  it('reports upload progress while in flight', async () => {
    const file = fakeFile('rash.jpg', 'image/jpeg');
    let reportProgress: ((percent: number) => void) | undefined;
    let finish: (() => void) | undefined;
    vi.mocked(messagingService.uploadAttachment).mockImplementation((_threadId, f, _token, options) => {
      reportProgress = options?.onProgress;
      return new Promise<MessageAttachment>((resolve) => {
        finish = () => resolve(attachmentFor(f, 'att-2'));
      });
    });

    const { result } = renderHook(() => useAttachmentUploader('thread-1'));
    act(() => result.current.addFiles([file]));

    await waitFor(() => expect(reportProgress).toBeDefined());
    act(() => reportProgress?.(42));
    await waitFor(() => expect(result.current.items[0].progress).toBe(42));

    act(() => finish?.());
    await waitFor(() => expect(result.current.items[0].status).toBe('done'));
  });

  it('rejects a disallowed file without calling the API', () => {
    const { result } = renderHook(() => useAttachmentUploader('thread-1'));
    act(() => result.current.addFiles([fakeFile('payload.svg', 'image/svg+xml')]));

    expect(result.current.items[0].status).toBe('error');
    expect(result.current.items[0].error).toMatch(/supported file/i);
    expect(messagingService.uploadAttachment).not.toHaveBeenCalled();
  });

  it('marks a cancelled upload as cancelled', async () => {
    const file = fakeFile('rash.jpg', 'image/jpeg');
    vi.mocked(messagingService.uploadAttachment).mockImplementation((_threadId, _f, _token, options) => {
      return new Promise<MessageAttachment>((_resolve, reject) => {
        const onAbort = () => reject(new ApiError('Upload cancelled', 0, undefined, { cancelled: true }));
        if (options?.signal?.aborted) {
          onAbort();
          return;
        }
        options?.signal?.addEventListener('abort', onAbort);
      });
    });

    const { result } = renderHook(() => useAttachmentUploader('thread-1'));
    act(() => result.current.addFiles([file]));
    const id = result.current.items[0].id;

    act(() => result.current.cancelUpload(id));
    await waitFor(() => expect(result.current.items[0].status).toBe('cancelled'));
  });

  it('surfaces a failure and succeeds on retry', async () => {
    const file = fakeFile('rash.jpg', 'image/jpeg');
    vi.mocked(messagingService.uploadAttachment)
      .mockRejectedValueOnce(new ApiError('Server exploded', 500))
      .mockResolvedValueOnce(attachmentFor(file, 'att-3'));

    const { result } = renderHook(() => useAttachmentUploader('thread-1'));
    act(() => result.current.addFiles([file]));

    await waitFor(() => expect(result.current.items[0].status).toBe('error'));
    expect(result.current.items[0].error).toBe('Server exploded');
    expect(result.current.hasErrors).toBe(true);

    act(() => result.current.retryUpload(result.current.items[0].id));
    await waitFor(() => expect(result.current.items[0].status).toBe('done'));
    expect(result.current.uploadedIds).toEqual(['att-3']);
  });

  it('caps the number of attachments per message', async () => {
    vi.mocked(messagingService.uploadAttachment).mockImplementation((_threadId, f) =>
      Promise.resolve(attachmentFor(f, `att-${f.name}`)),
    );

    const { result } = renderHook(() => useAttachmentUploader('thread-1'));
    const files = Array.from({ length: 6 }, (_, index) => fakeFile(`photo-${index}.jpg`, 'image/jpeg'));
    act(() => result.current.addFiles(files));

    await waitFor(() => expect(result.current.items).toHaveLength(6));
    const errors = result.current.items.filter((item) => item.status === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toMatch(/up to 5 files/i);
    expect(messagingService.uploadAttachment).toHaveBeenCalledTimes(5);
  });
});
