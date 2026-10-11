import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { today } from "./dates.ts";
import { migrate, seedSampleData } from "./queries.ts";

/**
 * Modo de demonstração pública (ligado sozinho na Vercel, ou com FINTRACK_DEMO=1).
 * Nesse tipo de hospedagem só a pasta temporária aceita escrita e ela é apagada quando o
 * servidor reinicia, então o banco fica lá e já nasce com dados de exemplo.
 */
export const IS_DEMO = process.env.FINTRACK_DEMO === "1" || process.env.VERCEL === "1";

/** Teto de lançamentos na demonstração, para ninguém encher o disco do servidor. */
export const DEMO_LIMIT = 300;

function databaseFile(): string {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  if (IS_DEMO) return path.join(tmpdir(), "fintrack-demo.db");
  return path.join(process.cwd(), "data", "fintrack.db");
}

// Guardada no globalThis para o recarregamento do `next dev` não abrir uma conexão a cada edição.
const globalForDb = globalThis as typeof globalThis & { __fintrackDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.__fintrackDb) {
    const file = databaseFile();
    mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    migrate(db);
    if (IS_DEMO) seedSampleData(db, today());
    globalForDb.__fintrackDb = db;
  }
  return globalForDb.__fintrackDb;
}
