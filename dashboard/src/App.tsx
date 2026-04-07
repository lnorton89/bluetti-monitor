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
  const dcInput = Number.parseFloat(primaryDevice?.dc_input_power?.value ?? '0') || 0;
  const acInput = Number.parseFloat(primaryDevice?.ac_input_power?.value ?? '0') || 0;
  const dcOutput = Number.parseFloat(primaryDevice?.dc_output_power?.value ?? '0') || 0;
  const acOutput = Number.parseFloat(primaryDevice?.ac_output_power?.value ?? '0') || 0;
  const inputPower = dcInput + acInput;
  const outputPower = dcOutput + acOutput;
  const netPower = inputPower - outputPower;

  const routeMeta = location.pathname === '/charts'
    ? {
        kicker: 'Historical trends',
        title: 'Power and telemetry charts',
        summary: 'Build focused comparisons across the AC500 fields that matter, then zoom in on how load, charging, and system behavior change over time.',
      }
    : location.pathname === '/raw'
      ? {
          kicker: 'Field inventory',
          title: 'Raw AC500 data explorer',
          summary: 'Inspect the live field footprint exactly as the stack receives it, with search and category grouping tuned for troubleshooting and trust.',
        }
      : {
          kicker: 'Desktop monitor',
          title: 'AC500 power station monitor',
          summary: 'Track live battery, input, output, and mode state in a single workspace shaped around the real telemetry this stack actually receives.',
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
            {batteryPercent !== null ? (
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
            <section className="route-hero">
              <div className="route-hero-copy">
                <span className="route-hero-kicker">{routeMeta.kicker}</span>
                <h1 className="route-hero-title">{routeMeta.title}</h1>
                <p className="route-hero-summary">{routeMeta.summary}</p>
              </div>
              <div className="route-hero-stats" aria-label="Telemetry summary">
                <div className="route-hero-stat">
                  <span>Input</span>
                  <strong>{inputPower} W</strong>
                </div>
                <div className="route-hero-stat">
                  <span>Output</span>
                  <strong>{outputPower} W</strong>
                </div>
                <div className="route-hero-stat">
                  <span>Net</span>
                  <strong data-balance={netPower >= 0 ? 'positive' : 'negative'}>
                    {netPower >= 0 ? '+' : ''}
                    {netPower} W
                  </strong>
                </div>
                <div className="route-hero-stat">
                  <span>Freshness</span>
                  <strong>{lastUpdate ? formatRelativeTime(lastUpdate) : 'Waiting'}</strong>
                </div>
              </div>
            </section>
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
