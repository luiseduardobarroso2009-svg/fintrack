import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, test } from "node:test";

import {
  balanceUntil,
  categoryExists,
  countTransactions,
  deleteTransaction,
  expensesByCategory,
  insertTransaction,
  lastMonths,
  listCategories,
  listTransactions,
  migrate,
  monthTotals,
  seedSampleData,
} from "./queries.ts";

let db: DatabaseSync;
let id: Record<string, number>;

beforeEach(() => {
  db = new DatabaseSync(":memory:");
  migrate(db);
  id = Object.fromEntries(listCategories(db).map((c) => [c.name, c.id]));
});

const add = (description: string, amountCents: number, occurredOn: string, category: string) =>
  insertTransaction(db, { description, amountCents, occurredOn, categoryId: id[category] });

test("migrate cria as categorias padrão e pode rodar de novo sem duplicar", () => {
  const before = listCategories(db).length;
  migrate(db);
  assert.equal(listCategories(db).length, before);
  assert.equal(listCategories(db)[0].kind, "income", "entradas vêm antes das saídas");
  assert.ok(categoryExists(db, id["Salário"]));
  assert.equal(categoryExists(db, 9999), false);
});

test("monthTotals soma entradas e saídas só do mês pedido", () => {
  add("Salário", 500_000, "2026-10-05", "Salário");
  add("Aluguel", 120_000, "2026-10-10", "Moradia");
  add("Mercado", 30_050, "2026-10-31", "Alimentação");
  add("Mês anterior", 99_999, "2026-09-30", "Lazer");
  add("Mês seguinte", 99_999, "2026-11-01", "Lazer");

  assert.deepEqual(monthTotals(db, "2026-10"), { incomeCents: 500_000, expenseCents: 150_050 });
  assert.deepEqual(monthTotals(db, "2025-01"), { incomeCents: 0, expenseCents: 0 });
});

test("balanceUntil acumula tudo até o fim do mês", () => {
  add("Salário", 500_000, "2026-09-05", "Salário");
  add("Aluguel", 120_000, "2026-10-10", "Moradia");
  add("Futuro", 70_000, "2026-11-02", "Lazer");

  assert.equal(balanceUntil(db, "2026-09"), 500_000);
  assert.equal(balanceUntil(db, "2026-10"), 380_000);
  assert.equal(balanceUntil(db, "2026-11"), 310_000);
});

test("lastMonths devolve os meses em ordem e preenche os vazios com zero", () => {
  add("Salário", 400_000, "2026-08-05", "Salário");
  add("Contas", 25_000, "2026-10-15", "Contas");

  const history = lastMonths(db, "2026-10", 4);
  assert.deepEqual(
    history.map((m) => [m.month, m.incomeCents, m.expenseCents]),
    [
      ["2026-07", 0, 0],
      ["2026-08", 400_000, 0],
      ["2026-09", 0, 0],
      ["2026-10", 0, 25_000],
    ],
  );
});

test("lastMonths atravessa a virada de ano", () => {
  add("Dezembro", 10_000, "2025-12-20", "Lazer");
  assert.deepEqual(
    lastMonths(db, "2026-01", 3).map((m) => m.month),
    ["2025-11", "2025-12", "2026-01"],
  );
  assert.equal(lastMonths(db, "2026-01", 3)[1].expenseCents, 10_000);
});

test("expensesByCategory agrupa só saídas, da maior para a menor", () => {
  add("Mercado", 30_000, "2026-10-02", "Alimentação");
  add("Padaria", 5_000, "2026-10-03", "Alimentação");
  add("Aluguel", 120_000, "2026-10-10", "Moradia");
  add("Salário", 500_000, "2026-10-05", "Salário");

  assert.deepEqual(
    expensesByCategory(db, "2026-10").map((c) => [c.name, c.totalCents]),
    [
      ["Moradia", 120_000],
      ["Alimentação", 35_000],
    ],
  );
});

test("listTransactions traz o mês do mais recente para o mais antigo, com a categoria", () => {
  add("Primeiro", 1_000, "2026-10-01", "Lazer");
  add("Último", 2_000, "2026-10-20", "Salário");

  const rows = listTransactions(db, "2026-10");
  assert.deepEqual(
    rows.map((t) => [t.description, t.kind, t.categoryName]),
    [
      ["Último", "income", "Salário"],
      ["Primeiro", "expense", "Lazer"],
    ],
  );
});

test("deleteTransaction remove o lançamento e avisa quando o id não existe", () => {
  const created = add("Apagar", 1_000, "2026-10-01", "Lazer");
  assert.equal(deleteTransaction(db, created), true);
  assert.equal(deleteTransaction(db, created), false);
  assert.equal(countTransactions(db), 0);
});

test("o banco recusa valor zero, data mal formada e categoria inexistente", () => {
  assert.throws(() => add("Zero", 0, "2026-10-01", "Lazer"));
  assert.throws(() => add("Data", 1_000, "01/10/2026", "Lazer"));
  assert.throws(() =>
    insertTransaction(db, { description: "Órfão", amountCents: 1_000, occurredOn: "2026-10-01", categoryId: 9999 }),
  );
  assert.equal(countTransactions(db), 0);
});

test("seedSampleData preenche seis meses, sem datas futuras, e só em banco vazio", () => {
  const created = seedSampleData(db, "2026-10-11");
  assert.equal(created, countTransactions(db));
  assert.ok(created > 30);

  const history = lastMonths(db, "2026-10", 6);
  assert.ok(history.every((m) => m.incomeCents > 0 && m.expenseCents > 0));
  assert.ok(listTransactions(db, "2026-10").every((t) => t.occurredOn <= "2026-10-11"));

  assert.equal(seedSampleData(db, "2026-10-11"), 0, "não duplica quando já há lançamentos");
});
