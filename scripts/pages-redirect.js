(function () {
  const base = '__BASE_PATH__';
  const { pathname, search } = globalThis.window.location;
  if (!pathname.startsWith(base) || pathname === base) return;

  const path = pathname.slice(base.length);
  globalThis.window.location.replace(`${base}#/${path}${search}`);
})();
