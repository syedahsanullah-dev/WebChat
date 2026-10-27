import Prism from 'prismjs';
import { normalizeLanguage } from './markdownParser';

// Register language grammars for Prism
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-markdown';

/**
 * Escapes raw HTML characters to prevent XSS injection.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Highlights a code string using Prism.js and returns HTML.
 * If language is not supported or highlight fails, safely falls back to escaped plain text.
 */
export function highlightCode(code: string, language: string): string {
  if (!code) return '';

  const normLang = normalizeLanguage(language);
  const grammar = Prism.languages[normLang] || Prism.languages.clike;

  if (!grammar) {
    return escapeHtml(code);
  }

  try {
    return Prism.highlight(code, grammar, normLang);
  } catch (err) {
    console.debug('[syntaxHighlighter] Highlight failed, falling back to escaped text:', err);
    return escapeHtml(code);
  }
}
