import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: [{ from: '../public', to: '/' }],
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    base: process.env.STORYBOOK_BASE ?? '/',
  }),
};

export default config;