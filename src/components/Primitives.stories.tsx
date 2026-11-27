import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { FormError } from './FormError';
import { Spinner } from './Spinner';
import { TextField } from './TextField';

const meta = {
  title: 'Components/Design system',
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Buttons: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
      <Button>Continue</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="danger">Delete</Button>
      <Button loading>Saving</Button>
      <Button disabled>Unavailable</Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Continue' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Saving' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
  },
};

export const TextFields: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: '28rem' }}>
      <TextField label="Email address" type="email" placeholder="you@example.test" />
      <TextField label="Phone number" hint="Include your country code." />
      <TextField label="Date of birth" error="Enter a valid date." />
      <FormError message="We could not save your changes. Try again." />
      <div role="status" aria-label="Loading available appointments"><Spinner /></div>
    </div>
  ),
};

function DialogExample() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="storybook-dialog-title"
        overlayClassName="storybook-dialog-overlay"
        panelClassName="storybook-dialog-panel"
      >
        <h2 id="storybook-dialog-title">Confirm appointment</h2>
        <p>Review the time before confirming your appointment.</p>
        <Button onClick={() => setOpen(false)}>Close</Button>
      </Dialog>
    </>
  );
}

export const AccessibleDialog: Story = {
  render: () => <DialogExample />,
};
