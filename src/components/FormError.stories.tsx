import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormError } from './FormError';

const meta = {
  title: 'Components/FormError',
  component: FormError,
} satisfies Meta<typeof FormError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = { args: { message: 'We could not save your changes. Try again.' } };
export const Hidden: Story = { args: { message: null } };