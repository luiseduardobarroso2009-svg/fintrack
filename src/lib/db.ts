import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { migrate } from "./queries.ts";

// Guardada no globalThis para o recarregamento do `next dev` não abrir uma conexão a cada edição.
const globalForDb = globalThis as typeof globalThis & { __fintrackDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.__fintrackDb) {
    const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "fintrack.db");
    mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    migrate(db);
    globalForDb.__fintrackDb = db;
  }
  return globalForDb.__fintrackDb;
}
