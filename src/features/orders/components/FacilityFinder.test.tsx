import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/render';
import userEvent from '@testing-library/user-event';
import { FacilityFinder } from './FacilityFinder';
import * as facilityService from '../../../services/facility-service';
import type {
  EligibleFacility,
  FacilityPrice,
  FacilityWithDistance,
} from '../../../types/models';

vi.mock('../../../services/facility-service');

const mockFacilities: FacilityWithDistance[] = [
  {
    id: 'fac-1',
    userId: 'u-fac-1',
    name: 'Apollo Central Pharmacy',
    type: 'pharmacy',
    location: {
      address: '10 High Street',
      city: 'London',
      latitude: 51.505,
      longitude: -0.09,
    },
    distanceKm: 0.8,
    phone: '+44 20 7946 0001',
  },
  {
    id: 'fac-2',
    userId: 'u-fac-2',
    name: 'St. Jude Pathology Lab',
    type: 'lab',
    location: {
      address: '42 Baker Street',
      city: 'London',
      latitude: 51.52,
      longitude: -0.15,
    },
    distanceKm: 2.3,
    phone: '+44 20 7946 0002',
  },
];

// Priced, on-request and (via `getFacilityPriceHistory`) changed-recently
// facilities for the order item in issue #258.
const eligibleFacilities: EligibleFacility[] = [
  {
    ...mockFacilities[0],
    price: { amountStroops: '250000000', effectiveFrom: '2026-11-10T00:00:00.000Z' },
    priceOnRequest: false,
  },
  {
    ...mockFacilities[1],
    price: null,
    priceOnRequest: true,
  },
  {
    id: 'fac-3',
    userId: 'u-fac-3',
    name: 'Beechwood Pharmacy',
    type: 'pharmacy',
    location: {
      address: '7 Elm Road',
      city: 'London',
      latitude: 51.51,
      longitude: -0.1,
    },
    distanceKm: 1.4,
    price: { amountStroops: '180000000', effectiveFrom: '2026-09-01T00:00:00.000Z' },
    priceOnRequest: false,
  },
];

const priceHistory: FacilityPrice[] = [
  {
    id: 'prc-fac-1-old',
    facilityId: 'fac-1',
    catalogItemCode: 'MED-AMOX-500',
    catalogItemName: 'Amoxicillin 500mg',
    asset: 'XLM',
    amountStroops: '200000000',
    effectiveFrom: '2026-09-01T00:00:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'prc-fac-1-current',
    facilityId: 'fac-1',
    catalogItemCode: 'MED-AMOX-500',
    catalogItemName: 'Amoxicillin 500mg',
    asset: 'XLM',
    amountStroops: '250000000',
    effectiveFrom: '2026-11-10T00:00:00.000Z',
    createdAt: '2026-11-10T00:00:00.000Z',
  },
];

