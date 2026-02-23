/**
 * Codeless v4 – Auth (JWT Bearer middleware + sign helper for login)
 */

import jwt from 'jsonwebtoken';

const DEV_SECRET = 'changeme-secret';

function getDefaultSecret() {
  const secret = process.env.JWT_SECRET || DEV_SECRET;
  if (process.env.NODE_ENV === 'production' && (secret === DEV_SECRET || !process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET must be set in production. Do not use the default secret.');
  }
  return secret;
}

/** Lazy so we only enforce in production when auth is actually used. */
function defaultSecret() {
  return getDefaultSecret();
}

/**
 * Sign a JWT payload (e.g. for login). Uses JWT_SECRET.
 * @param {object} payload - Claims (e.g. { sub: userId, username })
 * @param {{ expiresIn?: string }} [opts] - Optional expiresIn (default '1h')
 */
export function signToken(payload, opts = {}) {
  return jwt.sign(
    payload,
    defaultSecret(),
    { algorithm: 'HS256', expiresIn: opts.expiresIn ?? '1h' }
  );
}

/**
 * @param {{ secret?: string }} [options]
 */
export function createAuth(options = {}) {
  const secret = options.secret ?? defaultSecret();

  function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
    }
    const token = header.slice(7);
    try {
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { authMiddleware };
}

// Default export for generated code: single middleware
const { authMiddleware } = createAuth();
export { authMiddleware };
