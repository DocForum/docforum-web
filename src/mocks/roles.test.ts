import { beforeEach, describe, expect, it } from 'vitest';
import { consumePreviewRole } from './roles';

describe('consumePreviewRole', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('reads a valid role and removes only the preview parameter', () => {
    window.history.replaceState(null, '', '/?previewRole=admin&ref=email#/admin/audit');

    expect(consumePreviewRole()).toBe('admin');
    expect(window.location.search).toBe('?ref=email');
    expect(window.location.hash).toBe('#/admin/audit');
  });

  it('ignores an unknown role', () => {
    window.history.replaceState(null, '', '/?previewRole=superuser#/');

    expect(consumePreviewRole()).toBeNull();
    expect(window.location.search).toBe('?previewRole=superuser');
  });

  it('returns null when the parameter is absent', () => {
    window.history.replaceState(null, '', '/?ref=email');

    expect(consumePreviewRole()).toBeNull();
  });
});
