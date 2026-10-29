import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const storybookDirectory = resolve('dist/storybook');
const screenshotDirectory = resolve('docs/screenshots/2026-10-20-w7-platform-quality');
const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
};

if (!existsSync(resolve(storybookDirectory, 'index.html'))) {
  throw new Error('Build Storybook before capturing its screenshots.');
}

mkdirSync(screenshotDirectory, { recursive: true });

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  const relativePath = decodeURIComponent(pathname.replace(/^\/docforum-web\/storybook\/?/, ''));
  const requestedFile = resolve(storybookDirectory, relativePath || 'index.html');
  const safeFile = requestedFile.startsWith(`${storybookDirectory}${sep}`) ? requestedFile : '';
  const file = safeFile && existsSync(safeFile) ? safeFile : resolve(storybookDirectory, 'index.html');
  response.writeHead(200, { 'content-type': mimeTypes[extname(file)] ?? 'application/octet-stream' });
  response.end(readFileSync(file));
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));

try {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start the Storybook screenshot server.');

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${address.port}/docforum-web/storybook/?path=/story/components-button--primary`);
    const preview = page.frameLocator('#storybook-preview-iframe');
    await preview.getByRole('button', { name: 'Continue' }).waitFor();
    await page.screenshot({ path: resolve(screenshotDirectory, 'storybook-desktop.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: resolve(screenshotDirectory, 'storybook-mobile.png'), fullPage: true });
  } finally {
    await browser.close();
  }
} finally {
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
}