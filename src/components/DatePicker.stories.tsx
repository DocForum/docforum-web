// CSF 3 stories for DatePicker and TimePicker (issue #114). Same local CSF
// stubs as DataTable.stories.tsx, so the file typechecks without
// @storybook/react; Storybook picks it up once installed (issue #97).
import { useState, type ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { TimeZoneProvider } from '../i18n/TimeZoneProvider';
import { DatePicker, type DatePickerProps } from './DatePicker';
import { TimePicker, type TimePickerProps } from './TimePicker';

// ─── Local CSF stubs (remove once @storybook/react is installed) ────────

interface Meta {
  title: string;
  component: typeof DatePicker;
  decorators: ((story: () => ReactNode) => ReactNode)[];
  tags: string[];
}

type StoryObj = { render: () => ReactNode };

const withProviders = (locale: string) => (story: () => ReactNode) => (
  <IntlProvider locale={locale} defaultLocale="en" messages={{}} onError={() => undefined}>
    <TimeZoneProvider>{story()}</TimeZoneProvider>
  </IntlProvider>
);

const meta: Meta = {
  title: 'Components/DatePicker',
  component: DatePicker,
  decorators: [withProviders('en-US')],
  tags: ['autodocs'],
};

export default meta;

function ControlledDate(props: Omit<DatePickerProps, 'value' | 'onChange'> & { initial?: string }) {
  const { initial = '', ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <div style={{ maxWidth: '22rem', minHeight: '28rem' }}>
      <DatePicker {...rest} value={value} onChange={setValue} />
      <p>Value: {value || '—'}</p>
    </div>
  );
}

function ControlledTime(props: Omit<TimePickerProps, 'value' | 'onChange'> & { initial?: string }) {
  const { initial = '', ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <div style={{ maxWidth: '16rem', minHeight: '20rem' }}>
      <TimePicker {...rest} value={value} onChange={setValue} />
      <p>Value: {value || '—'}</p>
    </div>
  );
}

// ─── Stories ─────────────────────────────────────────────────────────────

export const Default: StoryObj = {
  render: () => <ControlledDate label="Appointment date" />,
};

export const WithValue: StoryObj = {
  render: () => <ControlledDate label="Appointment date" initial="2026-11-25" />,
};

/** Booking window: only the next 30 days, weekends unavailable. */
export const MinMaxAndDisabledDays: StoryObj = {
  render: () => (
    <ControlledDate
      label="Visit date"
      min="2026-11-19"
      max="2026-12-19"
      isDateDisabled={(iso) => {
        const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
        return day === 0 || day === 6;
      }}
      hint="Weekdays only, within the next 30 days."
    />
  ),
};

export const ErrorFromForm: StoryObj = {
  render: () => <ControlledDate label="Date of birth" required error="Date of birth is required." />,
};

/** Spanish: day-first entry and Monday-first weeks. */
export const SpanishLocale: StoryObj = {
  render: () => withProviders('es')(() => <ControlledDate label="Fecha" initial="2026-11-25" />),
};

export const ExplicitTimeZone: StoryObj = {
  render: () => <ControlledDate label="Closure date" timeZone="Africa/Lagos" />,
};

export const Time: StoryObj = {
  render: () => <ControlledTime label="Opens" initial="09:00" timeZone="Africa/Lagos" />,
};

export const TimeWithBounds: StoryObj = {
  render: () => <ControlledTime label="Quiet hours start" min="18:00" max="23:30" step={30} />,
};

export const TimeSpanish: StoryObj = {
  render: () => withProviders('es')(() => <ControlledTime label="Hora" initial="14:30" />),
};
