import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { act, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import esMessages from '../i18n/messages/es.json';
import { render, screen } from '../test/render';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { SessionRestoring } from './SessionRestoring';
import { useAuthStore } from '../store/auth-store';

function renderSpanish(ui: ReactNode) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

describe('app shell (es)', () => {
  it('translates the skip link, menu toggle, drawer controls and footer', () => {
    useAuthStore.setState({ accessToken: null, user: null });

    renderSpanish(<Layout />);

    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    const menu = screen.getByRole('button', { name: 'Abrir o cerrar el menú de navegación' });
    expect(screen.queryByRole('navigation', { name: 'Navegación móvil' })).not.toBeInTheDocument();
    fireEvent.click(menu);
    expect(screen.getByRole('navigation', { name: 'Navegación móvil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar el menú de navegación' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar el menú de navegación' }));
    expect(screen.queryByRole('navigation', { name: 'Navegación móvil' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacidad y análisis' })).toHaveAttribute(
      'href',
      '/privacy/analytics',
    );
  });

  it('translates the page header breadcrumbs', () => {
    renderSpanish(<PageHeader title="Título" />);

    expect(screen.getByRole('navigation', { name: 'Ruta de navegación' })).toBeInTheDocument();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
  });

  it('translates the route fallback while the session is resolving', () => {
    act(() => useAuthStore.setState({ status: 'resolving' }));
    renderSpanish(<SessionRestoring />);

    expect(screen.getByText(/restaurando tu sesión/i)).toBeInTheDocument();
  });
});
