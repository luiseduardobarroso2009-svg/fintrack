# FinTrack

Painel de controle financeiro pessoal: registre entradas e saídas, veja o resultado do mês, o saldo acumulado, um gráfico dos últimos seis meses e para onde o dinheiro foi, por categoria.

Feito com **Next.js 16** (App Router), **TypeScript** e **SQL** (SQLite).

## O que ele faz

- Cadastro de lançamentos com descrição, valor, data e categoria, com validação no servidor e mensagens de erro por campo.
- Resumo do mês: entradas, saídas, resultado e saldo acumulado.
- Gráfico de entradas e saídas dos últimos seis meses, com os mesmos números disponíveis em tabela.
- Saídas agrupadas por categoria, da maior para a menor.
- Navegação entre meses pela URL (`/?mes=2026-10`), então dá para salvar ou compartilhar o link de um mês.
- Tema claro e escuro, seguindo o sistema, e layout que funciona no celular.
- Botão para carregar seis meses de dados de exemplo quando o banco está vazio.

## Como rodar

Precisa do **Node.js 24 ou mais novo**. O banco usa o módulo `node:sqlite`, que já vem com o Node, então não há nada para instalar além das dependências do projeto.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. O arquivo do banco é criado sozinho em `data/fintrack.db` na primeira execução. Para usar outro caminho, defina a variável `DATABASE_PATH`.

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o app em modo de desenvolvimento |
| `npm run build` | Gera a versão de produção |
| `npm start` | Roda a versão de produção |
| `npm test` | Roda os testes |
| `npm run typecheck` | Confere os tipos |
| `npm run lint` | Roda o ESLint |

## Como o código está organizado

```
src/
  app/
    page.tsx          Casca estática da página, com o painel dentro de um <Suspense>
    actions.ts        Server Functions: criar, excluir e carregar dados de exemplo
    globals.css       Estilos e cores por papel, com tema claro e escuro
  components/
    Dashboard.tsx     Painel do mês (componente de servidor)
    MonthlyChart.tsx  Gráfico em SVG, renderizado no servidor
    TransactionForm.tsx  Formulário (componente de cliente, com useActionState)
  lib/
    schema.ts         Tabelas, restrições e categorias padrão
    queries.ts        Todo o SQL do app
    data.ts           Leitura do painel a cada requisição
    db.ts             Conexão com o SQLite
    validation.ts     Validação do formulário e conversão de valores
    dates.ts          Meses e datas no fuso do Brasil
    format.ts         Formatação de moeda e datas
```

## Decisões técnicas

**Dinheiro em centavos, como inteiro.** O banco guarda `amount_cents` e a conversão do que a pessoa digita ("1.234,56") não passa por ponto flutuante. Assim `0,1 + 0,2` nunca vira `0,30000000000000004`.

**O banco também valida.** Além da validação no servidor, as tabelas têm `CHECK` para valor positivo, formato de data e tipo de categoria, e chave estrangeira para a categoria. Um erro no código não consegue gravar um dado inválido.

**SQL escrito à mão, em um arquivo só.** As consultas ficam em `src/lib/queries.ts` e recebem a conexão como parâmetro. Os totais de entradas e saídas saem de uma única consulta com `SUM(CASE WHEN ...)`, e os filtros por mês usam intervalo de datas para aproveitar o índice.

**Leitura a cada requisição, com casca estática.** O Next 16 pré-renderiza tudo o que consegue. Como o driver do SQLite é síncrono, as consultas rodariam no build e a página ficaria congelada. O `await connection()` em `src/lib/data.ts` adia a leitura para a hora da requisição, e o `<Suspense>` em `page.tsx` deixa o cabeçalho ser servido na hora enquanto o painel chega por streaming.

**Testes sem dependências.** Os testes usam o executor do próprio Node (`node --test`) e um banco SQLite em memória, então rodam em menos de um segundo e exercitam o SQL de verdade.

## Limites conhecidos

- É um app para uma pessoa só: não tem login, e qualquer um com acesso ao endereço pode lançar e excluir.
- O SQLite grava em um arquivo local. Isso funciona no seu computador ou em um servidor com disco, mas não em hospedagem serverless, onde o disco é descartado. Para publicar lá, o caminho é trocar o banco por um Postgres hospedado, mexendo só em `db.ts` e `queries.ts`.
- Ainda não dá para editar um lançamento nem criar categorias pela tela.
