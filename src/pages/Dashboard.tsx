import { useEffect, useMemo, useState } from 'react';
import {
  client,
  estadoLabel,
  type Asignacion,
  type Beneficiario,
  type CoachProfile,
  type Organizacion,
  type Sesion,
} from '../amplifyClient';
import {
  FECHA_ASIGNACION_DEFECTO,
  FECHA_OBJETIVO_DEFECTO,
  fraccionTiempo,
  semaforo,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  type Semaforo,
} from '../lib/metas';

interface Row {
  label: string;
  total: number;
  porAgendar: number;
  agendadas: number;
  realizadas: number;
}

function Dot({ estado }: { estado: Semaforo }) {
  return (
    <span className="semaforo" title={SEMAFORO_LABEL[estado]}>
      <span
        className="semaforo-dot"
        style={{ background: SEMAFORO_COLOR[estado] }}
      />
      {SEMAFORO_LABEL[estado]}
    </span>
  );
}

function Tabla({ titulo, rows }: { titulo: string; rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <section className="card">
      <h3>{titulo}</h3>
      <table className="table compact">
        <thead>
          <tr>
            <th>{titulo}</th>
            <th>Por agendar</th>
            <th>Agendadas</th>
            <th>Realizadas</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td className="num">{r.porAgendar}</td>
              <td className="num">{r.agendadas}</td>
              <td className="num">{r.realizadas}</td>
              <td className="num strong">{r.total}</td>
              <td className="barcell">
                <span
                  className="bar"
                  style={{ width: `${(r.total / max) * 100}%` }}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                Sin datos todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

interface MetaOrg {
  org: string;
  desde: string;
  objetivo: string;
  total: number;
  agendadas: number;
  realizadas: number;
  semAgenda: Semaforo;
  semEfectuadas: Semaforo;
}

export function Dashboard() {
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [orgs, setOrgs] = useState<Organizacion[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);

  async function load() {
    const [s, b, c, o, a] = await Promise.all([
      client.models.Sesion.list(),
      client.models.Beneficiario.list(),
      client.models.CoachProfile.list(),
      client.models.Organizacion.list(),
      client.models.Asignacion.list(),
    ]);
    setSesiones(s.data);
    setBeneficiarios(b.data);
    setCoaches(c.data);
    setOrgs(o.data);
    setAsignaciones(a.data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const benMap = useMemo(
    () => new Map(beneficiarios.map((b) => [b.id, b])),
    [beneficiarios],
  );
  const coachMap = useMemo(
    () => new Map(coaches.map((c) => [c.id, c.nombre])),
    [coaches],
  );
  const orgMap = useMemo(() => new Map(orgs.map((o) => [o.id, o.nombre])), [orgs]);

  function agrupar(keyFn: (s: Sesion) => string): Row[] {
    const m = new Map<string, Row>();
    for (const s of sesiones) {
      const label = keyFn(s);
      if (!m.has(label))
        m.set(label, {
          label,
          total: 0,
          porAgendar: 0,
          agendadas: 0,
          realizadas: 0,
        });
      const r = m.get(label)!;
      r.total++;
      if (s.estado === 'realizada') r.realizadas++;
      else if (s.estado === 'agendada') r.agendadas++;
      else r.porAgendar++;
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }

  const porOrg = useMemo(
    () =>
      agrupar((s) => {
        const b = benMap.get(s.beneficiarioId);
        return orgMap.get(b?.organizacionId ?? '') ?? 'Sin organización';
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sesiones, benMap, orgMap],
  );
  const porCoach = useMemo(
    () => agrupar((s) => coachMap.get(s.coachId) ?? 'Desconocido'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sesiones, coachMap],
  );
  const porCoachee = useMemo(
    () => agrupar((s) => benMap.get(s.beneficiarioId)?.nombre ?? 'Desconocido'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sesiones, benMap],
  );

  // Sesiones por asignación, para el cálculo de metas.
  const sesionesPorAsig = useMemo(() => {
    const m = new Map<string, Sesion[]>();
    for (const s of sesiones) {
      const arr = m.get(s.asignacionId) ?? [];
      arr.push(s);
      m.set(s.asignacionId, arr);
    }
    return m;
  }, [sesiones]);

  // Semáforos de meta por organización.
  const metas: MetaOrg[] = useMemo(() => {
    const hoy = new Date();
    interface Acc {
      total: number;
      agendadas: number;
      realizadas: number;
      desde: string;
      objetivo: string;
    }
    const m = new Map<string, Acc>();
    for (const a of asignaciones) {
      if (a.estado === 'finalizada') continue;
      const orgNombre = orgMap.get(a.organizacionId ?? '') ?? 'Sin organización';
      const ses = sesionesPorAsig.get(a.id) ?? [];
      const desde = a.fechaAsignacion ?? FECHA_ASIGNACION_DEFECTO;
      const objetivo = a.fechaObjetivo ?? FECHA_OBJETIVO_DEFECTO;
      const acc =
        m.get(orgNombre) ??
        ({
          total: 0,
          agendadas: 0,
          realizadas: 0,
          desde,
          objetivo,
        } as Acc);
      acc.total += ses.length;
      acc.agendadas += ses.filter((s) => s.estado !== 'por_agendar').length;
      acc.realizadas += ses.filter((s) => s.estado === 'realizada').length;
      if (desde < acc.desde) acc.desde = desde; // asignación más temprana
      if (objetivo > acc.objetivo) acc.objetivo = objetivo; // meta más lejana
      m.set(orgNombre, acc);
    }

    return [...m.entries()]
      .map(([org, acc]) => {
        const transcurrido = fraccionTiempo(acc.desde, acc.objetivo, hoy);
        const pasada = hoy > new Date(acc.objetivo + 'T23:59:59');
        const progAgenda = acc.total ? acc.agendadas / acc.total : 1;
        const progEfect = acc.total ? acc.realizadas / acc.total : 1;
        return {
          org,
          desde: acc.desde,
          objetivo: acc.objetivo,
          total: acc.total,
          agendadas: acc.agendadas,
          realizadas: acc.realizadas,
          semAgenda: semaforo(progAgenda, transcurrido, pasada),
          semEfectuadas: semaforo(progEfect, transcurrido, pasada),
        };
      })
      .sort((a, b) => a.org.localeCompare(b.org));
  }, [asignaciones, sesionesPorAsig, orgMap]);

  const sinMeta = useMemo(
    () => asignaciones.filter((a) => !a.fechaObjetivo).length,
    [asignaciones],
  );

  async function backfillMetas() {
    setBackfilling(true);
    try {
      const faltantes = asignaciones.filter((a) => !a.fechaObjetivo);
      for (const a of faltantes) {
        await client.models.Asignacion.update({
          id: a.id,
          fechaObjetivo: FECHA_OBJETIVO_DEFECTO,
          fechaAsignacion: a.fechaAsignacion ?? FECHA_ASIGNACION_DEFECTO,
        });
      }
      await load();
    } finally {
      setBackfilling(false);
    }
  }

  const totales = useMemo(() => {
    const t = {
      total: sesiones.length,
      por_agendar: 0,
      agendada: 0,
      realizada: 0,
    };
    for (const s of sesiones) {
      if (s.estado === 'realizada') t.realizada++;
      else if (s.estado === 'agendada') t.agendada++;
      else t.por_agendar++;
    }
    return t;
  }, [sesiones]);

  if (loading) return <p className="page">Cargando dashboard…</p>;

  return (
    <div className="page">
      <h2>Dashboard</h2>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-num">{totales.total}</span>
          <span className="stat-label">sesiones totales</span>
        </div>
        <div className="stat">
          <span className="stat-num">{totales.por_agendar}</span>
          <span className="stat-label">{estadoLabel('por_agendar')}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{totales.agendada}</span>
          <span className="stat-label">{estadoLabel('agendada')}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{totales.realizada}</span>
          <span className="stat-label">{estadoLabel('realizada')}</span>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>Estado de metas por organización</h3>
        </div>
        <p className="muted small">
          Semáforos según el tiempo transcurrido entre la fecha de asignación y
          la fecha objetivo, comparado con el avance real.
        </p>
        {sinMeta > 0 && (
          <p className="msg warn">
            Hay {sinMeta} asignación(es) sin fecha objetivo.{' '}
            <button
              className="btn-ghost"
              onClick={backfillMetas}
              disabled={backfilling}
            >
              {backfilling
                ? 'Aplicando…'
                : `Completar con meta ${FECHA_OBJETIVO_DEFECTO}`}
            </button>
          </p>
        )}
        <table className="table compact">
          <thead>
            <tr>
              <th>Organización</th>
              <th>Asignación</th>
              <th>Objetivo</th>
              <th>Agendamiento</th>
              <th>Sesiones efectuadas</th>
            </tr>
          </thead>
          <tbody>
            {metas.map((m) => (
              <tr key={m.org}>
                <td>{m.org}</td>
                <td>{m.desde}</td>
                <td>{m.objetivo}</td>
                <td>
                  <Dot estado={m.semAgenda} />
                  <span className="muted small">
                    {' '}
                    {m.agendadas}/{m.total}
                  </span>
                </td>
                <td>
                  <Dot estado={m.semEfectuadas} />
                  <span className="muted small">
                    {' '}
                    {m.realizadas}/{m.total}
                  </span>
                </td>
              </tr>
            ))}
            {metas.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Aún no hay asignaciones activas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <Tabla titulo="Sesiones por organización" rows={porOrg} />
      <Tabla titulo="Sesiones por coach" rows={porCoach} />
      <Tabla titulo="Sesiones por coachee" rows={porCoachee} />
    </div>
  );
}
