// ======================================================================
// Cloudflare D1 Types & Interfaces
// Fully compatible with @cloudflare/workers-types D1 API
// ======================================================================

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration?: number;
    size_after?: number;
    rows_read?: number;
    rows_written?: number;
    last_row_id?: number;
    changes?: number;
    [key: string]: any;
  };
  error?: string;
}

export interface D1Response {
  success: boolean;
  meta: {
    duration?: number;
    size_after?: number;
    rows_read?: number;
    rows_written?: number;
    last_row_id?: number;
    changes?: number;
    [key: string]: any;
  };
  error?: string;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Response>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface CloudflareEnv {
  DB: D1Database;
  [key: string]: any;
}
