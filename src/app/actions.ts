"use server";

import { refresh } from "next/cache";

import { today } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { categoryExists, deleteTransaction, insertTransaction, seedSampleData } from "@/lib/queries";
import { validateTransaction, type FormState } from "@/lib/validation";

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

export async function createTransaction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = {
    description: text(formData.get("description")),
    amount: text(formData.get("amount")),
    occurredOn: text(formData.get("occurredOn")),
    categoryId: text(formData.get("categoryId")),
  };

  const result = validateTransaction(values);
  if (!result.ok) return { errors: result.errors, values };

  const db = getDb();
  if (!categoryExists(db, result.value.categoryId)) {
    return { errors: { categoryId: "Escolha uma categoria da lista." }, values };
  }

  insertTransaction(db, result.value);
  refresh();
  return { errors: {}, saved: true };
}

export async function removeTransaction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return;
  deleteTransaction(getDb(), id);
  refresh();
}

export async function loadSampleData(): Promise<void> {
  seedSampleData(getDb(), today());
  refresh();
}
