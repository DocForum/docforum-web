import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { useAuthStore } from '../../../store/auth-store';
import * as settingsService from '../../../services/facility-settings-service';
import type { CatalogItem, FacilityPrice, FacilitySettings } from '../../../types/models';
import { emptyOpeningHours } from '../validation';
import { LocationContactEditor } from './LocationContactEditor';
import { PriceListEditor } from './PriceListEditor';

vi.mock('../../../services/facility-settings-service');

const now = Date.now();
const daysFromNow = (days: number) => new Date(now + days * 24 * 60 * 60 * 1000).toISOString();

const settings: FacilitySettings = {
  facilityId: 'fac-main',
  name: 'Central Pharmacy & Diagnostic Center (fake)',
  type: 'pharmacy',
  address: '12 Fixture High Street',
  city: 'Sampleton',
  latitude: 6.5244,
  longitude: 3.3792,
  phone: '+000 000 0012',
  email: 'central.pharmacy@example.test',
  openingHours: emptyOpeningHours(),
  updatedAt: daysFromNow(-2),
};

const amoxicillin: CatalogItem = {
  code: 'MED-AMOX-500',
  name: 'Amoxicillin 500mg (30 capsules) (fake)',
  type: 'pharmacy',
  description: 'Demo catalog fixture',
};

const prices: FacilityPrice[] = [
  {
    id: 'prc-current',
    facilityId: 'fac-main',
    catalogItemCode: amoxicillin.code,
    catalogItemName: amoxicillin.name,
    asset: 'XLM',
    amountStroops: '275000000',
    effectiveFrom: daysFromNow(-10),
    createdAt: daysFromNow(-10),
  },
  {
    id: 'prc-superseded',
    facilityId: 'fac-main',
    catalogItemCode: amoxicillin.code,
    catalogItemName: amoxicillin.name,
    asset: 'XLM',
    amountStroops: '250000000',
    effectiveFrom: daysFromNow(-40),
    createdAt: daysFromNow(-40),
  },
  {
    id: 'prc-scheduled',
    facilityId: 'fac-main',
    catalogItemCode: amoxicillin.code,
    catalogItemName: amoxicillin.name,
    asset: 'XLM',
    amountStroops: '300000000',
    effectiveFrom: daysFromNow(10),
    createdAt: daysFromNow(10),
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({
    accessToken: 'test-token',
    user: {
      id: 'user-facility-1',
      email: 'central.pharmacy@example.test',
      role: 'facility',
      createdAt: '',
      updatedAt: '',
    },
  });

  vi.mocked(settingsService.getFacilitySettings).mockResolvedValue(settings);
  vi.mocked(settingsService.listFacilityPrices).mockResolvedValue(prices);
  vi.mocked(settingsService.searchCatalogItems).mockResolvedValue([amoxicillin]);
  vi.mocked(settingsService.updateFacilitySettings).mockImplementation(
    async (_facilityId, input) => ({ ...settings, ...input, email: input.email }),
  );
  vi.mocked(settingsService.createFacilityPrice).mockImplementation(async (_facilityId, input) => ({
    id: 'prc-new',
    facilityId: 'fac-main',
    catalogItemName: amoxicillin.name,
    createdAt: new Date().toISOString(),
    ...input,
  }));
});

describe('Facility location & contact editor (#56)', () => {
  it('renders required fields, opening hours and a keyboard-accessible map alternative', () => {
    render(
      <LocationContactEditor
        facilityId="fac-main"
        settings={settings}
        onDirtyChange={() => undefined}
      />,
    );

    expect(screen.getByLabelText(/street address/i)).toHaveValue('12 Fixture High Street');
    expect(screen.getByLabelText(/contact phone/i)).toHaveValue('+000 000 0012');
    expect(screen.getByLabelText(/^latitude$/i)).toHaveValue(6.5244);
    expect(screen.getByLabelText(/^longitude$/i)).toHaveValue(3.3792);
    expect(screen.getByRole('region', { name: /keyboard-accessible alternative/i })).toBeVisible();
    expect(screen.getByText(/enter latitude and longitude below/i)).toBeVisible();
    expect(screen.getByRole('group', { name: /opening hours/i })).toBeVisible();
    expect(screen.getByLabelText(/monday/i)).toBeChecked();
    expect(screen.getByLabelText(/sunday/i)).not.toBeChecked();
  });

  it('tracks dirty state, validates required fields, and saves valid changes', async () => {
    const onDirtyChange = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationContactEditor
        facilityId="fac-main"
        settings={settings}
        onDirtyChange={onDirtyChange}
      />,
    );

    const address = screen.getByLabelText(/street address/i);
    await user.clear(address);
    await user.type(address, '14 Updated Fixture Street');
    expect(screen.getByText(/unsaved changes/i)).toBeVisible();
    expect(onDirtyChange).toHaveBeenCalledWith(true);

    await user.clear(screen.getByLabelText(/contact phone/i));
    await user.click(screen.getByRole('button', { name: /save location & contact/i }));
    expect(await screen.findByText(/contact phone is required/i)).toBeVisible();
    expect(settingsService.updateFacilitySettings).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/contact phone/i), '+000 000 0099');
    await user.clear(screen.getByLabelText(/^latitude$/i));
    await user.type(screen.getByLabelText(/^latitude$/i), '200');
    await user.click(screen.getByRole('button', { name: /save location & contact/i }));
    expect(await screen.findByText(/latitude between -90 and 90/i)).toBeVisible();
    expect(settingsService.updateFacilitySettings).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/^latitude$/i));
    await user.type(screen.getByLabelText(/^latitude$/i), '6.53');
    await user.click(screen.getByRole('button', { name: /save location & contact/i }));

    await waitFor(() =>
      expect(settingsService.updateFacilitySettings).toHaveBeenCalledWith(
        'fac-main',
        expect.objectContaining({
          address: '14 Updated Fixture Street',
          city: 'Sampleton',
          latitude: 6.53,
          longitude: 3.3792,
          phone: '+000 000 0099',
          openingHours: expect.any(Array),
        }),
        'test-token',
      ),
    );
    expect(await screen.findByText(/location and contact details saved/i)).toBeVisible();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('discards unsaved edits back to the saved settings', async () => {
    const user = userEvent.setup();
    render(
      <LocationContactEditor
        facilityId="fac-main"
        settings={settings}
        onDirtyChange={() => undefined}
      />,
    );

    const address = screen.getByLabelText(/street address/i);
    await user.clear(address);
    await user.type(address, 'Temporary address');
    await user.click(screen.getByRole('button', { name: /discard changes/i }));

    expect(screen.getByLabelText(/street address/i)).toHaveValue('12 Fixture High Street');
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
  });
});

