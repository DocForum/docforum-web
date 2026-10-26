import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { UpdatePrompt } from './UpdatePrompt';

function renderPrompt(props: Partial<React.ComponentProps<typeof UpdatePrompt>> = {}) {
  const onReload = vi.fn();
  const onDismiss = vi.fn();
  render(
    <IntlProvider locale="en" defaultLocale="en" messages={{}} onError={() => undefined}>
      <UpdatePrompt needRefresh={false} onReload={onReload} onDismiss={onDismiss} {...props} />
    </IntlProvider>,
  );
  return { onReload, onDismiss };
}

describe('UpdatePrompt', () => {
  it('renders nothing when there is nothing to announce', () => {
    renderPrompt();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('offers an explicit reload when a new version is waiting', () => {
    const { onReload, onDismiss } = renderPrompt({ needRefresh: true });

    expect(screen.getByText('A new version of DocForum is available.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('announces offline readiness without a reload action', () => {
    renderPrompt({ offlineReady: true });

    expect(screen.getByText('DocForum is ready to load offline.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
  });
});
