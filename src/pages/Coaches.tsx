import { useEffect, useRef, useState } from 'react';
import { client, type CoachProfile } from '../amplifyClient';
import { parseTabla, pick } from '../lib/csv';

export function Coaches() {
  const [items, setItems] = useState<CoachProfile[]>([]);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await client.models.CoachProfile.list();
    setItems([...data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) return;
    setBusy(true);
    await client.models.CoachProfile.create({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      activo: true,
    });
    setNombre('');
    setEmail('');
    setBusy(false);
    void load();
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este coach?')) return;
    await client.models.CoachProfile.delete({ id });
    void load();
  }

  /** Importa CSV/Excel con columnas: nombre, email. */
  async function importar(file: File) {
    setBusy(true);
    setMsg('Importando…');
    try {
      const rows = await parseTabla(file);
      const existentes = new Set(
        items.map((c) => c.email.trim().toLowerCase()),
      );
      let creados = 0;
      for (const row of rows) {
        const nom = pick(row, 'nombre', 'coach', 'name');
        const mail = pick(row, 'email', 'correo', 'mail').toLowerCase();
        if (!nom || !mail || existentes.has(mail)) continue;
        await client.models.CoachProfile.create({
          nombre: nom,
          email: mail,
          activo: true,
        });
        existentes.add(mail);
        creados++;
      }
      setMsg(`Importados ${creados} coaches.`);
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
      <h2>Coaches voluntarios</h2>
      <p className="muted">
        Para que un coach pueda entrar, debe registrarse con el mismo email que
        figura aquí. La coordinación (rol Admin) se asigna desde Cognito.
      </p>

      <div className="toolbar">
        <form className="inline-form" onSubmit={crear}>
          <input
            placeholder="Nombre del coach"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <input
            placeholder="email@dominio.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
          <span className="hint">Columnas: nombre, email</span>
        </div>
      </div>

      {msg && <p className="msg">{msg}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Coach</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.email}</td>
                <td className="right">
                  <button
                    className="btn-ghost danger"
                    onClick={() => eliminar(c.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  Aún no hay coaches. Puedes importarlos por CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      <p className="muted small">Total: {items.length} coaches</p>
    </div>
  );
}
