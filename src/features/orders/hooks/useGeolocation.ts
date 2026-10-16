import { useState, useCallback } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function useGeolocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPrompted, setHasPrompted] = useState(false);

  const requestLocation = useCallback(() => {
    setHasPrompted(true);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Stored strictly in component memory — NEVER in localStorage/sessionStorage/URL
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLoading(false);
      },
      (err) => {
        setIsLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission was denied. You can search by area or address below.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.');
            break;
          case err.TIMEOUT:
            setError('The request to get your location timed out.');
            break;
          default:
            setError('An unknown error occurred while requesting location.');
            break;
        }
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  }, []);

  const clearLocation = useCallback(() => {
    setCoordinates(null);
    setError(null);
    setHasPrompted(false);
  }, []);

  return {
    coordinates,
    isLoading,
    error,
    hasPrompted,
    requestLocation,
    clearLocation,
  };
}
