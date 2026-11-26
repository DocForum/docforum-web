// Render the real app route table (issue #112) — root shell, layout, lazy
// pages, guard loaders — in a memory data router. Replaces the old
// `<MemoryRouter><App /></MemoryRouter>` pattern now that routing is a data
// router: route objects, loaders and `errorElement`s only work under one.
import { render, type RenderResult } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createAppRoutes } from '../routes';
import { createQueryClient } from './render';

export interface RenderAppResult extends RenderResult {
  router: ReturnType<typeof createMemoryRouter>;
  queryClient: QueryClient;
}

export function renderAppAt(
  path: string,
  { queryClient = createQueryClient() }: { queryClient?: QueryClient } = {},
): RenderAppResult {
  const router = createMemoryRouter(createAppRoutes({ queryClient }), { initialEntries: [path] });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router, queryClient };
}
