/**
 * Gráficos del dashboard, hechos con SVG/CSS puro (sin dependencias externas).
 */

export const STATE_COLORS = {
  por_agendar: '#94a3b8',
  agendada: '#2f6df0',
  realizada: '#16a34a',
};

/* ----------------------------- Dona (donut) ----------------------------- */
export function Donut({
  segments,
  size = 170,
  thickness = 24,
  unidad = 'sesiones',
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  unidad?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#eef1f5"
            strokeWidth={thickness}
          />
          {total > 0 &&
            segments.map((s, i) => {
              const len = (s.value / total) * c;
              const el = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </g>
        <text x="50%" y="49%" textAnchor="middle" className="donut-num">
          {total}
        </text>
        <text x="50%" y="62%" textAnchor="middle" className="donut-cap">
          {unidad}
        </text>
      </svg>
      <ul className="legend">
        {segments.map((s, i) => (
          <li key={i}>
            <span className="dot" style={{ background: s.color }} />
            {s.label} <b>{s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------- Barras apiladas por categoría -------------------- */
export function StackedBars({
  rows,
}: {
  rows: { label: string; segments: { value: number; color: string }[] }[];
}) {
  return (
    <div className="stacked">
      {rows.map((r, i) => {
        const total = r.segments.reduce((s, x) => s + x.value, 0) || 1;
        const suma = r.segments.reduce((s, x) => s + x.value, 0);
        return (
          <div key={i} className="stacked-row">
            <span className="stacked-label" title={r.label}>
              {r.label}
            </span>
            <div className="stacked-track">
              {r.segments.map(
                (s, j) =>
                  s.value > 0 && (
                    <span
                      key={j}
                      className="stacked-seg"
                      style={{
                        width: `${(s.value / total) * 100}%`,
                        background: s.color,
                      }}
                      title={`${s.value}`}
                    />
                  ),
              )}
            </div>
            <span className="stacked-total">{suma}</span>
          </div>
        );
      })}
      {rows.length === 0 && <p className="muted">Sin datos.</p>}
    </div>
  );
}

/* ----------------------- Lista de barras horizontales ------------------- */
export function BarList({
  items,
  color = '#2f6df0',
}: {
  items: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="barlist">
      {items.map((it, i) => (
        <div key={i} className="barlist-row">
          <span className="barlist-label" title={it.label}>
            {it.label}
          </span>
          <span className="barlist-track">
            <span
              className="barlist-fill"
              style={{ width: `${(it.value / max) * 100}%`, background: color }}
            />
          </span>
          <span className="barlist-val">{it.value}</span>
        </div>
      ))}
      {items.length === 0 && <p className="muted">Sin datos.</p>}
    </div>
  );
}

/* ------------------------------ Gauge (medidor) ------------------------- */
function pol(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arco(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
) {
  const s = pol(cx, cy, r, endDeg);
  const e = pol(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

export function Gauge({
  pct,
  label,
  color,
}: {
  pct: number;
  label: string;
  color: string;
}) {
  const cx = 65,
    cy = 62,
    r = 52,
    sw = 13;
  const p = Math.min(1, Math.max(0, pct));
  const bg = arco(cx, cy, r, -90, 90);
  const val = arco(cx, cy, r, -90, -90 + p * 180);
  return (
    <div className="gauge">
      <svg width={130} height={78} viewBox="0 0 130 78">
        <path
          d={bg}
          fill="none"
          stroke="#eef1f5"
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {p > 0 && (
          <path
            d={val}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        )}
        <text x={cx} y={cy - 6} textAnchor="middle" className="gauge-num">
          {Math.round(p * 100)}%
        </text>
      </svg>
      <div className="gauge-label" title={label}>
        {label}
      </div>
    </div>
  );
}

/* --------------------------- Burn-up temporal --------------------------- */
const dms = (d: string) => new Date(d + 'T00:00:00').getTime();

export function Burnup({
  start,
  target,
  total,
  pts,
}: {
  start: string;
  target: string;
  total: number;
  pts: { d: string; y: number }[];
}) {
  const W = 680,
    H = 240,
    padL = 36,
    padR = 16,
    padT = 16,
    padB = 36;
  const hoy = new Date();
  const hoyMs = hoy.getTime();
  const startMs = dms(start);
  const targetMs = dms(target);
  const lastPtMs = pts.length ? dms(pts[pts.length - 1].d) : startMs;
  const xMax = Math.max(targetMs, hoyMs, lastPtMs);
  const xMin = Math.min(startMs, pts.length ? dms(pts[0].d) : startMs);

  const x = (ms: number) =>
    padL + ((ms - xMin) / Math.max(1, xMax - xMin)) * (W - padL - padR);
  const y = (v: number) =>
    H - padB - (v / Math.max(1, total)) * (H - padT - padB);

  const ideal = `${x(startMs)},${y(0)} ${x(targetMs)},${y(total)}`;
  const realPts = [`${x(startMs)},${y(0)}`].concat(
    pts.map((p) => `${x(dms(p.d))},${y(p.y)}`),
  );
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString('es', { day: '2-digit', month: 'short' });
  const realizadas = pts.length ? pts[pts.length - 1].y : 0;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="burnup">
        {/* ejes */}
        <line x1={padL} y1={y(0)} x2={W - padR} y2={y(0)} stroke="#e5e7eb" />
        <line x1={padL} y1={padT} x2={padL} y2={y(0)} stroke="#e5e7eb" />
        {/* meta total (horizontal) */}
        <line
          x1={padL}
          y1={y(total)}
          x2={W - padR}
          y2={y(total)}
          stroke="#e5e7eb"
          strokeDasharray="3 3"
        />
        <text x={padL - 6} y={y(total) + 4} textAnchor="end" className="axis">
          {total}
        </text>
        <text x={padL - 6} y={y(0) + 4} textAnchor="end" className="axis">
          0
        </text>
        {/* línea ideal */}
        <polyline points={ideal} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" />
        {/* avance real */}
        <polyline
          points={realPts.join(' ')}
          fill="none"
          stroke="#16a34a"
          strokeWidth={2.5}
        />
        {/* marca objetivo */}
        <line x1={x(targetMs)} y1={padT} x2={x(targetMs)} y2={y(0)} stroke="#dc2626" strokeDasharray="4 3" />
        <text x={x(targetMs)} y={padT - 2} textAnchor="middle" className="axis red">
          meta {fmt(targetMs)}
        </text>
        {/* marca hoy */}
        {hoyMs >= xMin && hoyMs <= xMax && (
          <line x1={x(hoyMs)} y1={padT} x2={x(hoyMs)} y2={y(0)} stroke="#2f6df0" strokeDasharray="2 2" />
        )}
        {/* etiquetas eje x */}
        <text x={x(startMs)} y={H - 12} textAnchor="middle" className="axis">
          {fmt(startMs)}
        </text>
        <text x={x(xMax)} y={H - 12} textAnchor="end" className="axis">
          {fmt(xMax)}
        </text>
      </svg>
      <div className="burnup-legend">
        <span>
          <span className="line solid green" /> Realizadas acumuladas ({realizadas}
          /{total})
        </span>
        <span>
          <span className="line dash gray" /> Ritmo ideal
        </span>
        <span>
          <span className="line dash red" /> Fecha objetivo
        </span>
      </div>
    </div>
  );
}
