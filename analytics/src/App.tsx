import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Battery,
  CheckCircle2,
  Gauge,
  Layers3,
  LineChart,
  PlugZap,
  RefreshCw,
  Search,
  Sun,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import {
  API_BASE,
  IS_MOCK_MODE,
  WS_URL,
  fetchDevices,
  fetchFields,
  fetchHistoryBundle,
  fetchStatus,
  mockState,
  type AllState,
  type LiveUpdate,
  type WsMessage,
} from './lib/api';
import {
  RANGE_PRESETS,
  buildComparisonTimeline,
  buildTimeline,
  clampPercent,
  fieldsForResolved,
  findPeak,
  getEnergyDelta,
  getNumericFields,
  resolveFields,
  summarize,
  type RangeId,
} from './lib/analytics';
import { formatFieldValue, formatMetric, getFieldMeta } from './lib/fields';
import { formatFreshness, formatShortTime } from './lib/time';
import { DenseTimeSeries } from './components/DenseTimeSeries';

const CHART_COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];
const RAINBOW = {
  red: CHART_COLORS[0],
  orange: CHART_COLORS[1],
  yellow: CHART_COLORS[2],
  green: CHART_COLORS[3],
  cyan: CHART_COLORS[4],
  blue: CHART_COLORS[5],
  violet: CHART_COLORS[6],
};
const DEFAULT_COMPARISON_FIELDS = ['dc_input_power', 'ac_output_power', 'total_battery_percent'];

function useLiveTelemetry() {
  const [state, setState] = useState<AllState>(() => (IS_MOCK_MODE ? mockState : {}));
  const [connected, setConnected] = useState(IS_MOCK_MODE);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (IS_MOCK_MODE) {
      setState(mockState);
      setConnected(true);
      setLastUpdate(new Date().toISOString());
      return undefined;
    }

    let closedByEffect = false;
    let reconnectTimer: number | null = null;
    let ws: WebSocket | null = null;

    const connect = () => {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closedByEffect) {
          reconnectTimer = window.setTimeout(connect, 3_000);
        }
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as WsMessage;
        if ('type' in message && message.type === 'snapshot') {
          setState(message.data);
          return;
        }

        const update = message as LiveUpdate;
        setLastUpdate(update.ts);
        setState((current) => ({
          ...current,
          [update.device]: {
            ...(current[update.device] ?? {}),
            [update.field]: { value: update.value, ts: update.ts },
          },
        }));
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      ws?.close();
    };
  }, []);

  return { state, connected, lastUpdate };
}

