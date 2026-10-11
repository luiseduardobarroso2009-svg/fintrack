import { formatCents, formatCentsRound, formatMonth, formatMonthShort } from "@/lib/format";
import type { MonthTotals } from "@/lib/queries";

const W = 640;
const H = 240;
const MARGIN = { top: 12, right: 8, bottom: 28, left: 68 };
const BAR = 20;
const GAP = 2;
const RADIUS = 4;

/** Escolhe um topo de eixo "redondo" (1, 2 ou 5 vezes uma potência de 10) com 4 divisões. */
function scale(maxCents: number): { max: number; step: number } {
  if (maxCents <= 0) return { max: 40_000, step: 10_000 };
  const raw = maxCents / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].find((m) => m * magnitude >= raw)! * magnitude;
  return { max: Math.ceil(maxCents / step) * step, step };
}

/** Barra com o topo arredondado e a base reta, apoiada na linha de base. */
function barPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(RADIUS, height, width / 2);
  const bottom = y + height;
  return `M${x},${bottom}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${bottom}Z`;
}

export function MonthlyChart({ history }: { history: MonthTotals[] }) {
  const { max, step } = scale(Math.max(...history.flatMap((m) => [m.incomeCents, m.expenseCents])));
  const plotW = W - MARGIN.left - MARGIN.right;
  const plotH = H - MARGIN.top - MARGIN.bottom;
  const baseline = MARGIN.top + plotH;
  const band = plotW / history.length;
  const y = (cents: number) => baseline - (cents / max) * plotH;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);

  return (
    <figure className="chart">
      <ul className="legend">
        <li>
          <span className="swatch income" />
          Entradas
        </li>
        <li>
          <span className="swatch expense" />
          Saídas
        </li>
      </ul>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Entradas e saídas por mês">
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={W - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
              className={tick === 0 ? "axis" : "grid"}
            />
            <text x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end">
              {formatCentsRound(tick)}
            </text>
          </g>
        ))}

        {history.map((month, i) => {
          const center = MARGIN.left + band * (i + 0.5);
          const bars = [
            { key: "income", label: "Entradas", cents: month.incomeCents, x: center - GAP / 2 - BAR },
            { key: "expense", label: "Saídas", cents: month.expenseCents, x: center + GAP / 2 },
          ];
          return (
            <g key={month.month}>
              {bars.map(
                (bar) =>
                  bar.cents > 0 && (
                    <path key={bar.key} className={`bar ${bar.key}`} d={barPath(bar.x, y(bar.cents), BAR, baseline - y(bar.cents))}>
                      <title>{`${bar.label} em ${formatMonth(month.month)}: ${formatCents(bar.cents)}`}</title>
                    </path>
                  ),
              )}
              <text x={center} y={H - 8} textAnchor="middle">
                {formatMonthShort(month.month)}
              </text>
            </g>
          );
        })}
      </svg>

      <details>
        <summary>Ver os números em tabela</summary>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th className="num">Entradas</th>
                <th className="num">Saídas</th>
                <th className="num">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {history.map((month) => (
                <tr key={month.month}>
                  <td>{formatMonth(month.month)}</td>
                  <td className="num">{formatCents(month.incomeCents)}</td>
                  <td className="num">{formatCents(month.expenseCents)}</td>
                  <td className="num">{formatCents(month.incomeCents - month.expenseCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
