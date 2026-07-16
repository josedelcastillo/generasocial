import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useApp } from '../context/AppData';

const adminNav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/organizaciones', label: 'Organizaciones' },
  { to: '/beneficiarios', label: 'Beneficiarios' },
  { to: '/coaches', label: 'Coaches' },
  { to: '/sorteo', label: 'Sorteo' },
];

const coachNav = [
  { to: '/', label: 'Mis beneficiarios', end: true },
  { to: '/sesiones', label: 'Mis sesiones' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { isAdmin, email, profile } = useApp();
  const { signOut } = useAuthenticator((c) => [c.signOut]);
  const nav = isAdmin ? adminNav : coachNav;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          Genera Social
        </div>
        <nav className="topnav">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <span className="role-pill">{isAdmin ? 'Admin' : 'Coach'}</span>
          <span className="user-email" title={email}>
            {profile?.nombre ?? email}
          </span>
          <button className="btn-ghost" onClick={signOut}>
            Salir
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
      <footer className="appfooter">
        Hecho con 💙 para <strong>Genera</strong> · acompañando a quienes
        acompañan
      </footer>
    </div>
  );
}
