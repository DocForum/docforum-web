import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import esMessages from '../../../i18n/messages/es.json';
import { render, screen } from '../../../test/render';
import { useAuthStore } from '../../../store/auth-store';
import { OrderVerifyView } from './OrderVerifyView';

describe('OrderVerifyView in Spanish (#251)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'facility-token',
      user: {
        id: 'usr-1',
        email: 'facility@docforum.org',
        role: 'facility',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });
    Object.defineProperty(window.navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('no camera')) },
      writable: true,
      configurable: true,
    });
  });

  it('renders Spanish copy instead of the hard-coded English headings', () => {
    render(
      <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
        <OrderVerifyView />
      </IntlProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Escanear para verificar el pedido' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Introducción manual del código/i })).toBeInTheDocument();
    expect(screen.queryByText('Scan to verify order')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Manual code entry/i })).not.toBeInTheDocument();
  });
});
