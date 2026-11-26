import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { FormProvider, useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { Link, Route, Routes } from 'react-router-dom';
import { Combobox } from './Combobox';
import { CommandPalette } from './CommandPalette';
import { ErrorBoundary } from './ErrorBoundary';
import { Flag } from './Flag';
import { FormField } from './form/FormField';
import { FulfillmentStatusBadge } from './FulfillmentStatusBadge';
import { HashRedirectShim } from './HashRedirectShim';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Layout } from './Layout';
import { LiveRegion } from './LiveRegion';
import { Logo } from './Logo';
import { OfflineBanner } from './OfflineBanner';
import { PageHeader } from './PageHeader';
import { PrintLayout } from './PrintLayout';
import { PublicCallout, PublicPage } from './PublicPage';
import { RateLimitNotice } from './RateLimitNotice';
import { RequireFlag } from './RequireFlag';
import { SessionTimeoutController } from './SessionTimeoutController';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';
import { ShortcutsHelp } from './ShortcutsHelp';
import { UpdatePrompt } from './UpdatePrompt';
import { RoleGate } from '../routes/RoleGate';
import { useRateLimitStore } from '../store/rate-limit-store';
import { DEFAULT_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

const meta = {
  title: 'Components/Shared catalogue',
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

function ComboboxExample() {
  const [inputValue, setInputValue] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const options = [
    { id: 'cardiology', label: 'Cardiology', hint: 'Heart and circulation' },
    { id: 'dermatology', label: 'Dermatology', hint: 'Skin, hair and nails' },
  ];
  return (
    <div style={{ maxWidth: 440 }}>
      <Combobox
        id="storybook-specialty"
        label="Specialty"
        selectedOptionId={selectedId ?? ''}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSelect={(id) => {
          setSelectedId(id);
          if (id) setInputValue(options.find((option) => option.id === id)?.label ?? '');
          else setInputValue('');
        }}
        options={options}
        helpText="Choose a specialty to find a clinician."
      />
    </div>
  );
}

export const ComboboxInteraction: Story = {
  render: () => <ComboboxExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox', { name: 'Specialty' });
    await userEvent.type(input, 'cardio');
    await userEvent.click(await canvas.findByRole('option', { name: /Cardiology/ }));
    await expect(input).toHaveValue('Cardiology');
  },
};

function CommandPaletteExample() {
  const [open, setOpen] = useState(true);
  const [ran, setRan] = useState(false);
  return (
    <>
      <p role="status">{ran ? 'Command completed.' : 'The command palette is open.'}</p>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        actions={[
          { id: 'appointments', label: 'Open appointments', category: 'navigation', shortcut: 'G A', run: () => setRan(true) },
          { id: 'messages', label: 'Open messages', category: 'navigation', shortcut: 'G M', run: () => setRan(true) },
        ]}
      />
    </>
  );
}

export const CommandPaletteKeyboard: Story = {
  render: () => <CommandPaletteExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole('combobox', { name: 'Search commands and patients' });
    await userEvent.type(search, 'appointments');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(canvas.getByRole('status')).toHaveTextContent('Command completed.');
  },
};

export const PageHeaderWithBreadcrumbs: Story = {
  render: () => (
    <PageHeader
      title="Order details"
      breadcrumbs={[{ label: 'Patient home', to: '/patient' }, { label: 'Orders', to: '/patient/orders' }, { label: 'Order details' }]}
      actions={<Link to="/patient/orders">Back to orders</Link>}
    />
  ),
};

export const LayoutShell: Story = {
  render: () => (
    <Routes>
      <Route element={<Layout />}>
        <Route path="*" element={<main><h1>Page content</h1><p>The shared shell keeps navigation consistent.</p></main>} />
      </Route>
    </Routes>
  ),
};

export const BrandMark: Story = {
  render: () => <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Logo size={48} /><span>DocForum</span></div>,
};

export const LanguagePreference: Story = {
  render: () => <LanguageSwitcher />,
};

export const FulfillmentStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      <FulfillmentStatusBadge status="unfulfilled" />
      <FulfillmentStatusBadge status="partially_fulfilled" />
      <FulfillmentStatusBadge status="fulfilled" />
      <FulfillmentStatusBadge status="rejected" />
    </div>
  ),
};

