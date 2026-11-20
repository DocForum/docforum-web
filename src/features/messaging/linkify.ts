// Safe linkification for message bodies (issue #22).
//
// Messages are PHI and are never rendered as HTML. This splits plain text
// into React-renderable segments; only `http:`/`https:` URLs become links, so
// `javascript:`, `data:` and friends can never be turned into an anchor.

export type MessageSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string };

/** Matches a URL, stopping at whitespace or characters that cannot appear in
 * a bare link (`<`, `>`, quotes). Trailing sentence punctuation is trimmed
 * afterwards. */
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;

/** Punctuation that belongs to the sentence, not the URL. Balanced closing
 * brackets are kept when the URL itself opened them. */
function trimTrailing(value: string): string {
  let url = value;
  for (;;) {
    const last = url.at(-1);
    if (!last) return url;
    if ('.,;:!?'.includes(last)) {
      url = url.slice(0, -1);
      continue;
    }
    if (last === ')' && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) {
      url = url.slice(0, -1);
      continue;
    }
    if (last === ']' && (url.match(/\[/g)?.length ?? 0) < (url.match(/\]/g)?.length ?? 0)) {
      url = url.slice(0, -1);
      continue;
    }
    return url;
  }
}

export function linkify(body: string): MessageSegment[] {
  if (!body) return [];

  const segments: MessageSegment[] = [];
  let cursor = 0;

  for (const match of body.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const url = trimTrailing(raw);
    if (!url) continue;

    if (index > cursor) {
      segments.push({ kind: 'text', text: body.slice(cursor, index) });
    }

    segments.push({ kind: 'link', text: url, href: url });

    // Anything trimmed from the URL is plain text again.
    const trimmed = raw.slice(url.length);
    if (trimmed) segments.push({ kind: 'text', text: trimmed });
    cursor = index + raw.length;
  }

  if (cursor < body.length) {
    segments.push({ kind: 'text', text: body.slice(cursor) });
  }

  return segments;
}
