import React, { useCallback, useMemo, useState } from 'react';
import { CheckCheck, Copy } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import javascript from 'highlight.js/lib/languages/javascript';
import {
  tokenizeHighlightedHtml,
  type HighlightToken,
} from '../lib/highlight-tokens.js';

// Only the languages ResumeSetu actually renders. The full highlight.js bundle
// is ~250 kB; registering per-language keeps this to a few kB.
hljs.registerLanguage('json', json);
hljs.registerLanguage('javascript', javascript);

export type CodeLanguage = 'json' | 'javascript' | 'text';

/** Falls back to one plain token so nothing can fail to render. */
function plainTokens(code: string): HighlightToken[] {
  return [{ cls: null, text: code }];
}

function highlightToTokens(code: string, language: CodeLanguage): HighlightToken[] {
  if (language === 'text') return plainTokens(code);
  try {
    return tokenizeHighlightedHtml(hljs.highlight(code, { language, ignoreIllegals: true }).value);
  } catch {
    return plainTokens(code);
  }
}

export interface CodeBlockProps {
  code: string;
  language?: CodeLanguage;
  /** Shown in the header strip. Defaults to the language name. */
  label?: string;
  /** Long structured payloads scroll instead of wrapping. */
  wrap?: boolean;
  maxHeightClass?: string;
  className?: string;
}

/**
 * Monospace, syntax-highlighted, copyable code/JSON viewer.
 *
 * Intended for structured output only (scan payloads, grounding reports). Plain
 * prose such as a resume or cover letter must use a normal `<pre>` instead —
 * highlighting it would be noise and would break the reading experience.
 *
 * Rendering is safe by construction: tokens are React elements, never HTML.
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'json',
  label,
  wrap = false,
  maxHeightClass = 'max-h-96',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => highlightToTokens(code ?? '', language), [code, language]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code ?? '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or insecure context: leave the button state
      // untouched rather than claiming a copy that did not happen.
    }
  }, [code]);

  return (
    <figure
      className={`code-block overflow-hidden rounded-2xl border border-line/90 bg-[#0B2545] shadow-2xs ${className}`}
    >
      <figcaption className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-3.5 py-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-wash/80">
          {label || language}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-wash transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-pale"
          aria-label={`Copy ${label || language} to clipboard`}
        >
          {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </figcaption>
      <pre
        className={`${maxHeightClass} overflow-auto p-4 font-mono text-[11px] leading-relaxed text-surface ${
          wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
        }`}
        tabIndex={0}
        role="region"
        aria-label={`${label || language} contents`}
      >
        <code>
          {tokens.map((token, index) =>
            token.cls ? (
              <span key={index} className={token.cls}>
                {token.text}
              </span>
            ) : (
              <React.Fragment key={index}>{token.text}</React.Fragment>
            )
          )}
        </code>
      </pre>
    </figure>
  );
};

export default CodeBlock;
