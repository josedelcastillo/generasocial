import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppData';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Organizaciones } from './pages/Organizaciones';
import { Beneficiarios } from './pages/Beneficiarios';
import { Coaches } from './pages/Coaches';
import { SorteoPage } from './pages/Sorteo';
import { MisAsignaciones } from './pages/MisAsignaciones';
import { MisSesiones } from './pages/MisSesiones';

export default function App() {
  const { loading, isAdmin } = useApp();

  if (loading) {
    return <div className="full-center">Cargando…</div>;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {isAdmin ? (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/organizaciones" element={<Organizaciones />} />
              <Route path="/beneficiarios" element={<Beneficiarios />} />
              <Route path="/coaches" element={<Coaches />} />
              <Route path="/sorteo" element={<SorteoPage />} />
            </>
          ) : (
            <>
              <Route path="/" element={<MisAsignaciones />} />
              <Route path="/sesiones" element={<MisSesiones />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
