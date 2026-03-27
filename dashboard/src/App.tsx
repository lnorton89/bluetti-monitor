import { useState } from 'react';
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { Menu } from 'lucide-react';
import Overview from './pages/Overview';
import Charts   from './pages/Charts';
import RawData  from './pages/RawData';
import { useWsStore } from './store/ws';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, retry: 2 } },
});

function Layout() {
  const connect    = useWsStore(s => s.connect);
  const disconnect = useWsStore(s => s.disconnect);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', height: '100dvh', overflow: 'hidden' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{
        flex: 1,
        marginLeft: 200,
        height: '100dvh',
        overflowY: 'auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top bar */}
        <div className="top-bar" style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--font-cond)',
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          position: 'sticky',
          top: 0,
          background: 'var(--bg)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          {/* Hamburger menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="hamburger-btn"
            style={{
              display: 'none',
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text)',
              cursor: 'pointer',
              padding: 8,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              width: 36,
              height: 36,
              transition: 'transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, color 0.2s ease',
            }}
          >
            <Menu size={20} />
          </button>
          <span className="top-bar-title" style={{ flex: 1, textAlign: 'center' }}>AC500 Power Station Monitor</span>
        </div>
        <div style={{ padding: 24, flex: 1 }}>
          <Routes>
            <Route path="/"       element={<Overview />} />
            <Route path="/charts" element={<Charts   />} />
            <Route path="/raw"    element={<RawData  />} />
          </Routes>
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
