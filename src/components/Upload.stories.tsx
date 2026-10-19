import type { ReactElement } from 'react';
import { Upload } from './Upload';
import type { UploadFileFn, UploadProps } from './Upload';

type Story = {
  name?: string;
  args: UploadProps;
  render: (args: UploadProps) => ReactElement;
};

const meta = {
  title: 'Components/Upload',
  component: Upload,
  parameters: { layout: 'padded' },
};

export default meta;

// Simulates a throttled connection so progress, cancel and retry can be
// exercised without a backend.
const demoUpload: UploadFileFn = (file, { onProgress, signal }) =>
  new Promise((resolve, reject) => {
    let loaded = 0;
    const timer = window.setInterval(() => {
      loaded = Math.min(100, loaded + 8);
      onProgress({ loaded, total: 100, percent: loaded });
      if (loaded === 100) {
        window.clearInterval(timer);
        resolve({ id: 'demo-file', url: URL.createObjectURL(file) });
      }
    }, 250);
    signal.addEventListener('abort', () => {
      window.clearInterval(timer);
      reject(new DOMException('Upload cancelled', 'AbortError'));
    });
  });

const baseArgs: UploadProps = {
  label: 'Lab result upload',
  hint: 'PDF or a photo of the result. Patient identifiers are never shown in previews.',
  accept: 'image/*,application/pdf',
  maxBytes: 10 * 1024 * 1024,
  uploadFile: demoUpload,
};

export const Default: Story = {
  args: baseArgs,
  render: (args) => <Upload {...args} />,
};

export const ImagesOnly: Story = {
  name: 'Images only (camera capture)',
  args: { ...baseArgs, label: 'Fulfilment proof', accept: 'image/*' },
  render: (args) => <Upload {...args} />,
};

export const SingleFile: Story = {
  name: 'Single file',
  args: { ...baseArgs, label: 'Credential upload', multiple: false },
  render: (args) => <Upload {...args} />,
};

export const Disabled: Story = {
  args: { ...baseArgs, disabled: true },
  render: (args) => <Upload {...args} />,
};
