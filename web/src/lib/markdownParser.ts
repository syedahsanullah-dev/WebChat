/**
 * Markdown Code Block & Inline Code Parser
 * Lightweight, zero-dependency tokenizer separating regular chat text from fenced ```code``` blocks and inline `code`.
 */

export interface CodeBlockSegment {
  type: 'code_block';
  language: string;
  code: string;
}

export interface TextSegment {
  type: 'text';
  content: string;
}

export interface InlineCodeSegment {
  type: 'inline_code';
  code: string;
}

export type MessageContentSegment = CodeBlockSegment | TextSegment | InlineCodeSegment;

/**
 * Normalizes language aliases to canonical Prism.js language keys.
 */
export function normalizeLanguage(lang: string): string {
  const clean = (lang || '').trim().toLowerCase();
  switch (clean) {
    case 'ts':
    case 'typescript':
      return 'typescript';
    case 'js':
    case 'javascript':
      return 'javascript';
    case 'py':
    case 'python':
      return 'python';
    case 'html':
    case 'xml':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'sql':
    case 'mysql':
    case 'pgsql':
      return 'sql';
    case 'json':
      return 'json';
    case 'sh':
    case 'bash':
    case 'shell':
    case 'zsh':
      return 'bash';
    case 'rs':
    case 'rust':
      return 'rust';
    case 'go':
    case 'golang':
      return 'go';
    case 'java':
      return 'java';
    case 'c':
      return 'c';
    case 'cpp':
    case 'c++':
      return 'cpp';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return clean || 'text';
  }
}

/**
 * Returns human-readable label for a programming language.
 */
export function getLanguageDisplayLabel(lang: string): string {
  const norm = normalizeLanguage(lang);
  switch (norm) {
    case 'typescript':
      return 'TypeScript';
    case 'javascript':
      return 'JavaScript';
    case 'python':
      return 'Python';
    case 'html':
      return 'HTML';
    case 'css':
      return 'CSS';
    case 'sql':
      return 'SQL';
    case 'json':
      return 'JSON';
    case 'bash':
      return 'Bash';
    case 'rust':
      return 'Rust';
    case 'go':
      return 'Go';
    case 'java':
      return 'Java';
    case 'c':
      return 'C';
    case 'cpp':
      return 'C++';
    case 'yaml':
      return 'YAML';
    case 'markdown':
      return 'Markdown';
    default:
      return lang ? lang.toUpperCase() : 'Code';
  }
}

/**
 * Parses message body into structured segments containing code blocks and text.
 */
export function parseMarkdownSegments(rawText: string): MessageContentSegment[] {
  if (!rawText) return [];

  const segments: MessageContentSegment[] = [];

  // Regex to match triple-backtick fenced blocks:
  // ```lang\ncode\n```
  const codeBlockRegex = /```([a-zA-Z0-9_+#.-]*)\r?\n([\s\S]*?)\r?\n```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(rawText)) !== null) {
    const matchStart = match.index;
    const matchEnd = codeBlockRegex.lastIndex;

    // Any text preceding this code block
    if (matchStart > lastIndex) {
      const textBefore = rawText.slice(lastIndex, matchStart);
      segments.push(...parseInlineCodeSegments(textBefore));
    }

    const lang = match[1]?.trim() || '';
    const code = match[2] || '';

    segments.push({
      type: 'code_block',
      language: normalizeLanguage(lang),
      code,
    });

    lastIndex = matchEnd;
  }

  // Any remaining text after the last code block
  if (lastIndex < rawText.length) {
    const remainingText = rawText.slice(lastIndex);
    segments.push(...parseInlineCodeSegments(remainingText));
  }

  return segments;
}

/**
 * Splits text segment into normal text and inline `code` blocks.
 */
function parseInlineCodeSegments(text: string): MessageContentSegment[] {
  const result: MessageContentSegment[] = [];
  const inlineRegex = /`([^`\n]+)`/g;

  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    const start = match.index;
    const end = inlineRegex.lastIndex;

    if (start > lastIdx) {
      result.push({
        type: 'text',
        content: text.slice(lastIdx, start),
      });
    }

    result.push({
      type: 'inline_code',
      code: match[1],
    });

    lastIdx = end;
  }

  if (lastIdx < text.length) {
    result.push({
      type: 'text',
      content: text.slice(lastIdx),
    });
  }

  return result;
}
