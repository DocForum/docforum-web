import type { ReactElement } from 'react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { render, screen } from '../../../test/render';
import esMessages from '../../../i18n/messages/es.json';
import { VerificationChecklist } from './VerificationChecklist';
import { REQUIRED_CREDENTIALS } from '../requirements';
import type { DoctorCredential } from '../../../types/models';

function credential(type: DoctorCredential['type'], status: DoctorCredential['status']): DoctorCredential {
  return {
    id: `dc-${type}-${status}`,
    doctorProfileId: 'dp-1',
    type,
    fileName: `${type}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    status,
    rejectionReason: null,
    submittedAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-05T00:00:00Z',
  };
}

function renderEs(ui: ReactElement) {
  return render(
    <IntlProvider locale="es" defaultLocale="en" messages={esMessages} onError={() => undefined}>
      {ui}
    </IntlProvider>,
  );
}

describe('VerificationChecklist in Spanish', () => {
  it('translates the checklist, ICU progress and item statuses', () => {
    const credentials = [
      credential('medical_license', 'verified'),
      ...REQUIRED_CREDENTIALS.slice(1).map((requirement) => credential(requirement.type, 'pending')),
    ];

    renderEs(<VerificationChecklist credentials={credentials} />);

    expect(screen.getByRole('heading', { name: 'Lista de verificación' })).toBeInTheDocument();
    expect(
      screen.getByText('25% completado — 1 de 4 elementos verificados, 3 pendientes de revisión'),
    ).toBeInTheDocument();
    expect(screen.getByText('Licencia médica')).toBeInTheDocument();
    expect(screen.getByText('Verificado')).toBeInTheDocument();
    expect(screen.getAllByText('Pendiente de revisión')).toHaveLength(3);
  });
});
