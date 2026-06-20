import { useEffect, useMemo, useState } from 'react';
import {
  client,
  ESTADOS_SESION,
  type Aprendizaje,
  type Asignacion,
  type Beneficiario,
  type EstadoSesion,
  type Sesion,
} from '../amplifyClient';
import { useApp } from '../context/AppData';

export function MisSesiones() {
  const { profile, loading: loadingProfile } = useApp();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [aprendizajes, setAprendizajes] = useState<Aprendizaje[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(coachId: string) {
    setLoading(true);
    const [a, b, s, ap] = await Promise.all([
      client.models.Asignacion.list({ filter: { coachId: { eq: coachId } } }),
      client.models.Beneficiario.list(),
      client.models.Sesion.list({ filter: { coachId: { eq: coachId } } }),
      client.models.Aprendizaje.list(), // owner-based: sólo devuelve los míos
    ]);
    setAsignaciones(a.data);
    setBeneficiarios(b.data);
    setSesiones(s.data);
    setAprendizajes(ap.data);
    setLoading(false);
  }

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    void load(profile.id);
  }, [profile]);

  const benMap = useMemo(
    () => new Map(beneficiarios.map((b) => [b.id, b.nombre])),
    [beneficiarios],
  );

  const aprendizajePorSesion = useMemo(
    () => new Map(aprendizajes.map((a) => [a.sesionId, a])),
    [aprendizajes],
  );

  async function actualizarSesion(
    id: string,
    cambios: { estado?: EstadoSesion; fecha?: string | null },
  ) {
    await client.models.Sesion.update({ id, ...cambios });
    if (profile) await load(profile.id);
  }

  async function agregarSesion(asig: Asignacion) {
    const ss = sesiones.filter((s) => s.asignacionId === asig.id);
    const maxNum = ss.reduce((m, s) => Math.max(m, s.numero ?? 0), 0);
    await client.models.Sesion.create({
      asignacionId: asig.id,
      coachId: asig.coachId,
      beneficiarioId: asig.beneficiarioId,
      numero: maxNum + 1,
      estado: 'por_agendar',
    });
    if (profile) await load(profile.id);
  }

  async function guardarAprendizaje(sesion: Sesion, texto: string) {
    const existente = aprendizajePorSesion.get(sesion.id);
    if (existente) {
      await client.models.Aprendizaje.update({ id: existente.id, texto });
    } else {
      await client.models.Aprendizaje.create({
        sesionId: sesion.id,
        texto,
        coachId: sesion.coachId,
      });
    }
    if (profile) await load(profile.id);
  }

  if (loadingProfile || loading) return <p className="page">Cargando…</p>;

  if (!profile) {
    return (
      <div className="page">
        <h2>Mis sesiones</h2>
        <p className="msg warn">
          Tu perfil de coach todavía no está cargado. Contacta a la coordinación.
        </p>
      </div>
    );
  }

  const activas = asignaciones.filter((a) => a.estado !== 'finalizada');

  return (
    <div className="page">
      <h2>Mis sesiones</h2>
      <p className="muted">
        Agenda tus sesiones, marca las realizadas y registra tus aprendizajes
        (privados, solo tú los ves).
      </p>

      {activas.length === 0 && (
        <p className="muted">No tienes asignaciones activas.</p>
      )}

      {activas.map((asig) => {
        const ss = sesiones
          .filter((s) => s.asignacionId === asig.id)
          .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
        return (
          <section key={asig.id} className="card">
            <div className="card-head">
              <h3>{benMap.get(asig.beneficiarioId) ?? 'Beneficiario'}</h3>
              <button className="btn-ghost" onClick={() => agregarSesion(asig)}>
                + Agregar sesión
              </button>
            </div>
            <div className="sesiones-list">
              {ss.map((s) => (
                <SesionItem
                  key={s.id}
                  sesion={s}
                  aprendizaje={aprendizajePorSesion.get(s.id) ?? null}
                  onUpdate={actualizarSesion}
                  onSaveAprendizaje={guardarAprendizaje}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SesionItem({
  sesion,
  aprendizaje,
  onUpdate,
  onSaveAprendizaje,
}: {
  sesion: Sesion;
  aprendizaje: Aprendizaje | null;
  onUpdate: (
    id: string,
    cambios: { estado?: EstadoSesion; fecha?: string | null },
  ) => void;
  onSaveAprendizaje: (sesion: Sesion, texto: string) => void;
}) {
  const [fecha, setFecha] = useState(sesion.fecha ?? '');
  const [texto, setTexto] = useState(aprendizaje?.texto ?? '');
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="sesion-item">
      <div className="sesion-row">
        <span className="sesion-num">Sesión {sesion.numero ?? '—'}</span>
        <input
          type="date"
          value={fecha}
          onChange={(e) => {
            setFecha(e.target.value);
            onUpdate(sesion.id, { fecha: e.target.value || null });
          }}
        />
        <select
          value={sesion.estado ?? 'por_agendar'}
          onChange={(e) =>
            onUpdate(sesion.id, { estado: e.target.value as EstadoSesion })
          }
        >
          {ESTADOS_SESION.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <button
          className={`btn-ghost ${aprendizaje ? 'has-note' : ''}`}
          onClick={() => setAbierto((v) => !v)}
        >
          {aprendizaje ? 'Aprendizaje ✓' : 'Aprendizaje'}
        </button>
      </div>
      {abierto && (
        <div className="aprendizaje-box">
          <textarea
            placeholder="¿Qué aprendí como coach en esta sesión?"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
          />
          <button
            className="btn"
            onClick={() => {
              onSaveAprendizaje(sesion, texto);
              setAbierto(false);
            }}
            disabled={!texto.trim()}
          >
            Guardar aprendizaje
          </button>
        </div>
      )}
    </div>
  );
}
