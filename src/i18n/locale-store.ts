// This file is kept for backward compatibility but the single source of truth
// is now src/store/locale-store.ts which handles both patient locale (en/es) and
// formatting locale (en-US, en-GB, de-DE, ar-EG) with proper dir computation.
// Import from '../store/locale-store' instead.
import { useLocaleStore as useStoreLocaleStore } from '../store/locale-store';
import { directionFor } from './format';

export { useStoreLocaleStore as useLocaleStore };

export function currentDirection(): 'ltr' | 'rtl' {
  return useStoreLocaleStore.getState().currentDirection();
}

export { directionFor };