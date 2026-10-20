import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ShortcutsHelp } from './ShortcutsHelp';

const meta = {
  title: 'Components/ShortcutsHelp',
  component: ShortcutsHelp,
  args: { open: true, onClose: fn(), bindings: {} },
} satisfies Meta<typeof ShortcutsHelp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const dialog = canvas.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await waitFor(() => expect(dialog).toBeVisible());
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};
export const Closed: Story = { args: { open: false } };