export const LiveStatusAnnouncement: Story = {
  render: () => <><LiveRegion message="Appointment time updated." /><p>Appointment updated for Friday at 10:30.</p></>,
};

export const PrintDocument: Story = {
  render: () => (
    <div style={{ maxWidth: 680 }}>
      <PrintLayout title="Appointment summary">
        <h2>Follow-up appointment</h2>
        <p>Friday, 10:30 — Dr. Demo Doctor</p>
        <p>Your existing intake details are attached to this visit.</p>
      </PrintLayout>
    </div>
  ),
};

export const PublicInformationPage: Story = {
  render: () => (
    <div style={{ maxWidth: 760 }}>
      <PublicPage path="/faq">
        <p>Find answers about booking, appointments and care records.</p>
        <PublicCallout title="Preview information" tone="notice">
          This public information page is available without signing in.
        </PublicCallout>
      </PublicPage>
    </div>
  ),
};

export const RouteHashCompatibility: Story = {
  render: () => <><HashRedirectShim /><p>Legacy hash links are normalized on app startup.</p></>,
};

export const SignedOutRouteGuard: Story = {
  render: () => (
    <Routes>
      <Route element={<RoleGate allowedRoles={['admin']} />}>
        <Route index element={<p>Admin-only content</p>} />
      </Route>
      <Route path="/login" element={<p>Redirected to sign in</p>} />
    </Routes>
  ),
};

export const FeatureFlagOff: Story = {
  render: () => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Flag name="storybook-disabled-flag" fallback={<p>The feature is currently off.</p>}>
        <p>Flagged feature content</p>
      </Flag>
    </QueryClientProvider>
  ),
};

export const FeatureRouteGuard: Story = {
  render: () => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RequireFlag name="storybook-disabled-flag"><p>Flagged route content</p></RequireFlag>
    </QueryClientProvider>
  ),
};

function FormFieldExample() {
  const form = useForm<{ email: string }>({ defaultValues: { email: '' } });
  return (
    <FormProvider {...form}>
      <form style={{ maxWidth: 440 }}>
        <FormField name="email" label="Email address" type="email" hint="Use the address on your account." />
      </form>
    </FormProvider>
  );
}

export const FormFieldStates: Story = {
  render: () => <FormFieldExample />,
};

function OfflineExample() {
  useEffect(() => {
    onlineManager.setOnline(false);
    return () => onlineManager.setOnline(true);
  }, []);
  return <OfflineBanner />;
}

export const OfflineNotice: Story = {
  render: () => <OfflineExample />,
};

function RateLimitExample() {
  useEffect(() => {
    useRateLimitStore.getState().notify(45);
    return () => useRateLimitStore.getState().clear();
  }, []);
  return <RateLimitNotice />;
}

export const RateLimitNoticeVisible: Story = {
  render: () => <RateLimitExample />,
};

export const ServiceWorkerUpdate: Story = {
  render: () => (
    <UpdatePrompt needRefresh onReload={() => {}} onDismiss={() => {}} />
  ),
};

export const OfflineReady: Story = {
  render: () => (
    <UpdatePrompt needRefresh={false} offlineReady onReload={() => {}} onDismiss={() => {}} />
  ),
};

export const SessionTimeoutWarningWithUnsavedChanges: Story = {
  render: () => (
    <SessionTimeoutWarning
      open
      secondsRemaining={45}
      unsavedChanges
      onStaySignedIn={() => {}}
      onSignOutNow={() => {}}
    />
  ),
};

export const KeyboardShortcutsHelp: Story = {
  render: () => (
    <ShortcutsHelp
      open
      onClose={() => {}}
      bindings={Object.fromEntries(DEFAULT_SHORTCUTS.map(({ action }) => [action, '']))}
    />
  ),
};

export const ErrorBoundaryHealthyState: Story = {
  render: () => (
    <ErrorBoundary level="section">
      <p>The section is rendering normally.</p>
    </ErrorBoundary>
  ),
};

export const SessionTimeoutControllerSignedOut: Story = {
  render: () => <SessionTimeoutController />,
};
