/**
 * Codeless v4 – Lexer (structure only; do-body is extracted from source)
 */

export const TT = {
  KEYWORD: 'KEYWORD',
  IDENT: 'IDENT',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
  LBRACKET: 'LBRACKET',
  RBRACKET: 'RBRACKET',
  STRING: 'STRING',
  FAT_ARROW: 'FAT_ARROW',
  COMMA: 'COMMA',
  COLON: 'COLON',
  PIPE: 'PIPE',
  QUESTION: 'QUESTION',
  HTTP_METHOD: 'HTTP_METHOD',
  EOF: 'EOF',
};

const KEYWORDS = new Set(['data', 'do', 'route', 'migration', 'import']);
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

export function lex(source) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let column = 1;

  function peek(offset = 0) {
    return source[i + offset];
  }
  function advance() {
    const c = source[i++];
    if (c === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
    return c;
  }
  function add(type, value) {
    tokens.push({ type, value, line, column });
  }

  while (i < source.length) {
    if (/\s/.test(peek())) {
      advance();
      continue;
    }
    if (peek() === '/' && peek(1) === '/') {
      while (i < source.length && peek() !== '\n') advance();
      continue;
    }
    if (peek() === '/' && peek(1) === '*') {
      advance();
      advance();
      while (i < source.length && !(peek() === '*' && peek(1) === '/')) advance();
      advance();
      advance();
      continue;
    }
    if (peek() === '=' && peek(1) === '>') {
      advance();
      advance();
      add(TT.FAT_ARROW, '=>');
      continue;
    }
    const singles = {
      '{': TT.LBRACE, '}': TT.RBRACE, '(': TT.LPAREN, ')': TT.RPAREN,
      '[': TT.LBRACKET, ']': TT.RBRACKET, ',': TT.COMMA, ':': TT.COLON,
      '|': TT.PIPE, '?': TT.QUESTION,
    };
    if (singles[peek()]) {
      add(singles[peek()], advance());
      continue;
    }
    if (peek() === '"') {
      advance();
      let s = '';
      while (i < source.length && peek() !== '"') {
        if (peek() === '\\') {
          advance();
          s += advance();
        } else s += advance();
      }
      if (i < source.length) advance();
      add(TT.STRING, s);
      continue;
    }
    if (/[a-zA-Z_]/.test(peek())) {
      let word = '';
      while (i < source.length && /[\w]/.test(peek())) word += advance();
      if (KEYWORDS.has(word)) add(TT.KEYWORD, word);
      else if (HTTP_METHODS.has(word)) add(TT.HTTP_METHOD, word);
      else add(TT.IDENT, word);
      continue;
    }
    if (/\d/.test(peek())) {
      let n = '';
      while (i < source.length && /[\d.]/.test(peek())) n += advance();
      add(TT.IDENT, n);
      continue;
    }
    advance();
  }

  add(TT.EOF, null);
  return tokens;
}
