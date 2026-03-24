import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Table2 } from 'lucide-react';
import { useWsStore } from '../store/ws';
import { StatusDot } from './ui';
import { formatTime } from '../lib/time';

const NAV = [
  { to: '/',        icon: LayoutDashboard, label: 'Overview'  },
  { to: '/charts',  icon: Activity,        label: 'Charts'    },
  { to: '/raw',     icon: Table2,          label: 'Raw Data'  },
];

export function Sidebar() {
  const connected = useWsStore(s => s.connected);
  const lastUpdate = useWsStore(s => s.lastUpdate);

  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      width: 200,
      height: '100vh',
      background: 'var(--bg-2)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-cond)',
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: '0.1em',
          color: 'var(--amber)',
        }}>
          BLUETTI
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-muted)',
          marginTop: 4,
          letterSpacing: '0.05em',
        }}>
          MONITOR v1.0
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 0' }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            fontSize: 15,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'var(--amber)' : 'var(--text-dim)',
            background: isActive ? 'var(--amber-glow)' : 'transparent',
            borderLeft: `3px solid ${isActive ? 'var(--amber)' : 'transparent'}`,
            transition: 'all 0.15s ease',
          })}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Connection status */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <StatusDot ok={connected} />
          <span style={{ fontFamily: 'var(--font-cond)', fontSize: 13, letterSpacing: '0.1em', color: connected ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        {lastUpdate && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            {formatTime(lastUpdate)}
          </div>
        )}
      </div>
    </aside>
  );
}
