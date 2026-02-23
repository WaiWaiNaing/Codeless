/**
 * Codeless v4 – Consistent error type for API and DB errors
 */

export class CodelessError extends Error {
  /**
   * @param {string} message
   * @param {number} [status=500]
   */
  constructor(message, status = 500) {
    super(message);
    this.name = 'CodelessError';
    this.status = status;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, CodelessError);
    }
  }
}

/**
 * Normalize any thrown value to a CodelessError. Preserves status if present.
 * Maps common DB errors to user-friendly messages and status codes.
 * @param {unknown} err
 * @returns {CodelessError}
 */
export function toCodelessError(err) {
  if (err instanceof CodelessError) return err;
  const status = err && typeof err === 'object' && 'status' in err ? Number(err.status) : undefined;
  const message = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';

  let finalStatus = status;
  let finalMessage = message;

  if (!finalStatus) {
    if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') {
      finalStatus = 400;
      finalMessage = 'Invalid JSON body';
    } else if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || code === '23505') {
      finalStatus = 409;
      finalMessage = 'Resource already exists';
    } else if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || code === '23503') {
      finalStatus = 400;
      finalMessage = 'Invalid reference';
    } else if (code === 'SQLITE_CONSTRAINT_NOTNULL' || code === '23502') {
      finalStatus = 400;
      finalMessage = message || 'Required value missing';
    } else if (code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED') {
      finalStatus = 503;
      finalMessage = 'Database busy, please retry';
    } else if (message && (message.includes('ECONNREFUSED') || message.includes('ENOENT'))) {
      finalStatus = 503;
      finalMessage = 'Service temporarily unavailable';
    } else {
      finalStatus = 500;
      finalMessage = message || 'Internal server error';
    }
  }

  return new CodelessError(finalMessage, finalStatus);
}

export default CodelessError;
