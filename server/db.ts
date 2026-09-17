// ======================================================================
// NextGen Learn — Database Repository Bridge
// Unified D1 SQL Database Layer (Cloudflare D1 & Local SQLite Engine)
// ======================================================================

import { d1Repository } from './d1/repository.ts';
import { initializeD1Database, getD1Database, setD1Database } from './d1/client.ts';

// Automatically ensure D1 schema and seeds are loaded on startup
initializeD1Database().catch((err) => {
  console.error('[Database Engine] Failed to initialize Cloudflare D1 storage:', err);
});

// Re-export the typed repository as `db` for all API routes and controllers
export const db = d1Repository;

// Export D1 lifecycle helpers for Cloudflare Workers / Pages Functions
export { initializeD1Database, getD1Database, setD1Database };
export * from './d1/types.ts';
