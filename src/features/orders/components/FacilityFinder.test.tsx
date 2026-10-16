import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/render';
import userEvent from '@testing-library/user-event';
import { FacilityFinder } from './FacilityFinder';
import * as facilityService from '../../../services/facility-service';
import type { FacilityWithDistance } from '../../../types/models';

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

describe('FacilityFinder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(facilityService.getFacilities).mockResolvedValue(mockFacilities);
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
      );
    });

    const labsTab = screen.getByRole('tab', { name: /diagnostic labs/i });
    await user.click(labsTab);

    await waitFor(() => {
      expect(facilityService.getFacilities).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'lab' }),
        null,
      );
    });
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
