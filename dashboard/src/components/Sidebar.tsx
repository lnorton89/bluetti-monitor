import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Table2, Sun, Moon, X } from 'lucide-react';
import { useWsStore } from '../store/ws';
import { StatusDot } from './ui';
import { formatTime } from '../lib/time';
import { useThemeStore } from '../store/theme';

const NAV = [
  { to: '/',        icon: LayoutDashboard, label: 'Overview'  },
  { to: '/charts',  icon: Activity,        label: 'Charts'    },
  { to: '/raw',     icon: Table2,          label: 'Raw Data'  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const connected = useWsStore(s => s.connected);
  const lastUpdate = useWsStore(s => s.lastUpdate);
  const theme = useThemeStore(s => s.theme);
  const toggleTheme = useThemeStore(s => s.toggleTheme);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="sidebar-overlay"
        onClick={onClose}
        style={{
          display: isOpen ? 'block' : 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 99,
        }}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 200,
        height: '100dvh',
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        paddingBottom: 8,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          position: 'relative',
        }}>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="sidebar-close ui-icon-button"
            style={{
              display: 'none',
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: 6,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 101,
              transition: 'transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, color 0.2s ease',
            }}
          >
            <X size={18} />
          </button>
          <svg className="logo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 50" height="50" width="200" style={{ width: '100%', maxWidth: 160, height: 'auto' }}>
            <path fill="#00A2E4" d="M27.084 18.5978L22.54 20.1871L15.7306 12.0448L10 8.75684L29.1979 42L29.2147 35.3945L25.5664 25.4277L31.3477 21.0572L27.084 18.5978Z"></path>
            <path fill="#00A2E4" d="M27.5037 17.8708L26.6084 13.1421L16.1503 11.3176L10.4372 8H48.8327L43.1193 11.3176L32.6612 13.1421L31.7658 20.3328L27.5037 17.8708Z"></path>
            <path className="logo-text" d="M43.539 12.0448L49.2696 8.75684L30.072 42L30.0549 35.3945L43.539 12.0448Z"></path>
            <path className="logo-text" d="M76.8842 17.7334H80.6177V30.0204H93.1448L90.8991 32.1108H76.8842V17.7334ZM119.485 17.7334H138.173L135.972 19.8238H123.218V23.6383H136.107V25.7287H123.218V30.0204H136.444L138.781 32.1108H119.485V17.7334ZM148.846 19.8231L142.356 19.8223L140.396 17.7334H161.031L159.071 19.8223L152.58 19.8231V32.1108H148.846V19.8231ZM171.43 19.8231L164.939 19.8223L162.98 17.7334H183.613L181.653 19.8223L175.163 19.8231V32.1108H171.43V19.8231ZM186.266 17.7334H190V32.1108H186.266V17.7334ZM55.4146 17.7334H65.2516C67.6664 17.7334 69.9871 18.0617 72.2233 19.0036V23.6749C71.6962 24.0376 71.1947 24.2807 70.5675 24.4641C71.3382 24.6956 72.0462 25.0169 72.6696 25.48V30.6621C70.6886 31.8029 68.8922 32.1108 66.2832 32.1108H55.1024V18.3384L58.8359 20.2574V30.0204H65.2406C66.8682 30.0204 68.1123 29.9237 69.6596 29.4231V26.5014C68.3096 26.004 66.5384 25.8941 65.2516 25.8932L59.5401 25.8894V23.3544L65.2516 23.3537C66.5487 23.3537 67.8721 23.2796 69.1215 22.9061V20.2441C67.8869 19.8519 66.5376 19.8238 65.2516 19.8238H59.446L55.4146 17.7334ZM95.5771 28.7939V17.6508L99.0563 18.7689V27.9915C99.7482 28.8882 100.875 29.4168 101.955 29.6773H108.7C109.779 29.4168 110.907 28.889 111.598 27.9915V18.7689L115.078 17.6508V28.7939C113.519 30.6059 111.683 31.8176 109.335 32.3501H101.319C98.9794 31.8231 97.1316 30.6005 95.5771 28.7939Z"></path>
          </svg>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
          }}>
            MONITOR v1.0
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className="sidebar-nav-link"
              style={({ isActive }) => ({
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
              })}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
        }}>
          <button onClick={toggleTheme} className="ui-control-button" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '10px',
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-cond)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'LIGHT' : 'DARK'} MODE
          </button>
        </div>

        {/* Connection status */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, justifyContent: 'center' }}>
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
    </>
  );
}
