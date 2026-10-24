import type { Meta, StoryObj } from '@storybook/react-vite';
import { Logo } from './Logo';

const meta = {
  title: 'Components/Logo',
  component: Logo,
  argTypes: { size: { control: { type: 'range', min: 20, max: 96, step: 4 } } },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { size: 72 } };