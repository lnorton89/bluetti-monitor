import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Menu, Radio, Battery, Cpu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import Overview from './pages/Overview';
import Charts from './pages/Charts';
import RawData from './pages/RawData';
import { useWsStore } from './store/ws';
import { formatRelativeTime } from './lib/time';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, retry: 2 } },
});

function Layout() {
  const location = useLocation();
  const connect = useWsStore((s) => s.connect);
  const disconnect = useWsStore((s) => s.disconnect);
  const wsState = useWsStore((s) => s.state);
  const connected = useWsStore((s) => s.connected);
  const lastUpdate = useWsStore((s) => s.lastUpdate);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const devices = Object.keys(wsState);
  const primaryDevice = devices[0] ? wsState[devices[0]] : null;
  const batteryPercent = primaryDevice?.total_battery_percent?.value ?? null;

  const routeMeta = location.pathname === '/charts'
    ? {
        kicker: 'Historical trends',
        title: 'Power and telemetry charts',
      }
    : location.pathname === '/raw'
      ? {
          kicker: 'Field inventory',
          title: 'Raw AC500 data explorer',
        }
      : {
          kicker: 'Desktop monitor',
          title: 'AC500 power station monitor',
        };

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 0),
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 80),
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 240),
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 600),
    ];

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [sidebarOpen]);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-main">
        <header className="top-bar">
          <button
            onClick={() => setSidebarOpen(true)}
            className="hamburger-btn"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="top-bar-copy">
            <span className="top-bar-kicker">{routeMeta.kicker}</span>
            <span className="top-bar-title">{routeMeta.title}</span>
          </div>
          <div className="top-bar-metrics">
            <div className="top-bar-metric">
              <Radio size={14} />
              <span>{connected ? 'Live' : 'Offline'}</span>
            </div>
            <div className="top-bar-metric">
              <Cpu size={14} />
              <span>{devices.length} device{devices.length === 1 ? '' : 's'}</span>
            </div>
            {batteryPercent ? (
              <div className="top-bar-metric">
                <Battery size={14} />
                <span>{batteryPercent}% battery</span>
              </div>
            ) : null}
            {lastUpdate ? (
              <div className="top-bar-metric muted">
                <span>{formatRelativeTime(lastUpdate)}</span>
              </div>
            ) : null}
          </div>
        </header>
        <div className="app-content">
          <div className="app-content-inner">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/charts" element={<Charts />} />
              <Route path="/raw" element={<RawData />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
