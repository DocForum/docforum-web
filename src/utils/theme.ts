// Theme selection persisted in `localStorage` (documented in the privacy page:
// the key is `docforum-theme`). The stylesheet keys off `data-theme` on the
// document element; without this bootstrap a saved dark or high-contrast
// choice would be forgotten on every reload (issue #98 / #296).

export const THEME_STORAGE_KEY = 'docforum-theme';

export type ThemeName = 'light' | 'dark' | 'high-contrast';

const THEMES: readonly ThemeName[] = ['light', 'dark', 'high-contrast'];

function isTheme(value: string | null): value is ThemeName {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

/** Reads the saved theme and applies it. Unknown or absent values leave the
 * document alone, so the CSS `prefers-color-scheme` default still applies. */
export function applyStoredTheme(storage: Storage = window.localStorage): void {
  const saved = storage.getItem(THEME_STORAGE_KEY);
  if (!isTheme(saved)) return;
  document.documentElement.dataset.theme = saved;
}

export function setTheme(theme: ThemeName, storage: Storage = window.localStorage): void {
  storage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.dataset.theme = theme;
}
