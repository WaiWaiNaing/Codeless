/**
 * Codeless v4 – Higher-order route wrapper for consistent error handling
 * Keeps generated route handlers lean: one try/catch, CodelessError normalization.
 */

import { toCodelessError } from './errors.js';

/**
 * Wrap an async route handler so all errors are caught and returned as JSON.
 * Uses CodelessError status when present; otherwise normalizes DB/other errors.
 * @param {(req: import('express').Request, res: import('express').Response) => Promise<void>} handler
 * @returns {(req: import('express').Request, res: import('express').Response) => void}
 */
export function wrapAction(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((err) => {
      if (res.headersSent) return;
      const codeless = toCodelessError(err);
      res.status(codeless.status).json({ error: codeless.message, message: codeless.message });
    });
  };
}

export default wrapAction;
