import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, within } from 'storybook/test';
import { RequireAuth } from './RequireAuth';

const meta = {
  title: 'Components/RequireAuth',
  component: RequireAuth,
  args: { allowedRoles: ['patient'], children: <p>Protected patient content</p> },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Story />} />
          <Route path="/login" element={<p>Sign in required</p>} />
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof RequireAuth>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RedirectsWhenSignedOut: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Sign in required')).toBeVisible();
  },
};