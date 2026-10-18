import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '../test/render';
import { LocaleSync } from './LocaleSync';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useLocaleStore } from './locale-store';

afterEach(() => {
  act(() => {
    useLocaleStore.getState().setLocale('en-US');
  });
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

describe('locale direction switch (#88)', () => {
  it('sets lang and dir from the active locale', () => {
    render(<LocaleSync />);

    expect(document.documentElement.dir).toBe('ltr');

    act(() => {
      useLocaleStore.getState().setLocale('ar-EG');
    });

    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar-EG');

    act(() => {
      useLocaleStore.getState().setLocale('de-DE');
    });

    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('de-DE');
  });

  it('exposes a labelled locale control with a pseudo-RTL option', async () => {
    render(<LocaleSwitcher />);
    const select = screen.getByLabelText(/locale/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /RTL/i })).toBeInTheDocument();
  });
});
