import Link from "next/link";

import { loadSampleData, removeTransaction } from "@/app/actions";
import { MonthlyChart } from "@/components/MonthlyChart";
import { TransactionForm } from "@/components/TransactionForm";
import { getDashboard, HISTORY_MONTHS } from "@/lib/data";
import { addMonths } from "@/lib/dates";
import { formatCents, formatDay, formatMonth, formatSigned } from "@/lib/format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const tone = (cents: number) => (cents > 0 ? "good" : cents < 0 ? "bad" : "");

export async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const { mes } = await searchParams;
  const data = await getDashboard(mes);
  const { month, thisMonth } = data;

  const result = data.totals.incomeCents - data.totals.expenseCents;
  const largestExpense = Math.max(1, ...data.byCategory.map((c) => c.totalCents));

  return (
    <>
      {data.isDemo && (
        <p className="demo" role="note">
          Demonstração pública: os dados são de exemplo, compartilhados entre os visitantes e apagados de tempos em tempos.
        </p>
      )}

      <nav className="month-nav" aria-label="Mês exibido">
        <Link href={`/?mes=${addMonths(month, -1)}`} aria-label="Mês anterior">
          ←
        </Link>
        <h2>{formatMonth(month)}</h2>
        <Link href={`/?mes=${addMonths(month, 1)}`} aria-label="Próximo mês">
          →
        </Link>
        {month !== thisMonth && (
          <Link href="/" className="today">
            Voltar para o mês atual
          </Link>
        )}
      </nav>

      {data.isEmpty && (
        <section className="card empty">
          <div>
            <h3>Ainda não há lançamentos</h3>
            <p>Adicione o primeiro no formulário abaixo, ou carregue seis meses de dados de exemplo para ver o painel funcionando.</p>
          </div>
          <form action={loadSampleData}>
            <button type="submit">Carregar dados de exemplo</button>
          </form>
        </section>
      )}

      <section className="tiles" aria-label="Resumo do mês">
        <div className="card tile">
          <p className="label">Entradas</p>
          <p className="value">{formatCents(data.totals.incomeCents)}</p>
        </div>
        <div className="card tile">
          <p className="label">Saídas</p>
          <p className="value">{formatCents(data.totals.expenseCents)}</p>
        </div>
        <div className="card tile">
          <p className="label">Resultado do mês</p>
          <p className={`value ${tone(result)}`}>{formatSigned(result)}</p>
        </div>
        <div className="card tile">
          <p className="label">Saldo acumulado</p>
          <p className={`value ${tone(data.balanceCents)}`}>{formatSigned(data.balanceCents)}</p>
        </div>
      </section>

      <div className="columns">
        <section className="card">
          <h3>Entradas e saídas nos últimos {HISTORY_MONTHS} meses</h3>
          <MonthlyChart history={data.history} />
        </section>

        <section className="card">
          <h3>Saídas por categoria</h3>
          {data.byCategory.length === 0 ? (
            <p className="muted">Nenhuma saída em {formatMonth(month)}.</p>
          ) : (
            <ul className="categories">
              {data.byCategory.map((category) => (
                <li key={category.name}>
                  <span className="name">{category.name}</span>
                  <span className="amount">{formatCents(category.totalCents)}</span>
                  <span className="track">
                    <span className="fill" style={{ width: `${(category.totalCents / largestExpense) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h3>Novo lançamento</h3>
        <TransactionForm categories={data.categories} defaultDate={month === thisMonth ? data.today : `${month}-01`} />
      </section>

      <section className="card">
        <h3>Lançamentos de {formatMonth(month)}</h3>
        {data.transactions.length === 0 ? (
          <p className="muted">Nenhum lançamento neste mês.</p>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th className="num">Valor</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="num-left">{formatDay(t.occurredOn)}</td>
                    <td>{t.description}</td>
                    <td>{t.categoryName}</td>
                    <td className={`num ${t.kind === "income" ? "good" : ""}`}>
                      {formatSigned(t.kind === "income" ? t.amountCents : -t.amountCents)}
                    </td>
                    <td className="actions">
                      <form action={removeTransaction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="link" aria-label={`Excluir ${t.description}`}>
                          Excluir
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
