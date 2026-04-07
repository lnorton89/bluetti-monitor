import { useEffect, useState, type CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useLocation } from 'react-router-dom';
import { Activity, TrendingUp, X } from 'lucide-react';
import { fetchHistory, fetchFields } from '../lib/api';
import { getFieldMeta, categoryColors } from '../lib/fields';
import { formatTime, formatTimeShort } from '../lib/time';
import { Card, Spinner } from '../components/ui';
import { useWsStore } from '../store/ws';

const COLORS = ['var(--amber)', 'var(--blue)', 'var(--green)', '#a78bfa', '#fb7185'];

interface ChartConfig {
  device: string;
  field: string;
  color: string;
}

export default function Charts() {
  const location = useLocation();
  const wsState = useWsStore((s) => s.state);
  const liveDevices = Object.keys(wsState);

  const [selectedDevice, setSelectedDevice] = useState(liveDevices[0] ?? '');
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [limit, setLimit] = useState(200);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(location.pathname === '/charts');
  }, [location.pathname]);

  useEffect(() => {
    if (liveDevices.length === 0) {
      setSelectedDevice('');
      return;
    }

    if (!selectedDevice || !liveDevices.includes(selectedDevice)) {
      setSelectedDevice(liveDevices[0]);
    }
  }, [liveDevices, selectedDevice]);

  const { data: fields = [] } = useQuery({
    queryKey: ['fields', selectedDevice],
    queryFn: () => fetchFields(selectedDevice),
    enabled: isActive && !!selectedDevice,
  });

  const numericFields = fields.filter((field) => {
    const value = wsState[selectedDevice]?.[field]?.value;
    return value !== undefined && !Number.isNaN(Number.parseFloat(value));
  });

  function addChart(field: string) {
    if (charts.find((chart) => chart.device === selectedDevice && chart.field === field)) {
      return;
    }

    const color = COLORS[charts.length % COLORS.length];
    setCharts((prev) => [...prev, { device: selectedDevice, field, color }]);
  }

  function removeChart(idx: number) {
    setCharts((prev) => prev.filter((_, index) => index !== idx));
  }

  if (liveDevices.length === 0) {
    return (
      <div className="page-stack animate-fade-in">
        <div className="empty-state-card">
          <div className="empty-state-title">Waiting for chart data</div>
          <div className="empty-state-copy">
            As soon as the live stream comes online, you can layer historical traces here for charging, load, and system behavior.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack animate-fade-in">
      <Card className="workspace-panel">
        <div className="workspace-panel-header">
          <div className="workspace-panel-copy">
            <div className="workspace-panel-kicker">Historical workspace</div>
            <div className="workspace-panel-title">
              <Activity size={16} />
              <span>Build chart comparisons</span>
            </div>
            <p className="workspace-panel-summary">
              Pick a device, add the numeric fields worth watching, and adjust the point count depending on whether you want fast scanning or more history.
            </p>
          </div>
          <div className="workspace-panel-meta">
            <span>{liveDevices.length} active source{liveDevices.length === 1 ? '' : 's'}</span>
            <span>{charts.length} chart{charts.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="control-grid">
          <select
            value={selectedDevice}
            onChange={(event) => setSelectedDevice(event.target.value)}
            className="ui-select workspace-select"
            style={selectStyle}
          >
            {liveDevices.map((device) => (
              <option key={device} value={device}>{device}</option>
            ))}
          </select>

          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                addChart(event.target.value);
              }
              event.target.value = '';
            }}
            className="ui-select workspace-select"
            style={selectStyle}
          >
            <option value="" disabled>Select field...</option>
            {numericFields.map((field) => (
              <option key={field} value={field}>{getFieldMeta(field).label}</option>
            ))}
          </select>

          <div className="control-cluster">
            <span className="control-cluster-label">Points</span>
            {[50, 200, 500].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setLimit(size)}
                className={`ui-pill-button workspace-pill${limit === size ? ' active' : ''}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {charts.length === 0 && isActive ? (
        <Card className="workspace-empty-card">
          <div className="workspace-empty-copy">
            <TrendingUp size={18} />
            <span>Select a field above to start layering trend lines.</span>
          </div>
        </Card>
      ) : null}

      {charts.map((cfg, idx) => (
        <ChartCard
          key={`${cfg.device}-${cfg.field}`}
          cfg={cfg}
          limit={limit}
          onRemove={() => removeChart(idx)}
          isActive={isActive}
        />
      ))}
    </div>
  );
}

function ChartCard({
  cfg,
  limit,
  onRemove,
  isActive,
}: {
  cfg: ChartConfig;
  limit: number;
  onRemove: () => void;
  isActive: boolean;
}) {
  const meta = getFieldMeta(cfg.field);
  const queryClient = useQueryClient();
  const latestLiveTs = useWsStore((s) => s.state[cfg.device]?.[cfg.field]?.ts ?? null);

  const { data, isLoading } = useQuery({
    queryKey: ['history', cfg.device, cfg.field, limit],
    queryFn: () => fetchHistory(cfg.device, cfg.field, limit),
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

  const chartData = (data ?? []).slice().reverse().map((point) => ({
    ts: new Date(point.ts).getTime(),
    value: Number.parseFloat(point.value),
  }));

  return (
    <Card className="chart-card-surface">
      <div className="chart-card-header">
        <div className="chart-card-copy">
          <div className="chart-card-title-row">
            <div className="chart-card-title" style={{ color: cfg.color }}>
              <TrendingUp size={18} />
              {meta.label}
            </div>
            <span
              className="data-chip"
              style={{
                color: categoryColors[meta.category] || 'var(--text-muted)',
                borderColor: categoryColors[meta.category] || 'var(--border)',
              }}
            >
              {meta.category}
            </span>
          </div>
          <div className="chart-card-meta">
            {cfg.device} / {cfg.field} / {chartData.length} readings
          </div>
        </div>
        <button onClick={onRemove} className="ui-icon-button chart-remove-button" type="button">
          <X size={20} />
        </button>
      </div>

      {isLoading ? (
        <div className="chart-loading-shell">
          <Spinner />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) => formatTimeShort(ts)}
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
                borderRadius: 12,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--text)',
                padding: '10px 14px',
              }}
              labelFormatter={(ts) => formatTime(ts as number)}
              formatter={(value) => [`${value} ${meta.unit ?? ''}`, meta.label]}
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

const selectStyle: CSSProperties = {
  background: 'var(--bg-3)',
  border: '1px solid var(--border-hi)',
  borderRadius: 12,
  color: 'var(--text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  padding: '12px 14px',
  outline: 'none',
  cursor: 'pointer',
};
