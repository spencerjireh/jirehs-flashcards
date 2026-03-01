import { invoke } from '@tauri-apps/api/core';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ViewColumns3, StatsReport, Settings, SidebarCollapse, SidebarExpand } from 'iconoir-react';
import logoSrc from '../../assets/logo.png';
import { useLocalStorage } from '../../hooks/useLocalStorage';

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
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false);

  return (
    <div className="app" data-collapsed={collapsed || undefined}>
      <aside className="sidebar" data-tauri-drag-region data-collapsed={collapsed || undefined}>
        <div className="sidebar-grain" />

        <div
          className="sidebar-drag-region"
          data-tauri-drag-region
          onMouseEnter={() => onTrafficLightHover(true)}
          onMouseLeave={() => onTrafficLightHover(false)}
        />

        <Link to="/" className="sidebar-brand" title={collapsed ? "Jireh's Flashcards" : undefined}>
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
              title={collapsed ? label : undefined}
            >
              <span className="sidebar-nav-icon"><Icon /></span>
              <span className="sidebar-nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="sidebar-nav-icon">
            {collapsed ? <SidebarExpand /> : <SidebarCollapse />}
          </span>
          <span className="sidebar-nav-label">Collapse</span>
        </button>
      </aside>

      <main className="main">
        <div className="main-drag-region" data-tauri-drag-region />
        <Outlet />
      </main>
    </div>
  );
}
