import { Suspense } from "react";

import { Dashboard } from "@/components/Dashboard";

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <main>
      <header className="top">
        <h1>FinTrack</h1>
        <p>Controle financeiro pessoal</p>
      </header>

      {/* O cabeçalho é estático. O painel lê o banco a cada requisição e chega por streaming. */}
      <Suspense fallback={<p className="muted">Carregando o painel…</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>

      <footer>Feito com Next.js, TypeScript e SQLite.</footer>
    </main>
  );
}
