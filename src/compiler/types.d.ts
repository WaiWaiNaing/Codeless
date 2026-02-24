/**
 * Type definitions for Codeless AST
 */

export interface FieldDef {
  name: string;
  type: string;
  optional: boolean;
  args: Record<string, any>;
}

export interface DataBlock {
  name: string;
  fields: FieldDef[];
}

export interface DoBlock {
  name: string;
  body: string;
  line: number;
}

export type PipelineStep =
  | { kind: 'validate'; schema: string }
  | { kind: 'auth' }
  | { kind: 'action'; name: string };

export interface RouteLine {
  method: string;
  path: string;
  pipeline: PipelineStep[];
}

export interface Migration {
  version: string;
  operations: Array<{
    op: string;
    table: string;
    column?: string;
    type?: string;
  }>;
}

export interface AST {
  dataBlocks: DataBlock[];
  doBlocks: DoBlock[];
  routeLines: RouteLine[];
  migrations: Migration[];
  imports?: Array<{ path: string }>;
}
