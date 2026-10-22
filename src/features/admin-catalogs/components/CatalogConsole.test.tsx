import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { CatalogConsole } from './CatalogConsole';
import * as service from '../../../services/admin-catalogs-service';
import { useAuthStore } from '../../../store/auth-store';
import type { CatalogKind, CatalogPage } from '../../../types/models';

vi.mock('../../../services/admin-catalogs-service');
const page: CatalogPage = { items: [], total: 0, page: 1, pageSize: 10 };
const kinds: CatalogKind[] = ['specialties', 'symptoms', 'medications', 'lab-tests'];

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ accessToken: 'admin-token' } as never);
  vi.mocked(service.listCatalog).mockResolvedValue(page);
  vi.mocked(service.listSymptomMappings).mockResolvedValue([]);
});

describe('catalog tabs', () => {
  it.each(kinds)('loads the %s catalog', async (kind) => {
    const user = userEvent.setup();
    render(<CatalogConsole />);
    await screen.findByText('0 items');
    if (kind !== 'specialties') await user.click(screen.getByRole('tab', { name: kind === 'lab-tests' ? 'Lab tests' : kind[0].toUpperCase() + kind.slice(1) }));
    await waitFor(() => expect(service.listCatalog).toHaveBeenCalledWith(kind, expect.objectContaining({ page: 1 }), 'admin-token', expect.anything()));
  });

  it('opens the symptom mapping editor tab', async () => {
    const user = userEvent.setup();
    render(<CatalogConsole />);
    await user.click(screen.getByRole('tab', { name: 'Symptom mappings' }));
    expect(await screen.findByRole('heading', { name: 'Symptom to specialty weights' })).toBeInTheDocument();
  });
});
