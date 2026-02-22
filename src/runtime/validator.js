/**
 * Codeless v4 – Validator (schema def → middleware + validate function)
 */

/**
 * @param {string} tableName
 * @param {Record<string,{ type: string, required?: boolean, min?: number, max?: number, enum?: string[] }>} schema
 */
export function createValidator(tableName, schema) {
  function validate(data) {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      const err = new Error(`${tableName}: body must be a plain object`);
      err.status = 400;
      throw err;
    }
    const result = {};
    for (const [key, opts] of Object.entries(schema)) {
      const value = data[key];
      if (value === undefined || value === null) {
        if (opts.required !== false) {
          const err = new Error(`${tableName}: missing required field "${key}"`);
          err.status = 400;
          throw err;
        }
        result[key] = null;
        continue;
      }
      if (opts.type === 'string' && typeof value !== 'string') {
        const err = new Error(`${tableName}: "${key}" must be a string`);
        err.status = 400;
        throw err;
      }
      if (opts.type === 'number') {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          const err = new Error(`${tableName}: "${key}" must be a number`);
          err.status = 400;
          throw err;
        }
        if (opts.min !== undefined && n < opts.min) throw Object.assign(new Error(`${tableName}: "${key}" must be >= ${opts.min}`), { status: 400 });
        if (opts.max !== undefined && n > opts.max) throw Object.assign(new Error(`${tableName}: "${key}" must be <= ${opts.max}`), { status: 400 });
        result[key] = n;
        continue;
      }
      if (opts.type === 'string' || opts.type === 'enum') {
        if (typeof value !== 'string') throw Object.assign(new Error(`${tableName}: "${key}" must be a string`), { status: 400 });
        if (opts.min !== undefined && value.length < opts.min) throw Object.assign(new Error(`${tableName}: "${key}" too short`), { status: 400 });
        if (opts.max !== undefined && value.length > opts.max) throw Object.assign(new Error(`${tableName}: "${key}" too long`), { status: 400 });
        if (opts.enum && !opts.enum.includes(value)) throw Object.assign(new Error(`${tableName}: "${key}" must be one of ${opts.enum.join(', ')}`), { status: 400 });
        result[key] = value;
        continue;
      }
      result[key] = value;
    }
    return result;
  }

  function middleware() {
    return (req, res, next) => {
      try {
        req.validated = validate(req.body ?? {});
        next();
      } catch (err) {
        const status = err?.status ?? 400;
        const message = err instanceof Error ? err.message : String(err);
        res.status(status).json({ error: message, message });
      }
    };
  }

  return { validate, middleware: () => middleware };
}
