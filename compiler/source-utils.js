/**
 * Locate opening brace at token's line in source; extract content to matching closing brace.
 */

export function locateBraceInSource(source, line) {
  let currentLine = 1;
  let i = 0;
  while (i < source.length) {
    if (currentLine === line) {
      while (i < source.length && source[i] !== '{') i++;
      return i;
    }
    if (source[i] === '\n') currentLine++;
    i++;
  }
  throw new Error(`Line ${line} not found in source`);
}

export function extractRawBlock(source, openBraceIndex) {
  let depth = 1;
  let i = openBraceIndex + 1;
  while (i < source.length && depth > 0) {
    const c = source[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < source.length) {
        if (source[i] === '\\') {
          i += 2;
          continue;
        }
        if (source[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  if (depth !== 0) throw new Error('Unbalanced braces');
  return { body: source.slice(openBraceIndex + 1, i - 1).trim(), endIndex: i };
}
