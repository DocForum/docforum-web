import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Reads the real stylesheet so this fails if a token is edited without
// checking contrast (rather than asserting a duplicated copy).
const css = readFileSync(`${process.cwd()}/src/styles/global.css`, 'utf8');

/**
 * Guards the palette against regressions (issue #89). Parses the real
 * tokens from global.css so the test fails if someone edits a colour
 * without checking contrast, rather than asserting a duplicated copy.
 */
function tokensIn(block: string): Record<string, string> {
  return Object.fromEntries(
    Array.from(block.matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)).map((match) => [
      match[1],
      match[2],
    ]),
  );
}

const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const lightBlock = css.slice(0, darkStart);
const darkBlock = css.slice(darkStart);
const light = tokensIn(lightBlock);
const dark = { ...light, ...tokensIn(darkBlock) };

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const [r, g, b] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const PAIRS = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text-muted', 'bg'],
  ['text-muted', 'surface'],
  ['text-faint', 'bg'],
  ['text-faint', 'surface'],
  ['accent', 'bg'],
  ['accent-contrast', 'accent'],
  ['accent-2', 'surface'],
  ['accent-2', 'accent-2-subtle'],
  ['accent-2-contrast', 'accent-2'],
  ['danger', 'danger-surface'],
  ['danger-contrast', 'danger'],
  ['warning', 'warning-surface'],
] as const;

describe.each([
  ['light', light],
  ['dark', dark],
])('colour contrast — %s theme (#89)', (_theme, tokens) => {
  it.each(PAIRS)('--color-%s on --color-%s meets WCAG AA (4.5:1)', (foreground, background) => {
    const fg = tokens[`--color-${foreground}`];
    const bg = tokens[`--color-${background}`];
    expect(fg, `--color-${foreground} must be a hex token`).toBeTruthy();
    expect(bg, `--color-${background} must be a hex token`).toBeTruthy();
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
