import { useEffect, useMemo, useRef, useState } from 'react';
import {
  client,
  type Beneficiario,
  type Organizacion,
} from '../amplifyClient';
import { parseTabla, pick } from '../lib/csv';

export function Beneficiarios() {
  const [items, setItems] = useState<Beneficiario[]>([]);
  const [orgs, setOrgs] = useState<Organizacion[]>([]);
  const [nombre, setNombre] = useState('');
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [filtroOrg, setFiltroOrg] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const [b, o] = await Promise.all([
      client.models.Beneficiario.list(),
      client.models.Organizacion.list(),
    ]);
    setItems([...b.data].sort((a, x) => a.nombre.localeCompare(x.nombre)));
    setOrgs([...o.data].sort((a, x) => a.nombre.localeCompare(x.nombre)));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const orgNombre = (id?: string | null) =>
    orgs.find((o) => o.id === id)?.nombre ?? '—';

  // Lista filtrada por organización (desplegable) y por nombre (texto).
  const visibles = useMemo(() => {
    const q = filtroNombre.trim().toLowerCase();
    return items.filter((b) => {
      const okOrg = !filtroOrg || b.organizacionId === filtroOrg;
      const okNombre = !q || b.nombre.toLowerCase().includes(q);
      return okOrg && okNombre;
    });
  }, [items, filtroOrg, filtroNombre]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setBusy(true);
    await client.models.Beneficiario.create({
      nombre: nombre.trim(),
      organizacionId: orgId || undefined,
      activo: true,
    });
    setNombre('');
    setBusy(false);
    void load();
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este beneficiario?')) return;
    await client.models.Beneficiario.delete({ id });
    void load();
  }

  /** Importa CSV/Excel con columnas: nombre, organizacion (opcional). Crea orgs faltantes. */
  async function importar(file: File) {
    setBusy(true);
    setMsg('Importando…');
    try {
      const rows = await parseTabla(file);
      // Mapa de organizaciones por nombre (en minúsculas) para reutilizar/crear.
      const orgMap = new Map<string, string>();
      orgs.forEach((o) => orgMap.set(o.nombre.trim().toLowerCase(), o.id));

      let creados = 0;
      for (const row of rows) {
        const nom = pick(row, 'nombre', 'beneficiario', 'coachee', 'name');
        if (!nom) continue;
        const orgNom = pick(row, 'organizacion', 'organización', 'org', 'institucion');
        let oid: string | undefined;
        if (orgNom) {
          const key = orgNom.toLowerCase();
          oid = orgMap.get(key);
          if (!oid) {
            const { data } = await client.models.Organizacion.create({
              nombre: orgNom,
            });
            if (data) {
              oid = data.id;
              orgMap.set(key, data.id);
            }
          }
        }
        await client.models.Beneficiario.create({
          nombre: nom,
          organizacionId: oid,
          activo: true,
        });
        creados++;
      }
      setMsg(`Importados ${creados} beneficiarios.`);
    } catch (err) {
      setMsg('Error al importar el CSV. Revisa el formato.');
      console.error(err);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
      void load();
    }
  }

  return (
    <div className="page">
      <h2>Beneficiarios (coachees)</h2>
      <p className="muted">
        Personas que reciben el acompañamiento de coaching en cada organización.
      </p>

      <div className="toolbar">
        <form className="inline-form" onSubmit={crear}>
          <input
            placeholder="Nombre del beneficiario"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            <option value="">— Organización —</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
          <button className="btn" disabled={busy}>
            Agregar
          </button>
        </form>

        <div className="import-box">
          <label className="btn-ghost">
            Importar CSV/Excel
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importar(f);
              }}
            />
          </label>
          <span className="hint">Columnas: nombre, organizacion</span>
        </div>
      </div>

      {msg && <p className="msg">{msg}</p>}

      <div className="filtros">
        <input
          placeholder="Buscar por nombre…"
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
        />
        <select value={filtroOrg} onChange={(e) => setFiltroOrg(e.target.value)}>
          <option value="">Todas las organizaciones</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
        {(filtroNombre || filtroOrg) && (
          <button
            className="btn-ghost"
            onClick={() => {
              setFiltroNombre('');
              setFiltroOrg('');
            }}
          >
            Limpiar
          </button>
        )}
        <span className="hint">
          {visibles.length} de {items.length}
        </span>
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Beneficiario</th>
              <th>Organización</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((b) => (
              <tr key={b.id}>
                <td>{b.nombre}</td>
                <td>{orgNombre(b.organizacionId)}</td>
                <td className="right">
                  <button
                    className="btn-ghost danger"
                    onClick={() => eliminar(b.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  {items.length === 0
                    ? 'Aún no hay beneficiarios. Puedes importarlos por CSV/Excel.'
                    : 'No hay beneficiarios que coincidan con la búsqueda.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
