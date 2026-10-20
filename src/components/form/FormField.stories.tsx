import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormProvider, useForm } from 'react-hook-form';
import { expect, userEvent, within } from 'storybook/test';
import { FormField } from './FormField';

function FormFieldExample() {
  const methods = useForm<{ email: string }>({ defaultValues: { email: '' } });
  return (
    <FormProvider {...methods}>
      <FormField name="email" label="Email address" type="email" />
    </FormProvider>
  );
}

const meta = {
  title: 'Components/FormField',
  component: FormFieldExample,
} satisfies Meta<typeof FormFieldExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Email address' });
    await userEvent.type(input, 'patient@example.test');
    await expect(input).toHaveValue('patient@example.test');
  },
};