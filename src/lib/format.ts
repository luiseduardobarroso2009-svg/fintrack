const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const BRL_ROUND = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const MONTH_LONG = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const MONTH_SHORT = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });

const monthDate = (month: string) => new Date(`${month}-01T00:00:00Z`);

export const formatCents = (cents: number): string => BRL.format(cents / 100);

/** Sem centavos, para rótulos de eixo. */
export const formatCentsRound = (cents: number): string => BRL_ROUND.format(cents / 100);

/** Com sinal explícito, para o resultado não depender só da cor. */
export const formatSigned = (cents: number): string =>
  cents === 0 ? formatCents(0) : `${cents > 0 ? "+" : "−"}${formatCents(Math.abs(cents))}`;

/** "outubro de 2026" */
export const formatMonth = (month: string): string => MONTH_LONG.format(monthDate(month));

/** "out/26" */
export const formatMonthShort = (month: string): string =>
  `${MONTH_SHORT.format(monthDate(month)).replace(".", "")}/${month.slice(2, 4)}`;

/** "05/10" a partir de "2026-10-05" */
export const formatDay = (date: string): string => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
