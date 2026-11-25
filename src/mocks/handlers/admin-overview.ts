// Admin operations overview (issue #68) — one aggregated board.
import { http } from 'msw';
import { db } from '../db';
import { respond } from '../helpers';

export const adminOverviewHandlers = [
  http.get(
    '*/admin/overview',
    respond('json', () => ({ ...db.operationsOverview, generatedAt: new Date().toISOString() })),
  ),
];
