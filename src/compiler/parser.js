/**
 * Codeless v4 – Parser (AST for data, do, route, migration)
 */

import { lex, TT } from './lexer.js';
import { locateBraceInSource, extractRawBlock } from './source-utils.js';

/**
 * @typedef {Object} AST
 * @property {DataBlock[]} dataBlocks
 * @property {DoBlock[]} doBlocks
 * @property {RouteLine[]} routeLines
 * @property {Migration[]} migrations
 * @property {ImportStatement[]} imports
 */

/**
 * @param {string} source
 * @returns {AST}
 */
export function parse(source) {
  const tokens = lex(source);
  let pos = 0;

  function peek(o = 0) {
    return tokens[pos + o];
  }
  function consume(type, value) {
    const t = tokens[pos];
    if (!t) throw new Error('Unexpected end of file');
    if (type && t.type !== type) throw new Error(`Line ${t.line}: expected ${type}, got ${t.type}`);
    if (value !== undefined && t.value !== value) throw new Error(`Line ${t.line}: expected "${value}"`);
    pos++;
    return t;
  }
  function check(type, value) {
    const t = tokens[pos];
    return t && t.type === type && (value === undefined || t.value === value);
  }

  const ast = { dataBlocks: [], doBlocks: [], routeLines: [], migrations: [], imports: [] };

  while (!check(TT.EOF)) {
    if (check(TT.KEYWORD, 'import')) {
      consume(TT.KEYWORD);
      const path = consume(TT.STRING).value;
      ast.imports.push({ path });
      continue;
    }

    if (check(TT.KEYWORD, 'data')) {
      consume(TT.KEYWORD);
      const name = consume(TT.IDENT).value;
      consume(TT.LBRACE);
      const fields = [];
      while (!check(TT.RBRACE) && !check(TT.EOF)) {
        if (check(TT.COMMA)) {
          consume(TT.COMMA);
          continue;
        }
        const fieldName = consume(TT.IDENT).value;
        consume(TT.COLON);
        const typeTok = consume(TT.IDENT);
        let typeName = typeTok.value;
        let typeArgs = {};
        if (check(TT.LPAREN)) {
          consume(TT.LPAREN);
          while (!check(TT.RPAREN) && !check(TT.EOF)) {
            if (check(TT.PIPE) || check(TT.COMMA)) {
              consume(tokens[pos].type);
              continue;
            }
            const k = consume(TT.IDENT).value;
            if (check(TT.COLON)) {
              consume(TT.COLON);
              const v = consume(TT.IDENT).value;
              typeArgs[k] = isNaN(Number(v)) ? v : Number(v);
            } else {
              if (!typeArgs.enum) typeArgs.enum = [];
              typeArgs.enum.push(k);
            }
          }
          consume(TT.RPAREN);
        }
        const optional = check(TT.QUESTION) ? (consume(TT.QUESTION), true) : false;
        fields.push({ name: fieldName, type: typeName, optional, args: typeArgs });
      }
      consume(TT.RBRACE);
      ast.dataBlocks.push({ name, fields });
      continue;
    }

    if (check(TT.KEYWORD, 'do')) {
      const kw = consume(TT.KEYWORD);
      const name = consume(TT.IDENT).value;
      consume(TT.LPAREN);
      while (!check(TT.RPAREN) && !check(TT.EOF)) {
        if (check(TT.COMMA)) consume(TT.COMMA);
        else pos++;
      }
      consume(TT.RPAREN);
      const lbrace = tokens[pos];
      const openIdx = locateBraceInSource(source, lbrace.line);
      consume(TT.LBRACE);
      const raw = extractRawBlock(source, openIdx);
      let depth = 1;
      while (pos < tokens.length && depth > 0) {
        if (check(TT.LBRACE)) depth++;
        else if (check(TT.RBRACE)) {
          depth--;
          if (depth === 0) {
            consume(TT.RBRACE);
            break;
          }
        }
        pos++;
      }
      ast.doBlocks.push({ name, body: raw.body, line: kw.line });
      continue;
    }

    if (check(TT.KEYWORD, 'route')) {
      consume(TT.KEYWORD);
      consume(TT.LBRACE);
      while (!check(TT.RBRACE) && !check(TT.EOF)) {
        if (!check(TT.HTTP_METHOD)) {
          pos++;
          continue;
        }
        const method = consume(TT.HTTP_METHOD).value;
        const path = consume(TT.STRING).value;
        consume(TT.FAT_ARROW);
        const pipeline = [];
        if (check(TT.LBRACKET)) consume(TT.LBRACKET);
        const inBracket = tokens[pos - 1]?.value === '[';
        while (
          !check(TT.EOF) &&
          !check(TT.HTTP_METHOD) &&
          !check(TT.RBRACE) &&
          !(inBracket && check(TT.RBRACKET))
        ) {
          if (check(TT.COMMA)) {
            consume(TT.COMMA);
            continue;
          }
          const ident = consume(TT.IDENT).value;
          if (ident === 'validate' && check(TT.LPAREN)) {
            consume(TT.LPAREN);
            const schema = consume(TT.IDENT).value;
            consume(TT.RPAREN);
            pipeline.push({ kind: 'validate', schema });
          } else if (ident === 'auth') {
            pipeline.push({ kind: 'auth' });
          } else {
            pipeline.push({ kind: 'action', name: ident });
          }
        }
        if (inBracket && check(TT.RBRACKET)) consume(TT.RBRACKET);
        ast.routeLines.push({ method, path, pipeline });
      }
      consume(TT.RBRACE);
      continue;
    }

    if (check(TT.KEYWORD, 'migration')) {
      consume(TT.KEYWORD);
      const version = consume(TT.STRING).value;
      consume(TT.LBRACE);
      const operations = [];
      while (!check(TT.RBRACE) && !check(TT.EOF)) {
        const op = consume(TT.IDENT).value;
        const table = consume(TT.STRING).value;
        if (op === 'addColumn') {
          const column = consume(TT.IDENT).value;
          const type = consume(TT.IDENT).value;
          operations.push({ op, table, column, type });
        } else if (op === 'dropColumn') {
          const column = consume(TT.IDENT).value;
          operations.push({ op, table, column });
        } else {
          operations.push({ op, table });
        }
      }
      consume(TT.RBRACE);
      ast.migrations.push({ version, operations });
      continue;
    }

    pos++;
  }

  return ast;
}
