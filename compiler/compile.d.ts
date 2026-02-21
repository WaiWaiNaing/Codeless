export interface CodelessConfig {
  root: string;
  entry: string;
  output: { server: string; types: string };
  adapter: string;
  database: Record<string, unknown>;
  server: { port?: number };
  migrations: { table: string; dir: string };
  plugins: unknown[];
}

export function loadConfig(rootDir?: string): Promise<CodelessConfig>;

export function compile(
  rootDir?: string
): Promise<{ config: CodelessConfig; output: { server: string; types: string } }>;
