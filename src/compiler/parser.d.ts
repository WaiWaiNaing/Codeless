export interface FieldDef {
  name: string;
  type: string;
  optional?: boolean;
  args?: Record<string, unknown>;
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

export interface AST {
  dataBlocks: DataBlock[];
  doBlocks: DoBlock[];
  routeLines: RouteLine[];
  migrations: unknown[];
}

export function parse(source: string): AST;