export default function App() {
  const [rangeId, setRangeId] = useState<RangeId>('24h');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [comparisonFields, setComparisonFields] = useState<string[]>(DEFAULT_COMPARISON_FIELDS);
  const [fieldSearch, setFieldSearch] = useState('');
  const live = useLiveTelemetry();

  const statusQuery = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
  });
  const devicesQuery = useQuery({
    queryKey: ['devices'],
    queryFn: fetchDevices,
  });

  const mergedState = Object.keys(live.state).length > 0 ? live.state : statusQuery.data ?? {};
  const devices = devicesQuery.data?.length ? devicesQuery.data : Object.keys(mergedState);

  useEffect(() => {
    if (devices.length === 0) {
      return;
    }
    if (!selectedDevice || !devices.includes(selectedDevice)) {
      setSelectedDevice(devices[0]);
    }
  }, [devices, selectedDevice]);

  const liveState = mergedState[selectedDevice] ?? {};
  const range = RANGE_PRESETS.find((item) => item.id === rangeId) ?? RANGE_PRESETS[2];
  const sinceIso = useMemo(
    () => new Date(Date.now() - range.minutes * 60_000).toISOString(),
    [range.minutes],
  );

  const fieldsQuery = useQuery({
    queryKey: ['fields', selectedDevice],
    queryFn: () => fetchFields(selectedDevice),
    enabled: Boolean(selectedDevice),
  });

  const fields = fieldsQuery.data ?? Object.keys(liveState);
  const numericFields = useMemo(() => getNumericFields(fields, liveState), [fields, liveState]);
  const resolved = useMemo(() => resolveFields(numericFields), [numericFields]);
  const historyFields = useMemo(
    () => [...new Set([...fieldsForResolved(resolved), ...comparisonFields.filter((field) => numericFields.includes(field))])],
    [comparisonFields, numericFields, resolved],
  );

  useEffect(() => {
    setComparisonFields((current) => {
      const valid = current.filter((field) => numericFields.includes(field));
      if (valid.length === current.length && valid.every((field, index) => field === current[index])) {
        return current;
      }
      if (valid.length > 0) {
        return valid;
      }

      const defaults = DEFAULT_COMPARISON_FIELDS.filter((field) => numericFields.includes(field)).slice(0, 3);
      if (defaults.length === current.length && defaults.every((field, index) => field === current[index])) {
        return current;
      }

      return defaults;
    });
  }, [numericFields]);

  const historyQuery = useQuery({
    queryKey: ['history-bundle', selectedDevice, range.id, historyFields.join('|')],
    queryFn: () => fetchHistoryBundle(selectedDevice, historyFields, { limit: range.limit, since: sinceIso }),
    enabled: Boolean(selectedDevice) && historyFields.length > 0,
  });

  const history = historyQuery.data ?? {};
  const timeline = useMemo(() => buildTimeline(resolved, history, range.bucketMs), [history, range.bucketMs, resolved]);
  const comparisonTimeline = useMemo(
    () => buildComparisonTimeline(comparisonFields, history, range.bucketMs),
    [comparisonFields, history, range.bucketMs],
  );

  const inputSummary = summarize(timeline, 'totalInput');
  const outputSummary = summarize(timeline, 'totalOutput');
  const netSummary = summarize(timeline, 'netPower');
  const batterySummary = summarize(timeline, 'batteryPercent');
  const voltageSummary = summarize(timeline, 'batteryVoltage');
  const energyDelta = getEnergyDelta(timeline);
  const peakLoad = findPeak(timeline, 'totalOutput');
  const peakSolar = findPeak(timeline, 'solarInput');
  const solarShare = clampPercent(
    inputSummary && summarize(timeline, 'solarInput') && inputSummary.avg > 0
      ? (summarize(timeline, 'solarInput')!.avg / inputSummary.avg) * 100
      : null,
  );
  const coverage = clampPercent(
    inputSummary && outputSummary && outputSummary.avg > 0 ? (inputSummary.avg / outputSummary.avg) * 100 : null,
  );
  const chargeBuckets = timeline.filter((point) => typeof point.netPower === 'number' && point.netPower >= 0).length;
  const netBuckets = timeline.filter((point) => typeof point.netPower === 'number').length;
  const chargeShare = clampPercent(netBuckets > 0 ? (chargeBuckets / netBuckets) * 100 : null);

  const filteredNumericFields = numericFields.filter((field) => {
    const query = fieldSearch.trim().toLowerCase();
    const meta = getFieldMeta(field);
    return !query || meta.label.toLowerCase().includes(query) || field.toLowerCase().includes(query);
  });

  const latestTimestamp = Object.values(liveState)
    .map((item) => item.ts)
    .sort()
    .at(-1) ?? live.lastUpdate;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Bluetti Monitor</p>
            <h1>Analytics</h1>
          </div>
          <div className="status-row">
            <StatusPill active={live.connected} label={live.connected ? 'Live stream' : 'Offline'} />
            <span className="status-pill muted">
              <Activity size={15} />
              {formatFreshness(latestTimestamp)}
            </span>
          </div>
        </header>

        <section className="controls-band">
          <label className="control-field">
            <span>Device</span>
            <select value={selectedDevice} onChange={(event) => setSelectedDevice(event.target.value)}>
              {devices.map((device) => (
                <option key={device} value={device}>{device}</option>
              ))}
            </select>
          </label>
          <div className="segmented" aria-label="Time range">
            {RANGE_PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === range.id ? 'active' : ''}
                onClick={() => setRangeId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Refresh analytics"
            onClick={() => void historyQuery.refetch()}
          >
            <RefreshCw size={18} />
          </button>
        </section>

        {devices.length === 0 ? (
          <section className="empty-state">
            <WifiOff size={36} />
            <h2>Waiting for telemetry</h2>
            <p>Start the API stack or open with <code>?mock=1</code> to preview the analytics workspace.</p>
          </section>
        ) : (
          <>
            <section className="kpi-grid">
              <Kpi icon={Gauge} label="Net Power" value={formatMetric(netSummary?.current, 'W')} detail={`Average ${formatMetric(netSummary?.avg, 'W')}`} tone={netSummary?.current && netSummary.current >= 0 ? 'good' : 'warn'} />
              <Kpi icon={PlugZap} label="Average Load" value={formatMetric(outputSummary?.avg, 'W')} detail={peakLoad ? `Peak ${formatMetric(peakLoad.totalOutput, 'W')} at ${formatShortTime(peakLoad.ts)}` : 'No load history'} />
              <Kpi icon={Sun} label="Solar Share" value={formatMetric(solarShare, '%')} detail={peakSolar ? `Peak ${formatMetric(peakSolar.solarInput, 'W')} at ${formatShortTime(peakSolar.ts)}` : 'No solar history'} tone="sun" />
              <Kpi icon={Battery} label="Battery Move" value={formatMetric(batterySummary?.change, '%', 1)} detail={`Current ${formatMetric(batterySummary?.current, '%', 1)}`} tone="battery" />
              <Kpi icon={Zap} label="Generated" value={formatMetric(energyDelta, 'kWh', 2)} detail={`${range.label} production delta`} />
              <Kpi icon={CheckCircle2} label="Input Coverage" value={formatMetric(coverage, '%')} detail={`${formatMetric(chargeShare, '%')} of buckets charging`} />
            </section>

            <section className="grid-layout">
              <article className="panel panel-large">
                <PanelHeader
                  icon={LineChart}
                  title="Power Balance"
                  subtitle={`${range.label} window, ${timeline.length} buckets`}
                  loading={historyQuery.isFetching}
                />
                <div className="chart-frame">
                  <DenseTimeSeries
                    timestamps={timeline.map((row) => row.ts)}
                    series={[
                      { label: 'Total input', color: RAINBOW.red, values: timeline.map((row) => row.totalInput) },
                      { label: 'Total output', color: RAINBOW.green, values: timeline.map((row) => row.totalOutput) },
                      { label: 'Net power', color: RAINBOW.blue, values: timeline.map((row) => row.netPower) },
                    ]}
                  />
                </div>
                <div className="legend-strip">
                  <span><i style={{ background: RAINBOW.red }} />Total input</span>
                  <span><i style={{ background: RAINBOW.green }} />Total output</span>
                  <span><i style={{ background: RAINBOW.blue }} />Net power</span>
                </div>
              </article>

              <article className="panel">
                <PanelHeader icon={Battery} title="Battery Posture" subtitle={resolved.batteryPercent ?? 'No SOC field'} />
                <DenseTimeSeries
                  timestamps={timeline.map((row) => row.ts)}
                  series={[
                    { label: 'SOC', color: RAINBOW.green, values: timeline.map((row) => row.batteryPercent) },
                    { label: 'Voltage', color: RAINBOW.cyan, values: timeline.map((row) => row.batteryVoltage) },
                  ]}
                />
                <div className="legend-strip compact">
                  <span><i style={{ background: RAINBOW.green }} />SOC</span>
                  <span><i style={{ background: RAINBOW.cyan }} />Voltage</span>
                </div>
                <div className="side-stats">
                  <SideStat label="SOC range" value={`${formatMetric(batterySummary?.min, '%', 1)} to ${formatMetric(batterySummary?.max, '%', 1)}`} />
                  <SideStat label="Voltage avg" value={formatMetric(voltageSummary?.avg, 'V', 1)} />
                </div>
              </article>

              <article className="panel">
                <PanelHeader icon={Layers3} title="Resolved Fields" subtitle="API fields behind each metric" />
                <div className="field-list">
                  {Object.entries(resolved).map(([metric, field]) => (
                    <div className="field-row" key={metric}>
                      <span>{metric.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</span>
                      <strong>{field ?? 'Unavailable'}</strong>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="panel">
              <PanelHeader icon={Search} title="Field Comparison" subtitle="Dense uPlot view for selected numeric fields" />
              <div className="field-picker">
                <label className="search-box">
                  <Search size={16} />
                  <input value={fieldSearch} onChange={(event) => setFieldSearch(event.target.value)} placeholder="Search fields" />
                </label>
                <div className="field-chips">
                  {filteredNumericFields.map((field) => {
                    const active = comparisonFields.includes(field);
                    return (
                      <button
                        key={field}
                        type="button"
                        className={active ? 'chip active' : 'chip'}
                        onClick={() => {
                          setComparisonFields((current) => (
                            active ? current.filter((item) => item !== field) : [...current, field].slice(-6)
                          ));
                        }}
                      >
                        {getFieldMeta(field).label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <DenseTimeSeries
                timestamps={comparisonTimeline.map((row) => row.ts)}
                series={comparisonFields.map((field, index) => ({
                  label: getFieldMeta(field).label,
                  color: CHART_COLORS[index % CHART_COLORS.length],
                  values: comparisonTimeline.map((row) => row[field]),
                }))}
              />
              <div className="legend-strip">
                {comparisonFields.map((field, index) => (
                  <span key={field}>
                    <i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                    {getFieldMeta(field).label}
                  </span>
                ))}
              </div>
            </section>

            <section className="panel">
              <PanelHeader icon={Wifi} title="Live Snapshot" subtitle={`${Object.keys(liveState).length} fields from ${API_BASE}`} />
              <div className="snapshot-grid">
                {Object.entries(liveState)
                  .filter(([field]) => field !== '_raw')
                  .slice(0, 18)
                  .map(([field, reading]) => (
                    <div className="snapshot-cell" key={field}>
                      <span>{getFieldMeta(field).label}</span>
                      <strong>{formatFieldValue(field, reading.value)}</strong>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  const Icon = active ? Wifi : WifiOff;
  return (
    <span className={active ? 'status-pill active' : 'status-pill'}>
      <Icon size={15} />
      {label}
    </span>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'default',
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'good' | 'warn' | 'sun' | 'battery';
}) {
  return (
    <article className={`kpi ${tone}`}>
      <div className="kpi-icon"><Icon size={19} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  loading = false,
}: {
  icon: typeof LineChart;
  title: string;
  subtitle: string;
  loading?: boolean;
}) {
  return (
    <header className="panel-header">
      <div>
        <span className="panel-icon"><Icon size={17} /></span>
        <h2>{title}</h2>
      </div>
      <p>{loading ? 'Refreshing...' : subtitle}</p>
    </header>
  );
}

function SideStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="side-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
