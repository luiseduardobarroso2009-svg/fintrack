import { isIsoDate } from "./dates.ts";

export type TransactionInput = {
  description: string;
  amountCents: number;
  occurredOn: string;
  categoryId: number;
};

export type Field = "description" | "amount" | "occurredOn" | "categoryId";
export type FieldErrors = Partial<Record<Field, string>>;
export type RawTransaction = Record<Field, unknown>;

/** Estado devolvido ao formulário. `values` repõe o que a pessoa digitou quando há erro. */
export type FormState = {
  errors: FieldErrors;
  values?: Record<Field, string>;
  message?: string;
  saved?: boolean;
};

const MAX_CENTS = 100_000_000_000; // R$ 1 bilhão
const THOUSANDS_RE = /^\d{1,3}(\.\d{3})+$/;
const AMOUNT_RE = /^(\d{1,10})(?:\.(\d{1,2}))?$/;

/**
 * Converte o que a pessoa digitou em centavos, sem passar por ponto flutuante.
 * Aceita "1234,56", "1.234,56", "R$ 1.234,56", "1234.56" e "1.234" (milhar).
 */
export function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.replace(/R\$/i, "").replace(/\s/g, "");
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (THOUSANDS_RE.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "");
  }
  const match = AMOUNT_RE.exec(normalized);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents > 0 && cents <= MAX_CENTS ? cents : null;
}

export function validateTransaction(
  raw: RawTransaction,
): { ok: true; value: TransactionInput } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (description.length < 1) errors.description = "Descreva o lançamento.";
  else if (description.length > 80) errors.description = "Use no máximo 80 caracteres.";

  const amountCents = typeof raw.amount === "string" ? parseAmountToCents(raw.amount) : null;
  if (amountCents === null) errors.amount = "Digite um valor maior que zero, como 1.234,56.";

  if (!isIsoDate(raw.occurredOn)) errors.occurredOn = "Escolha uma data válida.";

  const categoryId = typeof raw.categoryId === "string" ? Number(raw.categoryId) : NaN;
  if (!Number.isInteger(categoryId) || categoryId < 1) errors.categoryId = "Escolha uma categoria.";

  if (Object.keys(errors).length > 0 || amountCents === null || !isIsoDate(raw.occurredOn)) {
    return { ok: false, errors };
  }
  return { ok: true, value: { description, amountCents, occurredOn: raw.occurredOn, categoryId } };
}
