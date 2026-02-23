/**
 * Codeless v4 – Config and resolved config types
 */

/**
 * @typedef {Object} CodelessPlugin
 * @property {function(object): void} [onRouteRegister]
 * @property {function(object): Promise<object>|object} [beforeAction]
 * @property {function(any): Promise<any>|any} [afterAction]
 */

/**
 * @typedef {Object} CodelessConfig
 * @property {string} [entry='./api.cls']
 * @property {{ server?: string, types?: string }} [output]
 * @property {'sqlite'|'postgres'} [adapter='sqlite']
 * @property {{ sqlite?: { path?: string }, postgres?: { connectionString?: string, ssl?: object } }} [database]
 * @property {{ port?: number }} [server]
 * @property {{ table?: string, dir?: string }} [migrations]
 * @property {CodelessPlugin[]} [plugins]
 */

/**
 * @typedef {Object} ResolvedConfig
 * @property {string} root
 * @property {string} entry
 * @property {{ server: string, types: string }} output
 * @property {'sqlite'|'postgres'} adapter
 * @property {object} database
 * @property {{ port?: number }} server
 * @property {{ table: string, dir: string }} migrations
 * @property {CodelessPlugin[]} plugins
 */

export default {};
