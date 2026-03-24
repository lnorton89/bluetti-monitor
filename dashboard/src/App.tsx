import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
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

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: 200,
        maxHeight: '100vh',
        overflowY: 'auto',
        minWidth: 0,
      }}>
        {/* Top bar */}
        <div style={{
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
        }}>
          AC500 Power Station Monitor
        </div>
        <div style={{ padding: 24 }}>
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
