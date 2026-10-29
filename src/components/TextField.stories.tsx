import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { TextField } from './TextField';

const meta = {
  title: 'Components/TextField',
  component: TextField,
  args: { label: 'Email address', type: 'email', placeholder: 'name@example.test' },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Email address' });
    await userEvent.type(input, 'patient@example.test');
    await expect(input).toHaveValue('patient@example.test');
  },
};
export const Invalid: Story = { args: { error: 'Enter a valid email address.' } };
export const Required: Story = { args: { required: true } };
export const Disabled: Story = { args: { disabled: true, value: 'patient@example.test' } };