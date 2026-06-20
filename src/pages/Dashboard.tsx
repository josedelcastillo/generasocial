import { useEffect, useMemo, useState } from 'react';
import {
  client,
  estadoLabel,
  type Beneficiario,
  type CoachProfile,
  type Organizacion,
  type Sesion,
} from '../amplifyClient';

interface Row {
  label: string;
  total: number;
  porAgendar: number;
  agendadas: number;
  realizadas: number;
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

export function Dashboard() {
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [orgs, setOrgs] = useState<Organizacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [s, b, c, o] = await Promise.all([
        client.models.Sesion.list(),
        client.models.Beneficiario.list(),
        client.models.CoachProfile.list(),
        client.models.Organizacion.list(),
      ]);
      setSesiones(s.data);
      setBeneficiarios(b.data);
      setCoaches(c.data);
      setOrgs(o.data);
      setLoading(false);
    })();
  }, []);

  const benMap = useMemo(
    () => new Map(beneficiarios.map((b) => [b.id, b])),
    [beneficiarios],
  );
  const coachMap = useMemo(
    () => new Map(coaches.map((c) => [c.id, c.nombre])),
    [coaches],
  );
  const orgMap = useMemo(
    () => new Map(orgs.map((o) => [o.id, o.nombre])),
    [orgs],
  );

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

  const totales = useMemo(() => {
    const t = { total: sesiones.length, por_agendar: 0, agendada: 0, realizada: 0 };
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

      <Tabla titulo="Sesiones por organización" rows={porOrg} />
      <Tabla titulo="Sesiones por coach" rows={porCoach} />
      <Tabla titulo="Sesiones por coachee" rows={porCoachee} />
    </div>
  );
}
