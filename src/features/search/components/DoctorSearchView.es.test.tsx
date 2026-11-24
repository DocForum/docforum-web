import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import esMessages from '../../../i18n/messages/es.json';
import { render, screen } from '../../../test/render';
import { DoctorSearchView } from './DoctorSearchView';
import * as searchService from '../../../services/search-service';

vi.mock('../../../services/search-service');

function renderSpanish(ui: ReactNode) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

describe('DoctorSearchView (es)', () => {
  it('translates the starting guidance and availability tabs', () => {
    vi.mocked(searchService.searchSymptoms).mockResolvedValue([]);
    vi.mocked(searchService.searchDoctors).mockResolvedValue([]);

    renderSpanish(<DoctorSearchView />);

    expect(screen.getByRole('heading', { name: 'Empieza con un síntoma' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAccessibleName('¿Qué te molesta?');
    expect(screen.getByRole('tab', { name: 'Cualquier momento' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Esta semana' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Hoy' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Any time' })).not.toBeInTheDocument();
  });
});
