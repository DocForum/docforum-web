import { Upload } from './Upload';

export default {
  title: 'Components/Upload',
  component: Upload,
};

export const Default = {
  args: {
    endpoint: '/uploads',
    label: 'Upload a file',
    accept: 'image/*,application/pdf',
  },
};

export const ImagesOnly = {
  args: {
    endpoint: '/uploads',
    label: 'Upload a photo',
    accept: 'image/*',
    capture: 'environment' as const,
  },
};

export const WithoutCamera = {
  args: {
    endpoint: '/uploads',
    label: 'Upload a lab result',
    accept: 'application/pdf',
    capture: false as const,
  },
};
