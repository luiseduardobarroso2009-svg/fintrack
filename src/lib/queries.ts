/**
 * Todo o SQL do app fica aqui. As funções recebem a conexão como parâmetro,
 * então os testes rodam contra um banco em memória sem subir o Next.
 */
import type { DatabaseSync } from "node:sqlite";

import { addMonths, monthBounds } from "./dates.ts";
import { DEFAULT_CATEGORIES, SCHEMA, type Kind } from "./schema.ts";
import type { TransactionInput } from "./validation.ts";

export type Category = { id: number; name: string; kind: Kind };
export type Transaction = {
  id: number;
  description: string;
  amountCents: number;
  occurredOn: string;
  categoryName: string;
  kind: Kind;
};
export type Totals = { incomeCents: number; expenseCents: number };
export type MonthTotals = Totals & { month: string };
export type CategoryTotal = { name: string; totalCents: number };

type Param = string | number;

// O node:sqlite devolve linhas sem protótipo, e o React recusa esse tipo de objeto ao
// passar dados para componentes de cliente. Copiar para um objeto comum resolve.
function all<T>(db: DatabaseSync, sql: string, ...params: Param[]): T[] {
  return db
    .prepare(sql)
    .all(...params)
    .map((row) => ({ ...row }) as T);
}

function one<T>(db: DatabaseSync, sql: string, ...params: Param[]): T | undefined {
  const row = db.prepare(sql).get(...params);
  return row === undefined ? undefined : ({ ...row } as T);
}

// Soma entradas e saídas numa passada só, olhando o tipo da categoria.
const TOTALS = `
  COALESCE(SUM(CASE WHEN c.kind = 'income'  THEN t.amount_cents END), 0) AS incomeCents,
  COALESCE(SUM(CASE WHEN c.kind = 'expense' THEN t.amount_cents END), 0) AS expenseCents
`;

/** Cria as tabelas e as categorias padrão. Pode rodar várias vezes sem duplicar nada. */
export function migrate(db: DatabaseSync): void {
  db.exec(SCHEMA);
  const insert = db.prepare("INSERT OR IGNORE INTO categories (name, kind) VALUES (?, ?)");
  for (const [name, kind] of DEFAULT_CATEGORIES) insert.run(name, kind);
}

export function listCategories(db: DatabaseSync): Category[] {
  return all<Category>(db, "SELECT id, name, kind FROM categories ORDER BY kind = 'expense', id");
}

export function categoryExists(db: DatabaseSync, id: number): boolean {
  return one(db, "SELECT 1 AS found FROM categories WHERE id = ?", id) !== undefined;
}

export function insertTransaction(db: DatabaseSync, input: TransactionInput): number {
  const result = db
    .prepare("INSERT INTO transactions (description, amount_cents, occurred_on, category_id) VALUES (?, ?, ?, ?)")
    .run(input.description, input.amountCents, input.occurredOn, input.categoryId);
  return Number(result.lastInsertRowid);
}

export function deleteTransaction(db: DatabaseSync, id: number): boolean {
  return db.prepare("DELETE FROM transactions WHERE id = ?").run(id).changes > 0;
}

export function countTransactions(db: DatabaseSync): number {
  return one<{ total: number }>(db, "SELECT COUNT(*) AS total FROM transactions")!.total;
}

export function listTransactions(db: DatabaseSync, month: string): Transaction[] {
  const { start, end } = monthBounds(month);
  return all<Transaction>(
    db,
    `SELECT t.id, t.description, t.amount_cents AS amountCents, t.occurred_on AS occurredOn,
            c.name AS categoryName, c.kind
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      WHERE t.occurred_on >= ? AND t.occurred_on < ?
      ORDER BY t.occurred_on DESC, t.id DESC`,
    start,
    end,
  );
}

export function monthTotals(db: DatabaseSync, month: string): Totals {
  const { start, end } = monthBounds(month);
  return one<Totals>(
    db,
    `SELECT ${TOTALS}
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      WHERE t.occurred_on >= ? AND t.occurred_on < ?`,
    start,
    end,
  )!;
}

/** Saldo acumulado de tudo o que aconteceu até o fim do mês informado. */
export function balanceUntil(db: DatabaseSync, month: string): number {
  const totals = one<Totals>(
    db,
    `SELECT ${TOTALS}
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      WHERE t.occurred_on < ?`,
    monthBounds(month).end,
  )!;
  return totals.incomeCents - totals.expenseCents;
}

/** Totais dos últimos `count` meses terminando em `month`. Mês sem lançamento vem zerado. */
export function lastMonths(db: DatabaseSync, month: string, count: number): MonthTotals[] {
  const first = addMonths(month, 1 - count);
  const rows = all<MonthTotals>(
    db,
    `SELECT substr(t.occurred_on, 1, 7) AS month, ${TOTALS}
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      WHERE t.occurred_on >= ? AND t.occurred_on < ?
      GROUP BY substr(t.occurred_on, 1, 7)`,
    monthBounds(first).start,
    monthBounds(month).end,
  );
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return Array.from({ length: count }, (_, i) => {
    const current = addMonths(first, i);
    return byMonth.get(current) ?? { month: current, incomeCents: 0, expenseCents: 0 };
  });
}

export function expensesByCategory(db: DatabaseSync, month: string): CategoryTotal[] {
  const { start, end } = monthBounds(month);
  return all<CategoryTotal>(
    db,
    `SELECT c.name, SUM(t.amount_cents) AS totalCents
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      WHERE c.kind = 'expense' AND t.occurred_on >= ? AND t.occurred_on < ?
      GROUP BY c.id
      ORDER BY totalCents DESC, c.name`,
    start,
    end,
  );
}

/**
 * Preenche um banco vazio com seis meses de lançamentos de exemplo, até a data `today`.
 * Não faz nada se já houver lançamentos. Devolve quantos foram criados.
 */
export function seedSampleData(db: DatabaseSync, today: string): number {
  if (countTransactions(db) > 0) return 0;
  const categoryId = new Map(listCategories(db).map((c) => [c.name, c.id]));
  const insert = db.prepare(
    "INSERT INTO transactions (description, amount_cents, occurred_on, category_id) VALUES (?, ?, ?, ?)",
  );
  let created = 0;

  db.exec("BEGIN");
  try {
    for (let back = 5; back >= 0; back--) {
      const month = addMonths(today.slice(0, 7), -back);
      const entries: Array<[day: string, category: string, description: string, cents: number]> = [
        ["05", "Salário", "Salário", 420_000],
        ["08", "Alimentação", "Supermercado", 38_000 + back * 1_200],
        ["10", "Moradia", "Aluguel", 135_000],
        ["12", "Transporte", "Combustível e ônibus", 16_000 + back * 900],
        ["15", "Contas", "Energia e internet", 24_500 + (back % 3) * 1_800],
        ["18", "Freelance", "Site para cliente", 60_000 + back * 15_000],
        ["22", "Alimentação", "Restaurante", 9_500 + back * 700],
        ["25", "Lazer", "Cinema e passeio", 12_000 + (5 - back) * 2_500],
      ];
      if (back % 2 === 0) entries.push(["20", "Saúde", "Farmácia", 18_000]);

      for (const [day, category, description, cents] of entries) {
        const date = `${month}-${day}`;
        if (date > today) continue; // nada de lançamento no futuro
        insert.run(description, cents, date, categoryId.get(category)!);
        created++;
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return created;
}
