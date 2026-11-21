// The app's route table as data-router route objects (issue #112).
//
//   App (root shell: providers, analytics, update prompt)   errorElement: app
//   └─ Layout (header, nav, <main>, footer)                 errorElement: route
//      ├─ public routes (one lazy chunk per page)
//      ├─ guarded sections — one per role set, each with
//      │  RoleGate + its own errorElement; every child loader
//      │  runs the role guard, then prefetches its data
//      └─ * → NotFoundPage
//
// One file per area in this folder. `createAppRoutes` is used by the browser
// (`src/router.ts`), by tests (`src/test/render-app.tsx`) and by the
// prerender (`src/prerender/entry-server.tsx`), so all three always see the
// same table.
import type { RouteObject } from 'react-router-dom';
import App from '../App';
import { Layout } from '../components/Layout';
import { RouteErrorElement } from '../components/RouteErrorElement';
import { NotFoundPage } from '../pages/NotFoundPage';
import { adminRoutes } from './admin';
import { doctorRoutes } from './doctor';
import { facilityRoutes } from './facility';
import { patientRoutes } from './patient';
import { publicRoutes } from './public';
import type { RouteContext } from './route-helpers';

export type { RouteContext } from './route-helpers';

export function createAppRoutes(context: RouteContext): RouteObject[] {
  return [
    {
      id: 'root',
      element: <App />,
      errorElement: <RouteErrorElement level="app" />,
      children: [
        {
          id: 'layout',
          element: <Layout />,
          errorElement: <RouteErrorElement level="route" />,
          children: [
            ...publicRoutes(context),
            ...patientRoutes(context),
            ...doctorRoutes(context),
            ...facilityRoutes(context),
            ...adminRoutes(context),
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ];
}
