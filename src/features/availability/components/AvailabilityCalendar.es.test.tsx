import { useState } from 'react';
import type { ReactElement } from 'react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/render';
import esMessages from '../../../i18n/messages/es.json';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { buildWeekDates } from '../calendar';
import type { AvailabilitySlot } from '../../../types/models';

const TIME_ZONE = 'Africa/Lagos';
const DATES = buildWeekDates('2026-10-19');

function slot(id: string, day: string, hour: number, status: AvailabilitySlot['status']): AvailabilitySlot {
  const start = `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`;
  return {
    id,
    doctorProfileId: 'doctor-1',
    status,
    startTime: start,
    endTime: `${day}T${String(hour + 1).padStart(2, '0')}:00:00.000Z`,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

const SLOTS: AvailabilitySlot[] = [
  slot('s1', '2026-10-19', 8, 'open'),
  slot('s3', '2026-10-19', 10, 'booked'),
  slot('h1', '2026-10-20', 8, 'held'),
];

function renderEs(ui: ReactElement) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

function Harness({ selectedSlotIds = [] }: { selectedSlotIds?: string[] }) {
  const [ids, setIds] = useState(selectedSlotIds);
  return (
    <AvailabilityCalendar
      slots={SLOTS}
      dates={DATES}
      view="week"
      timeZone={TIME_ZONE}
      selectedSlotIds={ids}
      onSelectionChange={setIds}
      onAction={vi.fn()}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
    />
  );
}

describe('AvailabilityCalendar in Spanish', () => {
  it('translates the calendar chrome, legend and actions', () => {
    renderEs(<Harness />);

    expect(screen.getByRole('region', { name: 'Calendario de disponibilidad' })).toBeInTheDocument();
    expect(screen.getByText(/Todas las horas en/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Clave de estados de los espacios' })).toHaveTextContent(
      'AbiertoBloqueado o retenidoReservado',
    );
    expect(screen.getByRole('button', { name: 'Bloquear rango seleccionado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar espacios abiertos seleccionados' })).toBeInTheDocument();
  });

  it('uses Intl for weekday names and translates cell statuses', () => {
    renderEs(<Harness />);

    expect(screen.getByRole('gridcell', { name: /lunes, 19 de octubre, 09:00-10:00, Abierto/ })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: /Bloqueado o retenido/ })).toBeInTheDocument();
  });

  it('translates the ICU selection summary with its counts', () => {
    renderEs(<Harness selectedSlotIds={['s1', 's3']} />);

    expect(
      screen.getByText('2 seleccionados: 1 abierto, 0 bloqueados o retenidos, 1 reservado.'),
    ).toBeInTheDocument();
  });
});
