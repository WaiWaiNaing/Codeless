/**
 * Codeless v4 – Type definitions for AST (JSDoc for IDE/type gen)
 */

/**
 * @typedef {{ name: string, type: string, optional: boolean, args: Record<string,any> }} FieldDef
 * @typedef {{ name: string, fields: FieldDef[] }} DataBlock
 * @typedef {{ name: string, body: string, line: number }} DoBlock
 * @typedef {{ kind: 'validate', schema: string }|{ kind: 'auth' }|{ kind: 'action', name: string }} PipelineStep
 * @typedef {{ method: string, path: string, pipeline: PipelineStep[] }} RouteLine
 * @typedef {{ version: string, operations: { op: string, table: string, column?: string, type?: string }[] }} Migration
 * @typedef {{ dataBlocks: DataBlock[], doBlocks: DoBlock[], routeLines: RouteLine[], migrations: Migration[] }} AST
 */

export default {};
