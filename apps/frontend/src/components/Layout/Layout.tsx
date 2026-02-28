import { invoke } from '@tauri-apps/api/core';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ViewColumns3, StatsReport, Settings } from 'iconoir-react';
import logoSrc from '../../assets/logo.png';

function onTrafficLightHover(visible: boolean) {
  invoke('set_traffic_lights_visible', { visible }).catch(() => {});
}

const navItems = [
  { to: '/', label: 'Decks', icon: ViewColumns3, match: (p: string) => p === '/' },
  { to: '/stats', label: 'Statistics', icon: StatsReport, match: (p: string) => p.startsWith('/stats') },
  { to: '/settings', label: 'Settings', icon: Settings, match: (p: string) => p === '/settings' },
] as const;

export function Layout() {
  const location = useLocation();

  return (
    <div className="app">
      <aside className="sidebar" data-tauri-drag-region>
        <div className="sidebar-grain" />

        <div
          className="sidebar-drag-region"
          data-tauri-drag-region
          onMouseEnter={() => onTrafficLightHover(true)}
          onMouseLeave={() => onTrafficLightHover(false)}
        />

        <Link to="/" className="sidebar-brand">
          <img src={logoSrc} alt="Jireh's Flashcards" width={36} height={36} className="sidebar-logo" />
          <div className="sidebar-brand-text">
            <span className="sidebar-title">Jireh's</span>
            <span className="sidebar-subtitle">Flashcards</span>
          </div>
        </Link>

        <div className="sidebar-divider" />

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon, match }) => (
            <Link
              key={to}
              to={to}
              className={`sidebar-nav-item${match(location.pathname) ? ' active' : ''}`}
              aria-label={label}
            >
              <span className="sidebar-nav-icon"><Icon /></span>
              <span className="sidebar-nav-label">{label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <div className="main-drag-region" data-tauri-drag-region />
        <Outlet />
      </main>
    </div>
  );
}
