/**
 * Codeless v4 – Default configuration values
 * Single source of truth for compiler, CLI, and runtime.
 */

export const DEFAULTS = Object.freeze({
  PORT: 3000,
  HOST: '0.0.0.0',
  DB_FILE: 'codeless.db',
  DB_FILE_TEST: 'codeless.test.db',
  /** Dev-only default; production must set JWT_SECRET in the environment. */
  JWT_SECRET: 'changeme-secret',
  LOG_LEVEL: 'info',
});

/**
 * @param {string} [key] - Env key (e.g. 'PORT'). Returns process.env[key] or default.
 */
export function env(key) {
  switch (key) {
    case 'PORT':
      return process.env.PORT != null ? process.env.PORT : String(DEFAULTS.PORT);
    case 'HOST':
      return process.env.HOST || DEFAULTS.HOST;
    case 'DB_FILE':
      return process.env.DB_FILE || (process.env.NODE_ENV === 'test' ? DEFAULTS.DB_FILE_TEST : DEFAULTS.DB_FILE);
    case 'JWT_SECRET':
      return process.env.JWT_SECRET || DEFAULTS.JWT_SECRET;
    case 'LOG_LEVEL':
      return process.env.LOG_LEVEL || DEFAULTS.LOG_LEVEL;
    default:
      return process.env?.[key];
  }
}

export default DEFAULTS;
