// ======================================================================
// Cloudflare D1 Local Node.js Adapter
// Implements Cloudflare D1Database on top of Node.js 22 native SQLite engine
// ======================================================================

import { DatabaseSync } from 'node:sqlite';
import {
  D1Database,
  D1PreparedStatement,
  D1Result,
  D1Response,
  D1ExecResult,
} from './types.ts';

function normalizeParam(v: any): any {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
    return JSON.stringify(v);
  }
  return v;
}

export class NodeD1PreparedStatement implements D1PreparedStatement {
  private query: string;
  private boundValues: any[];
  private db: DatabaseSync;

  constructor(db: DatabaseSync, query: string, boundValues: any[] = []) {
    this.db = db;
    this.query = query;
    this.boundValues = boundValues;
  }

  bind(...values: any[]): D1PreparedStatement {
    const normalized = values.map(normalizeParam);
    return new NodeD1PreparedStatement(this.db, this.query, normalized);
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    const stmt = this.db.prepare(this.query);
    const row = stmt.get(...this.boundValues) as any;
    if (!row) return null;
    if (colName) {
      return (row[colName] ?? null) as T;
    }
    return row as T;
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    const stmt = this.db.prepare(this.query);
    const rows = stmt.all(...this.boundValues) as T[];
    return {
      results: rows,
      success: true,
      meta: {
        rows_read: rows.length,
        rows_written: 0,
      },
    };
  }

  async run<T = unknown>(): Promise<D1Response> {
    const stmt = this.db.prepare(this.query);
    const res = stmt.run(...this.boundValues);
    return {
      success: true,
      meta: {
        changes: Number(res.changes),
        last_row_id: Number(res.lastInsertRowid),
      },
    };
  }

  async raw<T = unknown>(): Promise<T[]> {
    const stmt = this.db.prepare(this.query);
    const rows = stmt.all(...this.boundValues) as any[];
    return rows.map((r) => Object.values(r)) as T[];
  }
}

export class NodeD1Database implements D1Database {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    // Enforce relational integrity and edge concurrency
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA journal_mode = WAL;');
  }

  prepare(query: string): D1PreparedStatement {
    return new NodeD1PreparedStatement(this.db, query);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        const res = await stmt.all<T>();
        results.push(res);
      }
      this.db.exec('COMMIT;');
      return results;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  async exec(query: string): Promise<D1ExecResult> {
    const start = Date.now();
    this.db.exec(query);
    return {
      count: 1,
      duration: Date.now() - start,
    };
  }
}
