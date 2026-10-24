import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { CommandPalette } from './CommandPalette';

const meta = {
  title: 'Components/CommandPalette',
  component: CommandPalette,
  args: {
    open: true,
    onClose: fn(),
    actions: [
      { id: 'appointments', label: 'Open appointments', category: 'navigation', run: fn() },
      { id: 'chart', label: 'Open patient chart', category: 'context', shortcut: '⌘K', run: fn() },
    ],
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const dialog = canvas.getByRole('dialog', { name: 'Command palette' });
    await waitFor(() => expect(dialog).toBeVisible());
    await userEvent.type(canvas.getByRole('combobox'), 'chart');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(args.actions[1].run).toHaveBeenCalledOnce();
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};
export const Closed: Story = { args: { open: false } };