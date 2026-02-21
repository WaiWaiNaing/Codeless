#!/usr/bin/env node
/**
 * Codeless v4 – Build (compile api.cls → generated/server.js + types.d.ts)
 */

import { compile } from '../compiler/compile.js';

async function main() {
  const { output } = await compile();
  console.log('Codeless v4 build OK:', output.server, output.types);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
