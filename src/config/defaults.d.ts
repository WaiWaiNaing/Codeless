/**
 * Type declarations for defaults.js
 */

export const DEFAULTS: {
  readonly PORT: number;
  readonly HOST: string;
  readonly DB_FILE: string;
  readonly DB_FILE_TEST: string;
  readonly JWT_SECRET: string;
  readonly LOG_LEVEL: string;
};

export function env(key: string): string | undefined;

export default typeof DEFAULTS;
