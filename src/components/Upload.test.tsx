import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from '../test/render';
import { Upload } from './Upload';
import type { UploadContext } from './Upload';

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];

function makeFile(name = 'scan.png', type = 'image/png', bytes: number[] = PNG_BYTES): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function chooseInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;
}

function selectFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { configurable: true, value: files });
  fireEvent.change(input);
}

describe('Upload', () => {
  it('uploads a valid image, reports progress and calls onUploaded', async () => {
    const uploadFile = vi.fn(async (_file: File, context: UploadContext) => {
      context.onProgress(42);
      return { id: 'uploaded-1' };
    });
    const onUploaded = vi.fn();

    const { container } = render(
      <Upload endpoint="/uploads" uploadFile={uploadFile} onUploaded={onUploaded} />,
    );

    selectFiles(chooseInput(container), [makeFile()]);

    expect(await screen.findByText('scan.png')).toBeInTheDocument();
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith({ id: 'uploaded-1' }, expect.any(File)));
    expect(screen.getByText('Uploaded')).toBeInTheDocument();

    const progress = screen.getByLabelText(/Upload progress for scan.png/i) as HTMLProgressElement;
    expect(progress.value).toBe(100);
    expect(uploadFile).toHaveBeenCalledTimes(1);
  });

  it('rejects an oversized file before uploading', async () => {
    const uploadFile = vi.fn();
    const { container } = render(
      <Upload uploadFile={uploadFile} maxSizeBytes={4} />,
    );

    selectFiles(chooseInput(container), [makeFile('big.png', 'image/png', [...PNG_BYTES, 1, 2, 3, 4])]);

    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/i);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('rejects a file whose signature does not match the accepted type', async () => {
    const uploadFile = vi.fn();
    const { container } = render(
      <Upload uploadFile={uploadFile} accept="image/*" />,
    );

    const disguised = new File([new TextEncoder().encode('not an image')], 'fake.png', {
      type: 'image/png',
    });
    selectFiles(chooseInput(container), [disguised]);

    expect(await screen.findByRole('alert')).toHaveTextContent(/not supported/i);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('cancels an in-flight upload', async () => {
    const uploadFile = vi.fn(
      (_file: File, context: UploadContext) =>
        new Promise((_resolve, reject) => {
          context.onProgress(10);
          context.signal.addEventListener('abort', () => {
            reject(new DOMException('Upload cancelled', 'AbortError'));
          });
        }),
    );

    const user = userEvent.setup();
    const { container } = render(<Upload uploadFile={uploadFile} />);

    selectFiles(chooseInput(container), [makeFile()]);

    await user.click(await screen.findByRole('button', { name: /^cancel$/i }));

    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(uploadFile).toHaveBeenCalledTimes(1);
  });

  it('retries a failed upload', async () => {
    const uploadFile = vi.fn<(file: File, context: UploadContext) => Promise<unknown>>();
    uploadFile
      .mockRejectedValueOnce(new Error('Upload failed'))
      .mockResolvedValueOnce({ id: 'retried' });

    const user = userEvent.setup();
    const { container } = render(<Upload uploadFile={uploadFile} />);

    selectFiles(chooseInput(container), [makeFile()]);

    expect(await screen.findByRole('alert')).toHaveTextContent('Upload failed');
    await user.click(screen.getByRole('button', { name: /^retry$/i }));

    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Uploaded')).toBeInTheDocument();
  });

  it('uploads only the first dropped file when multiple is false', async () => {
    const uploadFile = vi.fn(async () => ({ id: 'single' }));
    render(<Upload uploadFile={uploadFile} />);

    fireEvent.drop(screen.getByTestId('upload-dropzone'), {
      dataTransfer: { files: [makeFile('one.png'), makeFile('two.png')] },
    });

    expect(await screen.findByText('one.png')).toBeInTheDocument();
    expect(screen.queryByText('two.png')).not.toBeInTheDocument();
    expect(uploadFile).toHaveBeenCalledTimes(1);
  });

  it('reports a missing endpoint instead of making an upload request', async () => {
    const { container } = render(<Upload />);

    selectFiles(chooseInput(container), [makeFile()]);

    expect(await screen.findByRole('alert')).toHaveTextContent('No upload endpoint configured.');
  });

  it('keeps the completed upload state if the onUploaded callback throws', async () => {
    const uploadFile = vi.fn(async () => ({ id: 'uploaded-2' }));
    const onUploaded = vi.fn(() => {
      throw new Error('consumer callback failed');
    });
    const { container } = render(<Upload uploadFile={uploadFile} onUploaded={onUploaded} />);

    selectFiles(chooseInput(container), [makeFile()]);

    expect(await screen.findByText('Uploaded')).toBeInTheDocument();
    expect(onUploaded).toHaveBeenCalledOnce();
  });

  it('uses the fallback message for non-Error transport rejections', async () => {
    const uploadFile = vi.fn(async () => Promise.reject('transport failed'));
    const { container } = render(<Upload uploadFile={uploadFile} />);

    selectFiles(chooseInput(container), [makeFile()]);

    expect(await screen.findByRole('alert')).toHaveTextContent('Upload failed.');
  });

  it('accepts a dropped file and exposes keyboard-operable picker buttons', async () => {
    const uploadFile = vi.fn(async () => ({ id: 'dropped' }));
    const { container } = render(<Upload uploadFile={uploadFile} />);

    expect(screen.getByRole('button', { name: /choose files/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /take photo/i })).toBeEnabled();

    const zone = screen.getByTestId('upload-dropzone');
    fireEvent.drop(zone, { dataTransfer: { files: [makeFile('dropped.png')] } });

    expect(await screen.findByText('dropped.png')).toBeInTheDocument();
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(chooseInput(container)).toBeInTheDocument();
  });
});
