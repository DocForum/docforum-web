import { useState } from 'react';
import type { ReactElement } from 'react';
import { TimePicker } from './TimePicker';
import type { TimePickerProps } from './TimePicker';

type Story = {
  name?: string;
  args: TimePickerProps;
  render: (args: TimePickerProps) => ReactElement;
};

const meta = {
  title: 'Components/TimePicker',
  component: TimePicker,
  parameters: { layout: 'padded' },
};

export default meta;

function Controlled(args: TimePickerProps) {
  const [value, setValue] = useState(args.value);
  return <TimePicker {...args} value={value} onChange={setValue} />;
}

const baseArgs: TimePickerProps = {
  label: 'Appointment time',
  value: '09:30',
  onChange: () => undefined,
  timeZone: 'Europe/London',
  locale: 'en-GB',
  hint: 'Clinic hours are shown in the clinic time zone.',
};

export const Default: Story = {
  args: baseArgs,
  render: (args) => <Controlled {...args} />,
};

export const FifteenMinuteSteps: Story = {
  name: '15-minute steps',
  args: { ...baseArgs, stepMinutes: 15 },
  render: (args) => <Controlled {...args} />,
};

export const LimitedHours: Story = {
  name: 'Clinic hours (09:00–17:00)',
  args: { ...baseArgs, min: '09:00', max: '17:00' },
  render: (args) => <Controlled {...args} />,
};

export const WithError: Story = {
  name: 'Validation error',
  args: { ...baseArgs, value: '', error: 'Choose a time for the appointment.' },
  render: (args) => <Controlled {...args} />,
};
