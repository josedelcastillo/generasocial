import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  client,
  type Asignacion,
  type Beneficiario,
  type Sesion,
} from '../amplifyClient';
import { useApp } from '../context/AppData';

export function MisAsignaciones() {
  const { profile, loading: loadingProfile } = useApp();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      const [a, b, s] = await Promise.all([
        client.models.Asignacion.list({
          filter: { coachId: { eq: profile.id } },
        }),
        client.models.Beneficiario.list(),
        client.models.Sesion.list({ filter: { coachId: { eq: profile.id } } }),
      ]);
      setAsignaciones(a.data);
      setBeneficiarios(b.data);
      setSesiones(s.data);
      setLoading(false);
    })();
  }, [profile]);

  const benMap = useMemo(
    () => new Map(beneficiarios.map((b) => [b.id, b.nombre])),
    [beneficiarios],
  );

  function progreso(asignacionId: string) {
    const ss = sesiones.filter((s) => s.asignacionId === asignacionId);
    const realizadas = ss.filter((s) => s.estado === 'realizada').length;
    return { realizadas, total: ss.length };
  }

  if (loadingProfile || loading) return <p className="page">Cargando…</p>;

  if (!profile) {
    return (
      <div className="page">
        <h2>Mis beneficiarios</h2>
        <p className="msg warn">
          Tu perfil de coach todavía no está cargado en el sistema. Escribe a la
          coordinación de Genera para que te agregue (debe coincidir tu email).
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>Mis beneficiarios</h2>
      <p className="muted">
        Beneficiarios que te fueron asignados. Gestiona las sesiones desde{' '}
        <Link to="/sesiones">Mis sesiones</Link>.
      </p>

      <div className="cards-grid">
        {asignaciones.map((a) => {
          const { realizadas, total } = progreso(a.id);
          const pct = total ? Math.round((realizadas / total) * 100) : 0;
          return (
            <div key={a.id} className="ben-card">
              <div className="ben-head">
                <strong>{benMap.get(a.beneficiarioId) ?? 'Beneficiario'}</strong>
                <span className={`tag ${a.estado === 'activa' ? 'tag-ok' : ''}`}>
                  {a.estado === 'activa' ? 'Activa' : 'Finalizada'}
                </span>
              </div>
              <div className="progress">
                <span className="progress-bar" style={{ width: `${pct}%` }} />
              </div>
              <div className="ben-meta">
                {realizadas}/{total} sesiones realizadas
              </div>
            </div>
          );
        })}
        {asignaciones.length === 0 && (
          <p className="muted">Aún no tienes beneficiarios asignados.</p>
        )}
      </div>
    </div>
  );
}
