import { afterEach, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { fireEvent, render, screen } from '../test/render';
import { useLocaleStore } from '../store/locale-store';
import { LanguageSwitcher } from './LanguageSwitcher';

function switcher(): HTMLElement {
  return screen.getByRole('combobox', { name: 'Language' });
}

afterEach(() => {
  // The locale store is a module singleton and `resetTestStores()` leaves it
  // alone, so a switch to 'es' must not be visible to the next test.
  useLocaleStore.getState().setPatientLocale('en');
});

describe('LanguageSwitcher (#290)', () => {
  it('lists every supported locale and shows the stored choice', () => {
    render(<LanguageSwitcher />);

    expect(switcher()).toHaveValue('en');
    expect(screen.getByRole('option', { name: 'English' })).toHaveValue('en');
    expect(screen.getByRole('option', { name: 'Español' })).toHaveValue('es');
  });

  it('stores the locale the patient picks', async () => {
    render(<LanguageSwitcher />);

    await userEvent.selectOptions(switcher(), 'es');

    expect(useLocaleStore.getState().patientLocale).toBe('es');
    expect(switcher()).toHaveValue('es');
  });

  it('keeps the stored locale when the change carries an unsupported value', () => {
    render(<LanguageSwitcher />);

    // No option in the control can produce this; a page or extension can. The
    // store must not be handed a locale with no catalogue.
    fireEvent.change(switcher(), { target: { value: 'fr' } });

    expect(useLocaleStore.getState().patientLocale).toBe('en');
  });

  it('has no detectable axe violations', async () => {
    const { container } = render(<LanguageSwitcher />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
