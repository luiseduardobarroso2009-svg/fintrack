import assert from "node:assert/strict";
import { test } from "node:test";

import { addMonths, currentMonth, isIsoDate, isMonth, monthBounds, today } from "./dates.ts";
import { formatDay, formatMonthShort, formatSigned } from "./format.ts";
import { parseAmountToCents, validateTransaction } from "./validation.ts";

test("parseAmountToCents entende os formatos brasileiros e o ponto decimal", () => {
  const cases: Array<[string, number | null]> = [
    ["1234,56", 123_456],
    ["1.234,56", 123_456],
    ["R$ 1.234,56", 123_456],
    ["1234.56", 123_456],
    ["1.234", 123_400],
    ["1.234.567", 123_456_700],
    ["12,5", 1_250],
    ["0,01", 1],
    ["50", 5_000],
    ["0", null],
    ["0,00", null],
    ["-10", null],
    ["12,345", null],
    ["abc", null],
    ["", null],
    ["99999999999", null],
  ];
  for (const [raw, expected] of cases) {
    assert.equal(parseAmountToCents(raw), expected, `valor digitado: "${raw}"`);
  }
});

test("parseAmountToCents não perde centavos por arredondamento", () => {
  assert.equal(parseAmountToCents("0,29"), 29);
  assert.equal(parseAmountToCents("1,15"), 115);
  assert.equal(parseAmountToCents("4,35"), 435);
});

test("validateTransaction devolve os dados limpos quando está tudo certo", () => {
  const result = validateTransaction({
    description: "  Mercado  ",
    amount: "150,90",
    occurredOn: "2026-10-05",
    categoryId: "3",
  });
  assert.deepEqual(result, {
    ok: true,
    value: { description: "Mercado", amountCents: 15_090, occurredOn: "2026-10-05", categoryId: 3 },
  });
});

test("validateTransaction aponta cada campo com problema", () => {
  const result = validateTransaction({ description: " ", amount: "zero", occurredOn: "2026-02-30", categoryId: "x" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(Object.keys(result.errors).sort(), ["amount", "categoryId", "description", "occurredOn"]);
  }

  const long = validateTransaction({ description: "a".repeat(81), amount: "1", occurredOn: "2026-10-05", categoryId: "1" });
  assert.equal(long.ok, false);

  const missing = validateTransaction({ description: null, amount: null, occurredOn: null, categoryId: null });
  assert.equal(missing.ok, false);
});

test("datas: validação, soma de meses e limites do mês", () => {
  assert.ok(isIsoDate("2024-02-29"));
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isIsoDate("2026-13-01"), false);
  assert.equal(isIsoDate("05/10/2026"), false);

  assert.ok(isMonth("2026-10"));
  assert.equal(isMonth("2026-13"), false);
  assert.equal(isMonth("2026-1"), false);
  assert.equal(isMonth(undefined), false);

  assert.equal(addMonths("2026-10", 1), "2026-11");
  assert.equal(addMonths("2026-12", 1), "2027-01");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.equal(addMonths("2026-03", -15), "2024-12");

  assert.deepEqual(monthBounds("2026-12"), { start: "2026-12-01", end: "2027-01-01" });
});

test("hoje é calculado no fuso do Brasil", () => {
  // 02:30 UTC do dia 1º ainda é dia 31 em São Paulo (UTC-3).
  const instant = new Date("2026-11-01T02:30:00Z");
  assert.equal(today(instant), "2026-10-31");
  assert.equal(currentMonth(instant), "2026-10");
});

test("formatação de dia, mês e resultado com sinal", () => {
  assert.equal(formatDay("2026-10-05"), "05/10");
  assert.equal(formatMonthShort("2026-10"), "out/26");
  assert.match(formatSigned(123_456), /^\+R\$\s1\.234,56$/);
  assert.match(formatSigned(-5_000), /^−R\$\s50,00$/);
  assert.match(formatSigned(0), /^R\$\s0,00$/);
});
