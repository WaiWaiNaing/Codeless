/**
 * Codeless v4 – Plugin interface (extensible without changing core)
 */

/**
 * @typedef {Object} CodelessPlugin
 * @property {function(object): void} [onRouteRegister] – called when a route is registered
 * @property {function(object): Promise<object>|object} [beforeAction] – run before action; can mutate ctx
 * @property {function(any): Promise<any>|any} [afterAction] – run after action; can transform result
 */

/**
 * Run beforeAction hooks in order
 * @param {CodelessPlugin[]} plugins
 * @param {object} ctx
 */
export async function runBeforeAction(plugins, ctx) {
  let current = ctx;
  for (const p of plugins) {
    if (p.beforeAction) current = await Promise.resolve(p.beforeAction(current)) ?? current;
  }
  return current;
}

/**
 * Run afterAction hooks in order
 * @param {CodelessPlugin[]} plugins
 * @param {any} result
 */
export async function runAfterAction(plugins, result) {
  let current = result;
  for (const p of plugins) {
    if (p.afterAction) current = await Promise.resolve(p.afterAction(current)) ?? current;
  }
  return current;
}
