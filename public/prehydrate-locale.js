// Pre-hydration locale shell (issue #225).
//
// Loaded as a same-origin classic script before the app module so the first
// paint matches a Spanish browser instead of hard-coded English. It must stay
// a separate file: the production CSP is `script-src 'self'` with no nonce or
// hash, so an inline script would be blocked. React replaces the loading shell
// on mount and I18nProvider/LocaleSync take over the document language.
(function () {
  var language =
    (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  if (language.toLowerCase().indexOf('es') !== 0) return;

  var label = document.getElementById('app-loading-label');
  if (label) label.textContent = 'Cargando DocForum…';
  document.documentElement.lang = 'es';
})();
