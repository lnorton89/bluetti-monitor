import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Bell, BellOff, BellRing, Battery, Cpu, Menu, Radio } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { getRouteMeta } from './lib/routes';
import Overview from './pages/Overview';
import Charts from './pages/Charts';
import RawData from './pages/RawData';
import Solar from './pages/Solar';
import Settings from './pages/Settings';
import { useBatteryFullNotifications } from './lib/notifications';
import { useShellStore } from './store/shell';
import { useWsStore } from './store/ws';
import { useTelemetryState } from './hooks/useTelemetryState';
import { formatRelativeTime } from './lib/time';
import { useAppSettingsStore } from './store/settings';

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
  const shellRouteId = useShellStore((s) => s.routeId);
  const shellSignalValue = useShellStore((s) => s.value);
  const browserBatteryFullEnabled = useAppSettingsStore((s) => s.alerts.batteryFullBrowser);
  const desktopBatteryFullEnabled = useAppSettingsStore((s) => s.alerts.batteryFullDesktop);
  const showFreshness = useAppSettingsStore((s) => s.dashboard.showFreshness);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Telemetry state for stale indicator in shell
  const { isStale, staleSeverity } = useTelemetryState();

  const {
    browserNotificationPermission,
    desktopNotificationsAvailable,
    requestBrowserNotifications,
  } = useBatteryFullNotifications(wsState);

  const devices = Object.keys(wsState);
  const primaryDevice = devices[0] ? wsState[devices[0]] : null;
  const batteryPercent = primaryDevice?.total_battery_percent?.value ?? null;
  const BrowserNotificationIcon = browserNotificationPermission === 'granted'
    ? BellRing
    : browserNotificationPermission === 'denied'
      ? BellOff
      : Bell;
  const showBrowserNotificationControl = browserNotificationPermission !== 'unsupported';
  const browserNotificationLabel = !browserBatteryFullEnabled
    ? 'Browser alerts off'
    : browserNotificationPermission === 'granted'
      ? 'Browser alerts armed'
      : browserNotificationPermission === 'denied'
        ? 'Browser alerts blocked'
        : 'Enable browser alerts';
  const showBrowserNotificationButton =
    browserBatteryFullEnabled && browserNotificationPermission === 'default';
  const DesktopNotificationIcon = desktopBatteryFullEnabled ? BellRing : BellOff;
  const desktopNotificationLabel = desktopBatteryFullEnabled
    ? 'Desktop alerts armed'
    : 'Desktop alerts off';

  const routeMeta = getRouteMeta(location.pathname);
  const routeSignalValue = shellRouteId === routeMeta.id && shellSignalValue
    ? shellSignalValue
    : '--';

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
            aria-label="Open Navigation"
          >
            <Menu size={20} />
          </button>
          <div className="top-bar-copy">
            <span className="top-bar-kicker">Workspace</span>
            <span className="top-bar-title" data-testid="shell-title">{routeMeta.shellTitle}</span>
          </div>
          <div className="top-bar-metric muted top-bar-signal" data-testid="shell-route-signal">
            <span className="top-bar-signal-label">{routeMeta.mobileSignalLabel}</span>
            <strong className="top-bar-signal-value">{routeSignalValue}</strong>
          </div>
          <div className="top-bar-metrics">
            <div className="top-bar-metric" data-testid="shell-status-connection">
              <Radio size={14} />
              <span>{connected ? 'Live' : 'Offline'}</span>
            </div>
            <div className="top-bar-metric" data-testid="shell-status-devices">
              <Cpu size={14} />
              <span>{devices.length} device{devices.length === 1 ? '' : 's'}</span>
            </div>
            {desktopNotificationsAvailable ? (
              <div className="top-bar-metric" data-testid="shell-status-notifications">
                <DesktopNotificationIcon size={14} />
                <span>{desktopNotificationLabel}</span>
              </div>
            ) : null}
            {showBrowserNotificationControl ? (
              showBrowserNotificationButton ? (
                <button
                  type="button"
                  onClick={() => {
                    void requestBrowserNotifications();
                  }}
                  className="top-bar-metric"
                  aria-label="Enable browser alerts"
                  data-testid="shell-status-notifications"
                >
                  <Bell size={14} />
                  <span>{browserNotificationLabel}</span>
                </button>
              ) : (
                <div className="top-bar-metric" data-testid="shell-status-notifications">
                  <BrowserNotificationIcon size={14} />
                  <span>{browserNotificationLabel}</span>
                </div>
              )
            ) : null}
            {batteryPercent !== null ? (
              <div className="top-bar-metric" data-testid="shell-status-battery">
                <Battery size={14} />
                <span>{batteryPercent}% battery</span>
              </div>
            ) : null}
            {showFreshness && lastUpdate ? (
              <div
                className="top-bar-metric muted"
                data-testid="shell-status-freshness"
                style={{
                  color: isStale && staleSeverity === 'stale'
                    ? 'var(--red)'
                    : isStale && staleSeverity === 'aging'
                      ? 'var(--amber)'
                      : undefined
                }}
              >
                <span>{isStale && staleSeverity === 'stale' ? 'Stale: ' : ''}{formatRelativeTime(lastUpdate)}</span>
              </div>
            ) : null}
          </div>
        </header>
        <div className="app-content">
          <div className="app-content-inner">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/charts" element={<Charts />} />
              <Route path="/solar" element={<Solar />} />
              <Route path="/raw" element={<RawData />} />
              <Route path="/settings" element={<Settings />} />
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
