import { useEffect, useMemo, useState } from 'react';
import {
  client,
  type Asignacion,
  type Beneficiario,
  type CoachProfile,
} from '../amplifyClient';
import { useApp } from '../context/AppData';
import { sortear, type CoachLoad, type Pairing } from '../lib/sorteo';

export function SorteoPage() {
  const { email } = useApp();
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);

  const [sesionesPorAsignacion, setSesiones] = useState(3);
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<Pairing[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState('');

  async function load() {
    setLoading(true);
    const [c, b, a] = await Promise.all([
      client.models.CoachProfile.list(),
      client.models.Beneficiario.list(),
      client.models.Asignacion.list(),
    ]);
    setCoaches(c.data.filter((x) => x.activo !== false));
    setBeneficiarios(b.data.filter((x) => x.activo !== false));
    setAsignaciones(a.data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  // Asignaciones activas por beneficiario y por coach.
  const activas = useMemo(
    () => asignaciones.filter((a) => a.estado === 'activa'),
    [asignaciones],
  );

  const beneficiariosConCoach = useMemo(
    () => new Set(activas.map((a) => a.beneficiarioId)),
    [activas],
  );

  const pendientes = useMemo(
    () => beneficiarios.filter((b) => !beneficiariosConCoach.has(b.id)),
    [beneficiarios, beneficiariosConCoach],
  );

  const cargaCoach = useMemo(() => {
    const m = new Map<string, number>();
    activas.forEach((a) => m.set(a.coachId, (m.get(a.coachId) ?? 0) + 1));
    return m;
  }, [activas]);

  // Por defecto, todos los pendientes quedan seleccionados.
  useEffect(() => {
    setSeleccion((prev) => {
      const next = { ...prev };
      pendientes.forEach((b) => {
        if (next[b.id] === undefined) next[b.id] = true;
      });
      return next;
    });
  }, [pendientes]);

  const seleccionados = pendientes.filter((b) => seleccion[b.id]);

  function generarPreview() {
    setResultado('');
    const coachLoads: CoachLoad[] = coaches.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      activeCount: cargaCoach.get(c.id) ?? 0,
    }));
    const inputs = seleccionados.map((b) => ({ id: b.id, nombre: b.nombre }));
    setPreview(sortear(inputs, coachLoads));
  }

  async function confirmar() {
    if (!preview || preview.length === 0) return;
    setGuardando(true);
    setResultado('');
    try {
      const { data: sorteo } = await client.models.Sorteo.create({
        fecha: new Date().toISOString(),
        sesionesPorAsignacion,
        cantidadAsignaciones: preview.length,
        ejecutadoPor: email,
      });

      for (const p of preview) {
        const { data: asig } = await client.models.Asignacion.create({
          coachId: p.coachId,
          beneficiarioId: p.beneficiarioId,
          sorteoId: sorteo?.id,
          sesionesPlaneadas: sesionesPorAsignacion,
          estado: 'activa',
        });
        if (!asig) continue;
        // Generar las N sesiones "por agendar".
        for (let n = 1; n <= sesionesPorAsignacion; n++) {
          await client.models.Sesion.create({
            asignacionId: asig.id,
            coachId: p.coachId,
            beneficiarioId: p.beneficiarioId,
            numero: n,
            estado: 'por_agendar',
          });
        }
      }

      setResultado(
        `Sorteo realizado: ${preview.length} asignaciones, ${preview.length * sesionesPorAsignacion} sesiones creadas.`,
      );
      setPreview(null);
      await load();
    } catch (err) {
      console.error(err);
      setResultado('Ocurrió un error al guardar el sorteo.');
    } finally {
      setGuardando(false);
    }
  }

  if (loading) return <p className="page">Cargando…</p>;

  return (
    <div className="page">
      <h2>Sorteo de asignaciones</h2>
      <p className="muted">
        Asigna aleatoriamente los beneficiarios pendientes a los coaches,
        priorizando a quienes no tienen beneficiarios en curso.
      </p>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-num">{coaches.length}</span>
          <span className="stat-label">coaches</span>
        </div>
        <div className="stat">
          <span className="stat-num">{pendientes.length}</span>
          <span className="stat-label">beneficiarios pendientes</span>
        </div>
        <div className="stat">
          <span className="stat-num">{seleccionados.length}</span>
          <span className="stat-label">seleccionados</span>
        </div>
      </div>

      <div className="config-box">
        <label>
          Sesiones a programar por beneficiario:&nbsp;
          <input
            type="number"
            min={1}
            max={20}
            value={sesionesPorAsignacion}
            onChange={(e) => setSesiones(Math.max(1, Number(e.target.value)))}
          />
        </label>
        <button
          className="btn"
          onClick={generarPreview}
          disabled={seleccionados.length === 0 || coaches.length === 0}
        >
          Generar sorteo
        </button>
      </div>

      {coaches.length === 0 && (
        <p className="msg warn">No hay coaches cargados todavía.</p>
      )}

      {pendientes.length > 0 && (
        <details className="select-panel">
          <summary>
            Elegir beneficiarios a incluir ({seleccionados.length}/
            {pendientes.length})
          </summary>
          <div className="chips">
            {pendientes.map((b) => (
              <label key={b.id} className="chip">
                <input
                  type="checkbox"
                  checked={!!seleccion[b.id]}
                  onChange={(e) =>
                    setSeleccion((s) => ({ ...s, [b.id]: e.target.checked }))
                  }
                />
                {b.nombre}
              </label>
            ))}
          </div>
        </details>
      )}

      {preview && (
        <div className="preview">
          <h3>Vista previa ({preview.length} asignaciones)</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Coach</th>
                <th>Beneficiario</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p, i) => (
                <tr key={i}>
                  <td>{p.coachNombre}</td>
                  <td>{p.beneficiarioNombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="actions">
            <button className="btn-ghost" onClick={generarPreview} disabled={guardando}>
              Re-sortear
            </button>
            <button className="btn" onClick={confirmar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Confirmar sorteo'}
            </button>
          </div>
        </div>
      )}

      {resultado && <p className="msg ok">{resultado}</p>}
    </div>
  );
}
