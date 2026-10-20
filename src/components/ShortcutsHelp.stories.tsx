import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ShortcutsHelp } from './ShortcutsHelp';

const meta = {
  title: 'Components/ShortcutsHelp',
  component: ShortcutsHelp,
  args: { open: true, onClose: () => {}, bindings: {} },
} satisfies Meta<typeof ShortcutsHelp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};
export const Closed: Story = { args: { open: false } };