import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../test/render';
import { Upload } from './Upload';
import type { UploadHelpers, UploadResult } from './Upload';

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];

function pngFile(name = 'scan.png', extraBytes = 32): File {
  return new File([new Uint8Array([...PNG_HEAD, ...new Array(extraBytes).fill(1)])], name, {
    type: 'image/png',
  });
}

function controlledUpload() {
  const calls: {
    file: File;
    helpers: UploadHelpers;
    resolve: (result: UploadResult) => void;
    reject: (error: unknown) => void;
  }[] = [];

  const uploadFile = vi.fn((file: File, helpers: UploadHelpers) => {
    return new Promise<UploadResult>((resolve, reject) => {
      helpers.signal.addEventListener('abort', () =>
        reject(new DOMException('Upload cancelled', 'AbortError')),
      );
      calls.push({ file, helpers, resolve, reject });
    });
  });

  return { uploadFile, calls };
}

describe('Upload', () => {
  it('uploads a valid image and reports success', async () => {
    const user = userEvent.setup();
    const uploadFile = vi.fn().mockResolvedValue({ id: 'file-1', url: 'https://cdn.test/scan.png' });
    const onUploaded = vi.fn();

    render(<Upload uploadFile={uploadFile} onUploaded={onUploaded} accessToken="token" />);
    await user.upload(screen.getByTestId('upload-input'), pngFile());

    expect(await screen.findByText('Uploaded')).toBeInTheDocument();
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(onUploaded).toHaveBeenCalledWith(expect.any(File), {
      id: 'file-1',
      url: 'https://cdn.test/scan.png',
    });
    expect(within(screen.getByRole('list', { name: 'Selected files' })).getByText('scan.png')).toBeInTheDocument();
  });

  it('announces progress and exposes it as a progressbar', async () => {
    const user = userEvent.setup();
    const { uploadFile, calls } = controlledUpload();

    render(<Upload uploadFile={uploadFile} />);
    await user.upload(screen.getByTestId('upload-input'), pngFile());

    await waitFor(() => expect(calls).toHaveLength(1));
    calls[0].helpers.onProgress({ loaded: 45, total: 100, percent: 45 });

    const progress = await screen.findByRole('progressbar', { name: /upload progress for scan\.png/i });
    expect(progress).toHaveAttribute('value', '45');
    expect(screen.getByText(/Uploading 45%/)).toBeInTheDocument();

    calls[0].resolve({ id: 'file-1' });
    expect(await screen.findByText('Uploaded')).toBeInTheDocument();
  });

  it('cancels an in-flight upload and can retry it', async () => {
    const user = userEvent.setup();
    const { uploadFile, calls } = controlledUpload();

    render(<Upload uploadFile={uploadFile} />);
    await user.upload(screen.getByTestId('upload-input'), pngFile());

    await waitFor(() => expect(calls).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(calls[0].helpers.signal.aborted).toBe(true);
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();

    const retry = screen.getByRole('button', { name: 'Retry' });
    await user.click(retry);
    await waitFor(() => expect(calls).toHaveLength(2));

    calls[1].resolve({ id: 'file-2' });
    expect(await screen.findByText('Uploaded')).toBeInTheDocument();
    expect(uploadFile).toHaveBeenCalledTimes(2);
  });

  it('rejects a file whose bytes do not match its claimed image type', async () => {
    const user = userEvent.setup();
    const uploadFile = vi.fn().mockResolvedValue({ id: 'file-1' });
    const spoofed = new File([new TextEncoder().encode('this is not a png')], 'evil.png', {
      type: 'image/png',
    });

    render(<Upload uploadFile={uploadFile} />);
    await user.upload(screen.getByTestId('upload-input'), spoofed);

    expect(await screen.findByRole('alert')).toHaveTextContent(/file type is not accepted/i);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('rejects files larger than maxBytes before reading them', async () => {
    const user = userEvent.setup();
    const file = new File([new Uint8Array(2048)], 'big.pdf', { type: 'application/pdf' });

    render(<Upload uploadFile={vi.fn()} maxBytes={1024} />);
    await user.upload(screen.getByTestId('upload-input'), file);

    expect(await screen.findByRole('alert')).toHaveTextContent(/larger than 1\.0 KB/i);
  });

  it('accepts text formats matched by extension', async () => {
    const user = userEvent.setup();
    const uploadFile = vi.fn().mockResolvedValue({ id: 'file-1' });
    const csv = new File(['name,value\nana,1'], 'results.csv', { type: 'text/csv' });

    render(<Upload uploadFile={uploadFile} accept=".csv" />);
    await user.upload(screen.getByTestId('upload-input'), csv);

    expect(await screen.findByText('Uploaded')).toBeInTheDocument();
    expect(uploadFile).toHaveBeenCalledWith(csv, expect.anything());
  });

  it('downscales images before uploading them', async () => {
    const user = userEvent.setup();
    const uploadFile = vi.fn().mockResolvedValue({ id: 'file-1' });
    const resized = pngFile('scan-resized.png');
    const downscale = vi.fn().mockResolvedValue(resized);

    render(<Upload uploadFile={uploadFile} downscale={downscale} />);
    await user.upload(screen.getByTestId('upload-input'), pngFile());

    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1));
    expect(downscale).toHaveBeenCalledWith(expect.any(File), {});
    expect(uploadFile.mock.calls[0][0]).toBe(resized);
  });

  it('exposes a mobile camera input with environment capture', () => {
    render(<Upload uploadFile={vi.fn()} />);
    const camera = screen.getByTestId('upload-camera-input');
    expect(camera).toHaveAttribute('capture', 'environment');
    expect(camera).toHaveAttribute('accept', 'image/*');
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument();
  });

  it('keeps only the first file when multiple is false', async () => {
    const user = userEvent.setup();
    const uploadFile = vi.fn().mockResolvedValue({ id: 'file-1' });

    render(<Upload uploadFile={uploadFile} multiple={false} />);
    await user.upload(screen.getByTestId('upload-input'), [pngFile('a.png'), pngFile('b.png')]);

    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/b\.png/)).not.toBeInTheDocument();
  });

  it('removes a file from the list and revokes its preview', async () => {
    const user = userEvent.setup();
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const onRemove = vi.fn();

    render(<Upload uploadFile={vi.fn().mockResolvedValue({ id: 'file-1' })} onRemove={onRemove} />);
    await user.upload(screen.getByTestId('upload-input'), pngFile());
    await screen.findByText('Uploaded');

    await user.click(screen.getByRole('button', { name: /remove scan\.png/i }));

    expect(screen.queryByRole('list', { name: 'Selected files' })).not.toBeInTheDocument();
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalled();
  });
});
