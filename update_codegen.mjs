import fs from 'fs';
let content = fs.readFileSync('src/compiler/codegen.js', 'utf8');

// replace the aot_db generation segment
const aotStart = content.indexOf('  // AOT Database Wrappers');
const aotEnd = content.indexOf('  // 2. Static Validation Pre-calculation');

let newAot = `  // AOT Database Wrappers (Replaces sugar)
  server += \`\\n// AOT Database Helpers\\nconst aot_db = {\\n\`;
  for (const b of ast.dataBlocks) {
    const t = b.name;
    const args = b.fields.map(f => \`data.\${f.name}\`);
    const allowedCols = JSON.stringify(['id', ...b.fields.map(f => f.name)]);
    server += \`  \${t}: {\\n\`;
    if (adapter === 'sqlite') {
      server += \`    save: (data) => { const r = PREP['\${t}'].insert.run(\${args.join(', ')}); return { id: r.lastInsertRowid }; },\\n\`;
      server += \`    update: (id, data) => PREP['\${t}'].update.run(\${args.join(', ')}, id),\\n\`;
      server += \`    remove: (id) => PREP['\${t}'].delete.run(id),\\n\`;
      server += \`    find: (id) => PREP['\${t}'].findById.get(id),\\n\`;
      server += \`    findAll: async (where = {}, orderBy = null) => {
      const allowed = \${allowedCols};
      for (const k of Object.keys(where)) {
        if (!allowed.includes(k)) throw Object.assign(new Error('Invalid where column: ' + k), { status: 400 });
      }
      if (orderBy && !allowed.includes(orderBy.field)) throw Object.assign(new Error('Invalid orderBy column: ' + orderBy.field), { status: 400 });
      return db.findAll('\${t}', where, orderBy);
    }\\n\`;
    } else {
      server += \`    save: async (data) => { const r = await db.pool.query(PREP['\${t}'].insert, [\${args.join(', ')}]); return { id: r.rows[0].id }; },\\n\`;
      server += \`    update: async (id, data) => await db.pool.query(PREP['\${t}'].update, [\${args.join(', ')}, id]),\\n\`;
      server += \`    remove: async (id) => await db.pool.query(PREP['\${t}'].delete, [id]),\\n\`;
      server += \`    find: async (id) => { const r = await db.pool.query(PREP['\${t}'].findById, [id]); return r.rows[0]; },\\n\`;
      server += \`    findAll: async (where = {}, orderBy = null) => {
      const allowed = \${allowedCols};
      for (const k of Object.keys(where)) {
        if (!allowed.includes(k)) throw Object.assign(new Error('Invalid where column: ' + k), { status: 400 });
      }
      if (orderBy && !allowed.includes(orderBy.field)) throw Object.assign(new Error('Invalid orderBy column: ' + orderBy.field), { status: 400 });
      return db.findAll('\${t}', where, orderBy);
    }\\n\`;
    }
    server += \`  },\\n\`;
  }
  server += \`  query: async (sql, ...params) => {
    const trimmed = (typeof sql === 'string' ? sql : '').trim();
    if (!trimmed.toUpperCase().startsWith('SELECT')) {
      throw Object.assign(new Error('sugar.query() is restricted to SELECT statements only.'), { status: 403 });
    }
    return db.query(sql, params);
  }\\n};\\n\\n\`;
`;

content = content.substring(0, aotStart) + newAot + content.substring(aotEnd);

// Also replace the regex for sugar.all to use aot_db.Table.findAll
content = content.replace(/body = body\.replace\(\/sugar\\\.all\\\(\\\s\*'\(\[\^'\]\+\)'\\\s\*\(\,\\s\*\[\^\)\]\+\)\?\\\)\/g, "db\\.findAll\\('\$1'\$2\\)"\);/, 'body = body.replace(/sugar\\.all\\(\\s*\\\'([^\']+)\\\'\\s*(,\\s*[^)]+)?\\)/g, "aot_db.$1.findAll($2)");');

fs.writeFileSync('src/compiler/codegen.js', content, 'utf8');
