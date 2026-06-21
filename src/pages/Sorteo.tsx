import { useEffect, useMemo, useState } from 'react';
import {
  client,
  type Asignacion,
  type Beneficiario,
  type CoachProfile,
  type Organizacion,
} from '../amplifyClient';
import { useApp } from '../context/AppData';
import { FECHA_OBJETIVO_DEFECTO } from '../lib/metas';
import { sortear, type CoachLoad, type Pairing } from '../lib/sorteo';

/** Fecha de hoy en formato YYYY-MM-DD. */
const hoyISO = () => new Date().toISOString().slice(0, 10);

export function SorteoPage() {
  const { email } = useApp();
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [orgs, setOrgs] = useState<Organizacion[]>([]);
  const [loading, setLoading] = useState(true);

  const [orgId, setOrgId] = useState('');
  const [fechaObjetivo, setFechaObjetivo] = useState(FECHA_OBJETIVO_DEFECTO);
  const [sesionesPorAsignacion, setSesiones] = useState(3);
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<Pairing[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState('');

  async function load() {
    setLoading(true);
    const [c, b, a, o] = await Promise.all([
      client.models.CoachProfile.list(),
      client.models.Beneficiario.list(),
      client.models.Asignacion.list(),
      client.models.Organizacion.list(),
    ]);
    setCoaches(c.data.filter((x) => x.activo !== false));
    setBeneficiarios(b.data.filter((x) => x.activo !== false));
    setAsignaciones(a.data);
    setOrgs([...o.data].sort((x, y) => x.nombre.localeCompare(y.nombre)));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const activas = useMemo(
    () => asignaciones.filter((a) => a.estado === 'activa'),
    [asignaciones],
  );

  const beneficiariosConCoach = useMemo(
    () => new Set(activas.map((a) => a.beneficiarioId)),
    [activas],
  );

  // Pendientes de la organización seleccionada.
  const pendientes = useMemo(
    () =>
      beneficiarios.filter(
        (b) =>
          !beneficiariosConCoach.has(b.id) &&
          (orgId ? b.organizacionId === orgId : false),
      ),
    [beneficiarios, beneficiariosConCoach, orgId],
  );

  const cargaCoach = useMemo(() => {
    const m = new Map<string, number>();
    activas.forEach((a) => m.set(a.coachId, (m.get(a.coachId) ?? 0) + 1));
    return m;
  }, [activas]);

  // Por defecto, todos los pendientes de la org quedan seleccionados.
  useEffect(() => {
    setSeleccion(() => {
      const next: Record<string, boolean> = {};
      pendientes.forEach((b) => (next[b.id] = true));
      return next;
    });
    setPreview(null);
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
    if (!preview || preview.length === 0 || !orgId || !fechaObjetivo) return;
    setGuardando(true);
    setResultado('');
    const fechaAsignacion = hoyISO();
    try {
      const { data: sorteo } = await client.models.Sorteo.create({
        fecha: new Date().toISOString(),
        organizacionId: orgId,
        fechaObjetivo,
        sesionesPorAsignacion,
        cantidadAsignaciones: preview.length,
        ejecutadoPor: email,
      });

      for (const p of preview) {
        const { data: asig } = await client.models.Asignacion.create({
          coachId: p.coachId,
          beneficiarioId: p.beneficiarioId,
          organizacionId: orgId,
          sorteoId: sorteo?.id,
          sesionesPlaneadas: sesionesPorAsignacion,
          fechaAsignacion,
          fechaObjetivo,
          estado: 'activa',
        });
        if (!asig) continue;
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
        `Sorteo realizado: ${preview.length} asignaciones y ${preview.length * sesionesPorAsignacion} sesiones creadas, con meta ${fechaObjetivo}.`,
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

  const orgNombre = orgs.find((o) => o.id === orgId)?.nombre ?? '';

  return (
    <div className="page">
      <h2>Sorteo de asignaciones</h2>
      <p className="muted">
        Elige una organización y una fecha objetivo. Se asignan aleatoriamente
        sus beneficiarios pendientes a los coaches, priorizando a quienes no
        tienen beneficiarios en curso.
      </p>

      <div className="config-box">
        <label>
          Organización:&nbsp;
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            <option value="">— Elegir —</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fecha objetivo (fin de sesiones):&nbsp;
          <input
            type="date"
            value={fechaObjetivo}
            onChange={(e) => setFechaObjetivo(e.target.value)}
          />
        </label>
        <label>
          Sesiones por beneficiario:&nbsp;
          <input
            type="number"
            min={1}
            max={20}
            value={sesionesPorAsignacion}
            onChange={(e) => setSesiones(Math.max(1, Number(e.target.value)))}
          />
        </label>
      </div>

      {!orgId ? (
        <p className="msg">Selecciona una organización para comenzar.</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat">
              <span className="stat-num">{coaches.length}</span>
              <span className="stat-label">coaches disponibles</span>
            </div>
            <div className="stat">
              <span className="stat-num">{pendientes.length}</span>
              <span className="stat-label">pendientes en {orgNombre}</span>
            </div>
            <div className="stat">
              <span className="stat-num">{seleccionados.length}</span>
              <span className="stat-label">seleccionados</span>
            </div>
          </div>

          <div className="config-box">
            <button
              className="btn"
              onClick={generarPreview}
              disabled={
                seleccionados.length === 0 ||
                coaches.length === 0 ||
                !fechaObjetivo
              }
            >
              Generar sorteo
            </button>
          </div>

          {coaches.length === 0 && (
            <p className="msg warn">No hay coaches cargados todavía.</p>
          )}
          {pendientes.length === 0 && (
            <p className="msg">
              No hay beneficiarios pendientes en esta organización.
            </p>
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
                        setSeleccion((s) => ({
                          ...s,
                          [b.id]: e.target.checked,
                        }))
                      }
                    />
                    {b.nombre}
                  </label>
                ))}
              </div>
            </details>
          )}
        </>
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
            <button
              className="btn-ghost"
              onClick={generarPreview}
              disabled={guardando}
            >
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
