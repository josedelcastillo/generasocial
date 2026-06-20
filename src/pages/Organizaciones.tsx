import { useEffect, useState } from 'react';
import { client, type Organizacion } from '../amplifyClient';

export function Organizaciones() {
  const [items, setItems] = useState<Organizacion[]>([]);
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await client.models.Organizacion.list();
    setItems([...data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setBusy(true);
    await client.models.Organizacion.create({ nombre: nombre.trim() });
    setNombre('');
    setBusy(false);
    void load();
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta organización?')) return;
    await client.models.Organizacion.delete({ id });
    void load();
  }

  return (
    <div className="page">
      <h2>Organizaciones</h2>
      <p className="muted">
        Las instituciones/ONGs a las que Genera brinda apoyo de coaching.
      </p>

      <form className="inline-form" onSubmit={crear}>
        <input
          placeholder="Nombre de la organización"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <button className="btn" disabled={busy}>
          Agregar
        </button>
      </form>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Organización</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td>{o.nombre}</td>
                <td className="right">
                  <button className="btn-ghost danger" onClick={() => eliminar(o.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={2} className="muted">
                  Aún no hay organizaciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
