import { connection } from "next/server";

import { isMonth, today } from "./dates.ts";
import { getDb, IS_DEMO } from "./db.ts";
import {
  balanceUntil,
  countTransactions,
  expensesByCategory,
  lastMonths,
  listCategories,
  listTransactions,
  monthTotals,
} from "./queries.ts";

export const HISTORY_MONTHS = 6;

/**
 * Tudo o que o painel mostra, lido a cada requisição.
 * `requestedMonth` vem da URL: se faltar ou for inválido, vale o mês atual.
 */
export async function getDashboard(requestedMonth: unknown) {
  // O relógio e o driver síncrono do SQLite só podem ser lidos depois disto. Sem esta linha,
  // o Next executaria tudo no build e serviria para sempre os números daquele momento.
  await connection();

  const now = today();
  const thisMonth = now.slice(0, 7);
  const month = isMonth(requestedMonth) ? requestedMonth : thisMonth;

  const db = getDb();
  return {
    month,
    thisMonth,
    today: now,
    categories: listCategories(db),
    transactions: listTransactions(db, month),
    totals: monthTotals(db, month),
    balanceCents: balanceUntil(db, month),
    history: lastMonths(db, month, HISTORY_MONTHS),
    byCategory: expensesByCategory(db, month),
    isEmpty: countTransactions(db) === 0,
    isDemo: IS_DEMO,
  };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
