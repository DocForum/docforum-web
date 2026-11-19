import type { NavItem } from './types';

/** Shown while signed out. */
export const guestNavItems: NavItem[] = [
  { to: '/login', label: 'Log in', roles: [], messageId: 'nav.logIn' },
  { to: '/signup', label: 'Sign up', roles: [], messageId: 'nav.signUp' },
];
