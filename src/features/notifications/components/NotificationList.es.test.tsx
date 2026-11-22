import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import esMessages from '../../../i18n/messages/es.json';
import { render, screen } from '../../../test/render';
import { makeNotification } from '../../../test/factories';
import { NotificationList } from './NotificationList';

function renderSpanish(ui: ReactNode) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

describe('NotificationList (es)', () => {
  it('translates the list chrome, category chip and row actions', () => {
    renderSpanish(
      <NotificationList
        role="patient"
        unreadCount={1}
        notifications={[
          makeNotification({ id: 'n1', kind: 'appointment_booked', title: 'Cita confirmada' }),
        ]}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Tus notificaciones' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar todas como leídas' })).toBeInTheDocument();
    expect(screen.getByText('Cita')).toBeInTheDocument();
    expect(screen.getByText('Sin leer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar «Cita confirmada» como leída' })).toBeInTheDocument();
  });

  it('translates the empty state', () => {
    renderSpanish(
      <NotificationList
        role="patient"
        unreadCount={0}
        notifications={[]}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Estás al día' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a tu panel' })).toBeInTheDocument();
  });
});
