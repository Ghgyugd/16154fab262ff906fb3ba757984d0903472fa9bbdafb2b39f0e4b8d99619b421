/**
 * Pure, testable helpers behind the <CodeBlock> viewer.
 *
 * highlight.js produces an HTML *string*. Rendering that string would require
 * `dangerouslySetInnerHTML`, which reintroduces an HTML-injection sink. Instead
 * the markup is parsed here into plain `{ cls, text }` tokens and rendered as
 * React elements by the component, so no markup from the highlighter — or from
 * the analysed input — is ever interpreted as HTML.
 *
 * Kept free of React and DOM types so it can be unit tested directly.
 */

export interface HighlightToken {
  /** A highlight.js token class such as `hljs-string`, or null for plain text. */
  cls: string | null;
  text: string;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#x27;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
  '&#x2F;': '/',
  '&#47;': '/',
  '&#x3D;': '=',
  '&#61;': '=',
};

/**
 * Decodes the HTML entities highlight.js emits.
 *
 * Because tokens become React children rather than injected markup, `"` arrives
 * here as `&quot;`. Without decoding, every JSON quote would be rendered to the
 * user as the literal text `&quot;`.
 */
export function decodeEntities(value: string): string {
  return value.replace(
    /&(?:amp|lt|gt|quot|apos|nbsp|#x27|#39|#x2F|#47|#x3D|#61);/g,
    (entity) => ENTITIES[entity] ?? entity
  );
}

/**
 * Parses highlight.js output into tokens.
 *
 * Only `<span class="hljs-*">` is honoured. Any other tag is discarded
 * entirely (its content is still emitted as text), so a malformed or hostile
 * highlighter response cannot introduce elements, attributes or event handlers.
 */
export function tokenizeHighlightedHtml(html: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let currentClass: string | null = null;
  let buffer = '';
  let index = 0;

  const flush = () => {
    if (buffer) tokens.push({ cls: currentClass, text: decodeEntities(buffer) });
    buffer = '';
  };

  while (index < html.length) {
    if (html.startsWith('<', index)) {
      const end = html.indexOf('>', index);
      if (end === -1) {
        // Unterminated tag: treat the remainder as literal text.
        buffer += html.slice(index);
        break;
      }
      const tag = html.slice(index, end + 1);
      const openMatch = /^<span class="([^"]*)">$/.exec(tag);
      if (openMatch) {
        flush();
        currentClass = openMatch[1].startsWith('hljs-') ? openMatch[1] : null;
      } else if (tag === '</span>') {
        flush();
        currentClass = null;
      }
      // Any other tag (including <script>, <img onerror=…>) is dropped.
      index = end + 1;
      continue;
    }
    const nextTag = html.indexOf('<', index);
    const stop = nextTag === -1 ? html.length : nextTag;
    buffer += html.slice(index, stop);
    index = stop;
  }

  flush();
  return tokens;
}

/** Reassembles token text. Useful for asserting lossless round-trips. */
export function tokenText(tokens: HighlightToken[]): string {
  return tokens.map((token) => token.text).join('');
}
