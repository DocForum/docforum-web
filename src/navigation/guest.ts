import { paths } from '../routes/paths';
import type { NavItem } from './types';

/** Shown while signed out. */
export const guestNavItems: NavItem[] = [
  { to: paths.login, label: 'Log in', roles: [], messageId: 'nav.logIn' },
  { to: paths.signup, label: 'Sign up', roles: [], messageId: 'nav.signUp' },
];
