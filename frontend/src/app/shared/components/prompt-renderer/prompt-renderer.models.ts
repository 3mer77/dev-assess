export type PromptSegment =
  | {
      type: 'text';
      content: string;
    }
  | {
      type: 'code';
      content: string;
      language?: string;
      formattedLanguage: string;
    };

/**
 * Maps raw language identifiers to human-friendly display labels.
 */
export function formatLanguageLabel(lang?: string): string {
  if (!lang || !lang.trim()) return 'Code';
  const l = lang.trim().toLowerCase();

  switch (l) {
    case 'csharp':
    case 'c#':
    case 'cs':
    case 'dotnet':
      return 'C#';
    case 'typescript':
    case 'ts':
      return 'TypeScript';
    case 'javascript':
    case 'js':
      return 'JavaScript';
    case 'sql':
    case 'tsql':
    case 'pgsql':
    case 'postgresql':
    case 'mysql':
      return 'SQL';
    case 'json':
      return 'JSON';
    case 'html':
      return 'HTML';
    case 'css':
    case 'scss':
      return 'CSS';
    case 'http':
      return 'HTTP';
    case 'bash':
    case 'sh':
    case 'shell':
    case 'zsh':
    case 'powershell':
    case 'ps1':
      return 'Bash';
    case 'python':
    case 'py':
      return 'Python';
    case 'rust':
    case 'rs':
      return 'Rust';
    case 'go':
    case 'golang':
      return 'Go';
    case 'java':
      return 'Java';
    case 'yaml':
    case 'yml':
      return 'YAML';
    case 'text':
    case 'txt':
    case 'plaintext':
      return 'Text';
    default:
      return lang.charAt(0).toUpperCase() + lang.slice(1);
  }
}

/**
 * Safely parses a challenge prompt containing optional triple-backtick fenced code blocks
 * into an ordered list of text and code segments without relying on innerHTML.
 * Handles malformed/unclosed fences gracefully.
 */
export function parsePromptSegments(rawPrompt: string): PromptSegment[] {
  if (!rawPrompt) return [];

  const segments: PromptSegment[] = [];
  const fence = '```';
  let currentIndex = 0;

  while (currentIndex < rawPrompt.length) {
    const startIndex = rawPrompt.indexOf(fence, currentIndex);

    // If no more code fences exist, the rest is plain text
    if (startIndex === -1) {
      const text = rawPrompt.substring(currentIndex);
      if (text.length > 0) {
        segments.push({ type: 'text', content: text });
      }
      break;
    }

    // Text prior to the code fence
    if (startIndex > currentIndex) {
      const text = rawPrompt.substring(currentIndex, startIndex);
      if (text.length > 0) {
        segments.push({ type: 'text', content: text });
      }
    }

    const afterFenceIndex = startIndex + fence.length;
    const nextNewlineIndex = rawPrompt.indexOf('\n', afterFenceIndex);

    let langTag = '';
    let codeStartIndex = afterFenceIndex;
    let closingIndex = -1;

    if (nextNewlineIndex !== -1) {
      // The opening line might contain a language tag before the newline
      langTag = rawPrompt.substring(afterFenceIndex, nextNewlineIndex).trim();
      codeStartIndex = nextNewlineIndex + 1;
      closingIndex = rawPrompt.indexOf(fence, codeStartIndex);
    } else {
      // Opening fence without trailing newline
      closingIndex = rawPrompt.indexOf(fence, afterFenceIndex);
    }

    if (closingIndex !== -1) {
      // Fully closed code fence
      const rawCode = rawPrompt.substring(codeStartIndex, closingIndex);
      const cleanedCode = cleanCodeContent(rawCode);

      segments.push({
        type: 'code',
        content: cleanedCode,
        language: langTag || undefined,
        formattedLanguage: formatLanguageLabel(langTag),
      });

      currentIndex = closingIndex + fence.length;
    } else {
      // Malformed / unclosed fence - treat remaining content as code block gracefully
      const rawCode =
        codeStartIndex < rawPrompt.length
          ? rawPrompt.substring(codeStartIndex)
          : '';
      const cleanedCode = cleanCodeContent(rawCode);

      segments.push({
        type: 'code',
        content: cleanedCode,
        language: langTag || undefined,
        formattedLanguage: formatLanguageLabel(langTag),
      });

      break;
    }
  }

  return segments;
}

/**
 * Trims single leading or trailing newline artifacts while preserving internal indentation.
 */
function cleanCodeContent(code: string): string {
  return code.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
}
