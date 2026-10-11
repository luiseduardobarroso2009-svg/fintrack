export type Kind = "income" | "expense";

/** Estrutura do banco. Valores em centavos (inteiros) para não perder precisão com ponto flutuante. */
export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id           INTEGER PRIMARY KEY,
  description  TEXT    NOT NULL CHECK (length(description) BETWEEN 1 AND 80),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  occurred_on  TEXT    NOT NULL CHECK (occurred_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  category_id  INTEGER NOT NULL REFERENCES categories (id),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on ON transactions (occurred_on);
`;

export const DEFAULT_CATEGORIES: ReadonlyArray<readonly [name: string, kind: Kind]> = [
  ["Salário", "income"],
  ["Freelance", "income"],
  ["Vendas", "income"],
  ["Outras receitas", "income"],
  ["Moradia", "expense"],
  ["Alimentação", "expense"],
  ["Transporte", "expense"],
  ["Contas", "expense"],
  ["Saúde", "expense"],
  ["Educação", "expense"],
  ["Lazer", "expense"],
  ["Outras despesas", "expense"],
];