describe('FacilityFinder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(facilityService.getFacilities).mockResolvedValue(mockFacilities);
    vi.mocked(facilityService.getEligibleFacilities).mockResolvedValue(eligibleFacilities);
    vi.mocked(facilityService.getFacilityPriceHistory).mockResolvedValue(priceHistory);
  });

  it('renders privacy guarantee and facility list', async () => {
    render(<FacilityFinder />);

    expect(screen.getByText(/privacy guarantee:/i)).toBeInTheDocument();
    expect(screen.getByText(/never stored/i)).toBeInTheDocument();

    expect(await screen.findAllByText('Apollo Central Pharmacy')).toHaveLength(2);
    expect(screen.getAllByText('St. Jude Pathology Lab')).toHaveLength(2);
    expect(screen.getByText(/0\.8 km away/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.3 km away/i)).toBeInTheDocument();
  });

  it('requests browser geolocation on demand and passes coordinates to query without persisting to storage', async () => {
    const mockGetCurrentPosition = vi.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 51.5,
          longitude: -0.1,
        },
      });
    });

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      configurable: true,
      writable: true,
    });

    const user = userEvent.setup();
    render(<FacilityFinder />);

    const locateBtn = screen.getByRole('button', { name: /use current location/i });
    await user.click(locateBtn);

    await waitFor(() => {
      expect(mockGetCurrentPosition).toHaveBeenCalled();
      expect(facilityService.getFacilities).toHaveBeenCalledWith(
        expect.objectContaining({ lat: 51.5, lng: -0.1 }),
        null,
        expect.any(AbortSignal),
      );
    });

    // Verify hard constraint: Never persist patient location
    expect(localStorage.getItem('location')).toBeNull();
    expect(localStorage.getItem('latitude')).toBeNull();
    expect(sessionStorage.getItem('location')).toBeNull();
    expect(sessionStorage.getItem('latitude')).toBeNull();
  });

  it('filters by facility type when tabs are clicked', async () => {
    const user = userEvent.setup();
    render(<FacilityFinder />);

    await screen.findAllByText('Apollo Central Pharmacy');

    const pharmaciesTab = screen.getByRole('tab', { name: /pharmacies/i });
    await user.click(pharmaciesTab);

    await waitFor(() => {
      expect(facilityService.getFacilities).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'pharmacy' }),
        null,
        expect.any(AbortSignal),
      );
    });

    const labsTab = screen.getByRole('tab', { name: /diagnostic labs/i });
    await user.click(labsTab);

    await waitFor(() => {
      expect(facilityService.getFacilities).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'lab' }),
        null,
        expect.any(AbortSignal),
      );
    });
  });

  it('shows each facility’s price, or price on request, for the order item', async () => {
    render(<FacilityFinder catalogItemCode="MED-AMOX-500" />);

    // Prices come from the BigInt stroop strings (250000000 stroops = 25 XLM).
    expect(await screen.findByText('25 XLM')).toBeInTheDocument();
    expect(screen.getByText('18 XLM')).toBeInTheDocument();
    expect(screen.getByText('Price on request')).toBeInTheDocument();

    expect(facilityService.getEligibleFacilities).toHaveBeenCalledWith(
      'MED-AMOX-500',
      expect.any(Object),
      null,
      expect.any(AbortSignal),
    );
    // The plain (priceless) search never runs when comparing prices.
    expect(facilityService.getFacilities).not.toHaveBeenCalled();

    // A recent change is explained from the per-card history request.
    expect((await screen.findAllByText(/price changed on/i)).length).toBeGreaterThan(0);
    expect(facilityService.getFacilityPriceHistory).toHaveBeenCalledWith(
      'fac-1',
      null,
      expect.any(AbortSignal),
    );
  });

  it('sorts by price with price-on-request facilities last, and announces the order', async () => {
    const user = userEvent.setup();
    render(<FacilityFinder catalogItemCode="MED-AMOX-500" />);

    await screen.findByText('25 XLM');
    expect(screen.getByRole('status')).toHaveTextContent('Sorted by distance.');

    await user.click(screen.getByRole('button', { name: 'Price' }));

    const names = screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'));
    expect(names).toEqual(['Beechwood Pharmacy', 'Apollo Central Pharmacy', 'St. Jude Pathology Lab']);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sorted by price, cheapest first. Facilities with a price on request are listed last.',
    );
  });

  it('shows no price comparison when opened without a catalog code', async () => {
    render(<FacilityFinder />);

    await screen.findAllByText('Apollo Central Pharmacy');
    expect(screen.queryByText('Price on request')).not.toBeInTheDocument();
    expect(screen.queryByText(/price changed on/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Price' })).not.toBeInTheDocument();
    expect(facilityService.getEligibleFacilities).not.toHaveBeenCalled();
  });

  it('syncs selection between card and map marker', async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(<FacilityFinder onFacilityChosen={onChoose} />);

    await screen.findAllByText('Apollo Central Pharmacy');

    // Click marker on map
    const marker = screen.getByLabelText('Marker for St. Jude Pathology Lab');
    await user.click(marker);

    expect(onChoose).toHaveBeenCalledWith(mockFacilities[1]);

    // Card should be selected
    const selectedBtn = screen.getByRole('button', { name: /✓ selected/i });
    expect(selectedBtn).toBeInTheDocument();
  });
});