describe('Facility price list editor (#56)', () => {
  it('shows version history with current, scheduled and superseded statuses', async () => {
    render(<PriceListEditor facilityId="fac-main" onDirtyChange={() => undefined} />);

    expect(await screen.findByText(/facility price versions \(3 versions\)/i)).toBeVisible();
    expect(screen.getByText('Current')).toBeVisible();
    expect(screen.getByText('Scheduled')).toBeVisible();
    expect(screen.getByText('Superseded')).toBeVisible();
    expect(screen.getByText('27.5 XLM')).toBeVisible();
    expect(screen.getByText(/already exist keep the amount snapshotted/i)).toBeVisible();
  });

  it('searches the catalog and saves a decimal price as exact stroops', async () => {
    const onDirtyChange = vi.fn();
    const user = userEvent.setup();
    render(<PriceListEditor facilityId="fac-main" onDirtyChange={onDirtyChange} />);

    await screen.findByText(/facility price versions/i);
    await user.type(screen.getByLabelText(/search catalog items/i), 'amox');
    await user.click(screen.getByRole('button', { name: /search catalog/i }));

    const matches = await screen.findAllByText('Amoxicillin 500mg (30 capsules) (fake)');
    expect(matches.length).toBeGreaterThan(1);
    await user.click(screen.getByRole('button', { name: /set price/i }));

    const amount = screen.getByLabelText(/price per unit \(XLM\)/i);
    expect(amount).toHaveValue('27.5');
    await user.clear(amount);
    await user.type(amount, '30.1234567');
    expect(screen.getByText(/unsaved price/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /add price version/i }));

    await waitFor(() =>
      expect(settingsService.createFacilityPrice).toHaveBeenCalledWith(
        'fac-main',
        expect.objectContaining({
          catalogItemCode: 'MED-AMOX-500',
          asset: 'XLM',
          amountStroops: '301234567',
        }),
        'test-token',
      ),
    );
    expect(await screen.findByText(/new price version saved/i)).toBeVisible();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('rejects more than seven decimal places without calling the API', async () => {
    const user = userEvent.setup();
    render(<PriceListEditor facilityId="fac-main" onDirtyChange={() => undefined} />);

    await screen.findByText(/facility price versions/i);
    await user.type(screen.getByLabelText(/search catalog items/i), 'amox');
    await user.click(screen.getByRole('button', { name: /search catalog/i }));
    await user.click(await screen.findByRole('button', { name: /set price/i }));

    const amount = screen.getByLabelText(/price per unit \(XLM\)/i);
    await user.clear(amount);
    await user.type(amount, '1.12345678');
    await user.click(screen.getByRole('button', { name: /add price version/i }));

    expect(await screen.findByText(/XLM supports at most 7 decimal places/i)).toBeVisible();
    expect(settingsService.createFacilityPrice).not.toHaveBeenCalled();
  });

  it('validates an empty effective-from date', async () => {
    const user = userEvent.setup();
    render(<PriceListEditor facilityId="fac-main" onDirtyChange={() => undefined} />);

    await screen.findByText(/facility price versions/i);
    await user.type(screen.getByLabelText(/search catalog items/i), 'amox');
    await user.click(screen.getByRole('button', { name: /search catalog/i }));
    await user.click(await screen.findByRole('button', { name: /set price/i }));

    await user.clear(screen.getByLabelText(/effective from/i));
    await user.click(screen.getByRole('button', { name: /add price version/i }));

    expect(await screen.findByText(/choose when this price takes effect/i)).toBeVisible();
    expect(settingsService.createFacilityPrice).not.toHaveBeenCalled();
  });
});
