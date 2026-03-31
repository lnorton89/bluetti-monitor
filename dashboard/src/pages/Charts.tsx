import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchHistory, fetchFields } from '../lib/api';
import { getFieldMeta, categoryColors } from '../lib/fields';
import { formatTime, formatTimeShort } from '../lib/time';
import { Card, SectionLabel, Spinner } from '../components/ui';
import { useWsStore } from '../store/ws';
import { Activity, TrendingUp, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const COLORS = ['var(--amber)', 'var(--blue)', 'var(--green)', '#a78bfa', '#fb7185'];

interface ChartConfig {
  device: string;
  field:  string;
  color:  string;
}

export default function Charts() {
  const location = useLocation();
  const wsState  = useWsStore(s => s.state);
  const liveDevices = Object.keys(wsState);

  const [selectedDevice, setSelectedDevice] = useState(liveDevices[0] ?? '');
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [limit, setLimit] = useState(200);
  const [isActive, setIsActive] = useState(false);

  // Only fetch when on the /charts route
  useEffect(() => {
    setIsActive(location.pathname === '/charts');
  }, [location.pathname]);

  const { data: fields = [] } = useQuery({
    queryKey: ['fields', selectedDevice],
    queryFn:  () => fetchFields(selectedDevice),
    enabled:  isActive && !!selectedDevice,
  });

  const numericFields = fields.filter(f => {
    const v = wsState[selectedDevice]?.[f]?.value;
    return v !== undefined && !isNaN(parseFloat(v));
  });

  function addChart(field: string) {
    if (charts.find(c => c.device === selectedDevice && c.field === field)) return;
    const color = COLORS[charts.length % COLORS.length];
    setCharts(prev => [...prev, { device: selectedDevice, field, color }]);
  }

  function removeChart(idx: number) {
    setCharts(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">
      {/* Controls */}
      <Card>
        <SectionLabel><Activity size={14} style={{ marginRight: 6 }} />Add Chart</SectionLabel>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start' }}>
          <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}
            className="ui-select"
            style={{ ...selectStyle, flex: '1 1 200px', minWidth: '150px' }}>
            {liveDevices.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select defaultValue="" onChange={e => { if (e.target.value) addChart(e.target.value); e.target.value = ''; }}
            className="ui-select"
            style={{ ...selectStyle, flex: '1 1 200px', minWidth: '150px' }}>
            <option value="" disabled>Select field...</option>
            {numericFields.map(f => (
              <option key={f} value={f}>{getFieldMeta(f).label}</option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>Points:</span>
            {[50, 200, 500].map(n => (
              <button key={n} onClick={() => setLimit(n)} className="ui-pill-button" style={{
                padding: '6px 12px',
                background: limit === n ? 'var(--amber-glow)' : 'var(--bg-3)',
                border: `1px solid ${limit === n ? 'var(--amber-dim)' : 'var(--border)'}`,
                color: limit === n ? 'var(--amber)' : 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 3,
                flexShrink: 0,
              }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {charts.length === 0 && isActive && (
        <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={18} />
          Select a field above to add a chart.
        </div>
      )}

      {charts.map((cfg, idx) => (
        <ChartCard key={`${cfg.device}-${cfg.field}`} cfg={cfg} limit={limit} onRemove={() => removeChart(idx)} isActive={isActive} />
      ))}
    </div>
  );
}

function ChartCard({ cfg, limit, onRemove, isActive }: { cfg: ChartConfig; limit: number; onRemove: () => void; isActive: boolean }) {
  const meta = getFieldMeta(cfg.field);
  const queryClient = useQueryClient();
  const latestLiveTs = useWsStore((s) => s.state[cfg.device]?.[cfg.field]?.ts ?? null);
  const { data, isLoading } = useQuery({
    queryKey: ['history', cfg.device, cfg.field, limit],
    queryFn:  () => fetchHistory(cfg.device, cfg.field, limit),
    enabled: isActive,
  });

  useEffect(() => {
    if (!isActive || latestLiveTs === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ['history', cfg.device, cfg.field, limit] });
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cfg.device, cfg.field, isActive, latestLiveTs, limit, queryClient]);

  const chartData = (data ?? []).slice().reverse().map(p => ({
    ts:    new Date(p.ts).getTime(),
    value: parseFloat(p.value),
  }));

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ fontFamily: 'var(--font-cond)', fontWeight: 600, fontSize: 20, color: cfg.color, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} />
              {meta.label}
            </div>
            <span style={{
              fontFamily: 'var(--font-cond)',
              fontSize: 11,
              letterSpacing: '0.08em',
              padding: '3px 8px',
              borderRadius: 3,
              background: 'var(--bg-3)',
              color: categoryColors[meta.category] || 'var(--text-muted)',
              border: `1px solid ${categoryColors[meta.category] || 'var(--border)'}`,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>
              {meta.category}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {cfg.device} · {cfg.field} · {chartData.length} readings
          </div>
        </div>
        <button onClick={onRemove} className="ui-icon-button" style={{ color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: '0 6px', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={ts => formatTimeShort(ts)}
              tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              scale="time"
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-3)',
                border: '1px solid var(--border-hi)',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--text)',
                padding: '10px 14px',
              }}
              labelFormatter={ts => formatTime(ts as number)}
              formatter={(v) => [`${v} ${meta.unit ?? ''}`, meta.label]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={cfg.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: cfg.color }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-3)',
  border: '1px solid var(--border-hi)',
  borderRadius: 3,
  color: 'var(--text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  padding: '8px 12px',
  outline: 'none',
  cursor: 'pointer',
};
