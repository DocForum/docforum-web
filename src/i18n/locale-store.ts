// This file is kept for backward compatibility but the single source of truth
// is now src/store/locale-store.ts which handles both patient locale (en/es) and
// formatting locale (en-US, en-GB, de-DE, ar-EG) with proper dir computation.
// Import from '../store/locale-store' instead.
import { useLocaleStore as useI18nLocaleStore, currentDirection, directionFor } from '../store/locale-store';

// Re-export for convenience
export { useI18nLocaleStore as useLocaleStore, currentDirection, directionFor };