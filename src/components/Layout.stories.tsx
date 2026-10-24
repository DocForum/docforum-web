import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';

const meta = {
  title: 'Components/Layout',
  component: Layout,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Routes>
          <Route element={<Story />}>
            <Route index element={<p>Page content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Layout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedOut: Story = {};