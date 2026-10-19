import { useState } from 'react';
import type { ReactElement } from 'react';
import { DatePicker } from './DatePicker';
import type { DatePickerProps } from './DatePicker';

type Story = {
  name?: string;
  args: DatePickerProps;
  render: (args: DatePickerProps) => ReactElement;
};

const meta = {
  title: 'Components/DatePicker',
  component: DatePicker,
  parameters: { layout: 'padded' },
};

export default meta;

function Controlled(args: DatePickerProps) {
  const [value, setValue] = useState(args.value);
  return <DatePicker {...args} value={value} onChange={setValue} />;
}

const baseArgs: DatePickerProps = {
  label: 'Appointment date',
  value: '2026-10-19',
  onChange: () => undefined,
  timeZone: 'Europe/London',
  locale: 'en-GB',
  hint: 'Times are shown in your selected clinic time zone.',
};

export const Default: Story = {
  args: baseArgs,
  render: (args) => <Controlled {...args} />,
};

export const WithMinAndMax: Story = {
  name: 'Min and max dates',
  args: { ...baseArgs, min: '2026-10-01', max: '2026-12-31' },
  render: (args) => <Controlled {...args} />,
};

export const DisabledDates: Story = {
  name: 'Disabled dates (weekends)',
  args: {
    ...baseArgs,
    disabledDates: (date) => {
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      return weekday === 0 || weekday === 6;
    },
  },
  render: (args) => <Controlled {...args} />,
};

export const WithError: Story = {
  name: 'Validation error',
  args: { ...baseArgs, value: '', error: 'Date of birth is required.' },
  render: (args) => <Controlled {...args} />,
};
