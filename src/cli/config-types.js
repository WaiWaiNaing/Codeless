/**
 * @typedef {Object} CodelessConfig
 * @property {string} [entry='./api.cls']
 * @property {{ server: string, types: string }} [output]
 * @property {'sqlite'|'postgres'} [adapter='sqlite']
 * @property {{ sqlite: { path: string }, postgres: { connectionString?: string, ssl?: object } }} [database]
 * @property {{ port: number }} [server]
 * @property {{ table: string, dir: string }} [migrations]
 * @property {import('../runtime/index.js').CodelessPlugin[]} [plugins]
 */

export default {};
