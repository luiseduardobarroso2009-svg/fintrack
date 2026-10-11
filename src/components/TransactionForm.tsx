"use client";

import { useActionState } from "react";

import { createTransaction } from "@/app/actions";
import type { Category } from "@/lib/queries";
import type { Field, FormState } from "@/lib/validation";

const INITIAL: FormState = { errors: {} };

export function TransactionForm({ categories, defaultDate }: { categories: Category[]; defaultDate: string }) {
  const [state, action, pending] = useActionState(createTransaction, INITIAL);

  // Liga o campo à sua mensagem de erro, para leitores de tela anunciarem os dois juntos.
  const field = (name: Field) => ({
    id: name,
    name,
    "aria-invalid": state.errors[name] ? true : undefined,
    "aria-describedby": state.errors[name] ? `${name}-error` : undefined,
  });
  const error = (name: Field) =>
    state.errors[name] && (
      <p className="error" id={`${name}-error`}>
        {state.errors[name]}
      </p>
    );

  return (
    <form action={action} className="form">
      <div className="field wide">
        <label htmlFor="description">Descrição</label>
        <input {...field("description")} type="text" maxLength={80} required defaultValue={state.values?.description} />
        {error("description")}
      </div>

      <div className="field">
        <label htmlFor="amount">Valor (R$)</label>
        <input
          {...field("amount")}
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          required
          defaultValue={state.values?.amount}
        />
        {error("amount")}
      </div>

      <div className="field">
        <label htmlFor="occurredOn">Data</label>
        <input {...field("occurredOn")} type="date" required defaultValue={state.values?.occurredOn ?? defaultDate} />
        {error("occurredOn")}
      </div>

      <div className="field">
        <label htmlFor="categoryId">Categoria</label>
        {/* A key força o select a remontar com a opção que a pessoa tinha escolhido antes do erro. */}
        <select
          {...field("categoryId")}
          key={state.values?.categoryId ?? "novo"}
          required
          defaultValue={state.values?.categoryId ?? ""}
        >
          <option value="" disabled>
            Escolha…
          </option>
          <optgroup label="Entradas">
            {categories
              .filter((c) => c.kind === "income")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </optgroup>
          <optgroup label="Saídas">
            {categories
              .filter((c) => c.kind === "expense")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </optgroup>
        </select>
        {error("categoryId")}
      </div>

      <div className="submit">
        <button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Adicionar lançamento"}
        </button>
        <p className="status" role="status">
          {state.saved && !pending ? "Lançamento salvo." : ""}
        </p>
      </div>
    </form>
  );
}
