import type { Role } from '../types/models';

export const ROLE_HOME: Record<Role, string> = {
  patient: '/patient',
  doctor: '/doctor',
  facility: '/facility',
  admin: '/admin',
};

export const LOGIN_PATH = '/login';
