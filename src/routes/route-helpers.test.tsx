import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { initialRouterPath, resolveInitialLazyRoutes } from '../router';
import { createAppRoutes } from '.';
import { createQueryClient } from '../test/render';
import { useAuthStore } from '../store/auth-store';
import { makeUser } from '../test/factories';
import { lazyPage } from './lazy';
import { guardedSection, settlePrefetch } from './route-helpers';

afterEach(() => {
  vi.useRealTimers();
});

describe('settlePrefetch', () => {
  it('waits for the prefetches when they finish within the budget', async () => {
    let finished = false;
    await settlePrefetch([
      new Promise((resolve) => setTimeout(resolve, 5)).then(() => {
        finished = true;
      }),
    ]);
    expect(finished).toBe(true);
  });

  it('never rejects when a prefetch fails (the page shows its own error)', async () => {
    await expect(settlePrefetch([Promise.reject(new Error('503'))])).resolves.toBeUndefined();
  });

  it('stops waiting at the budget so a cold backend cannot freeze navigation', async () => {
    vi.useFakeTimers();
    let settled = false;
    const waiting = settlePrefetch([new Promise(() => {})], 2_000).then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(1_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(settled).toBe(true);
  });
});

describe('lazyPage', () => {
  it('resolves the named export as the route Component', async () => {
    function Page() {
      return null;
    }
    const lazy = lazyPage(() => Promise.resolve({ Page }), 'Page');
    await expect(lazy()).resolves.toEqual({ Component: Page });
  });
});

describe('initialRouterPath', () => {
  it('reads the hash in hash mode (GitHub Pages)', () => {
    expect(initialRouterPath({ pathname: '/docforum-web/', search: '', hash: '#/payments?x=1' }, true)).toBe(
      '/payments?x=1',
    );
    expect(initialRouterPath({ pathname: '/docforum-web/', search: '', hash: '' }, true)).toBe('/');
  });

  it('reads the path in browser mode', () => {
    expect(initialRouterPath({ pathname: '/faq', search: '?a=b', hash: '' }, false)).toBe('/faq?a=b');
  });
});

describe('resolveInitialLazyRoutes', () => {
  it('loads only the matched routes’ modules before the first render', async () => {
    const matched = vi.fn(async () => ({ Component: () => null }));
    const other = vi.fn(async () => ({ Component: () => null }));
    const routes: RouteObject[] = [
      { path: '/a', lazy: matched },
      { path: '/b', lazy: other },
    ];
    await resolveInitialLazyRoutes(routes, '/a');
    expect(matched).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
    expect(routes[0].lazy).toBeUndefined();
    expect(routes[0].Component).toBeTypeOf('function');
  });
});

describe('guardedSection errorElement', () => {
  it('contains a failing lazy page to the section with a route-level error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useAuthStore.getState().setSession(makeUser({ role: 'patient' }), 'token');
    const routes: RouteObject[] = [
      guardedSection('patient', ['patient'], [
        { path: '/broken', lazy: () => Promise.reject(new Error('Failed to fetch dynamically imported module')) },
      ]),
    ];
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/broken'] })} />);
    expect(await screen.findByText('This page could not be shown')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('the app route table', () => {
  it('splits every page into a lazy route (no eager page components)', () => {
    const routes = createAppRoutes({ queryClient: createQueryClient() });
    const pages: RouteObject[] = [];
    const walk = (list: RouteObject[]) => {
      for (const route of list) {
        if (route.children) walk(route.children);
        else pages.push(route);
      }
    };
    walk(routes);
    const eager = pages.filter((route) => !route.lazy && route.path !== '*');
    expect(eager).toEqual([]);
    expect(pages.length).toBeGreaterThan(40);
  });

  it('gives each guarded section its own errorElement and a loader on every child', () => {
    const routes = createAppRoutes({ queryClient: createQueryClient() });
    const layout = routes[0].children![0];
    const sections = layout.children!.filter((route) => route.id && route.children);
    expect(sections.map((section) => section.id).sort()).toEqual(
      ['admin', 'care', 'doctor', 'facility', 'patient', 'signed-in'].sort(),
    );
    for (const section of sections) {
      expect(section.errorElement, section.id).toBeTruthy();
      for (const child of section.children!) expect(child.loader, child.path).toBeTypeOf('function');
    }
  });
});
