import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLocation } from 'react-router-dom';
import {
  Activity,
  Battery,
  Fan,
  Gauge,
  Layers3,
  LineChart as LineChartIcon,
  Plus,
  Search,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { fetchFields, fetchHistory } from '../lib/api';
import {
  buildAnalyticsTimeline,
  buildCoverageLabel,
  buildIndexedComparisonTimeline,
  findPeakPoint,
  resolveCoreFields,
  summarizeTimelineMetric,
  type AnalyticsTimelinePoint,
} from '../lib/chartAnalytics';
import { categoryColors, formatValue, getFieldMeta } from '../lib/fields';
import { formatTime } from '../lib/time';
import { Card, Spinner } from '../components/ui';
import { useShellStore } from '../store/shell';
import { useWsStore } from '../store/ws';

const CHART_COLORS = ['#38bdf8', '#f59e0b', '#34d399', '#f472b6', '#a78bfa', '#f87171'];
const RANGE_PRESETS = [
  { id: '1h', label: '1H', minutes: 60, limit: 720, bucketMs: 60_000 },
  { id: '6h', label: '6H', minutes: 360, limit: 2_400, bucketMs: 5 * 60_000 },
  { id: '24h', label: '24H', minutes: 1_440, limit: 5_000, bucketMs: 15 * 60_000 },
  { id: '72h', label: '3D', minutes: 4_320, limit: 5_000, bucketMs: 60 * 60_000 },
] as const;
const FOCUS_OPTIONS = [
  { id: 'balance', label: 'Power balance', icon: Gauge },
  { id: 'sources', label: 'Input sources', icon: Sun },
  { id: 'battery', label: 'Battery', icon: Battery },
  { id: 'health', label: 'System health', icon: Fan },
] as const;

type RangePreset = typeof RANGE_PRESETS[number];
type FocusId = typeof FOCUS_OPTIONS[number]['id'];
type AnalyticsPayload = {
  timeline: AnalyticsTimelinePoint[];
  resolvedFields: ReturnType<typeof resolveCoreFields>;
  bucketLabel: string;
  sinceIso: string;
};
type ComparisonPayload = {
  timeline: Array<{ ts: number } & Record<string, number | null>>;
  colors: Record<string, string>;
};

export default function Charts() {
  const location = useLocation();
  const wsState = useWsStore((state) => state.state);
  const setRouteSignal = useShellStore((state) => state.setRouteSignal);
  const resetRouteSignal = useShellStore((state) => state.resetRouteSignal);
  const liveDevices = Object.keys(wsState);
  const [selectedDevice, setSelectedDevice] = useState(liveDevices[0] ?? '');
  const [rangeId, setRangeId] = useState<RangePreset['id']>('24h');
  const [focus, setFocus] = useState<FocusId>('balance');
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [fieldSearch, setFieldSearch] = useState('');
  const [isActive, setIsActive] = useState(false);
  const deferredSearch = useDeferredValue(fieldSearch);

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

  const range = RANGE_PRESETS.find((preset) => preset.id === rangeId) ?? RANGE_PRESETS[2];
  const sinceIso = new Date(Date.now() - range.minutes * 60_000).toISOString();

  useEffect(() => {
    setRouteSignal('charts', range.label);

    return () => {
      resetRouteSignal('charts');
    };
  }, [range.label, resetRouteSignal, setRouteSignal]);

  const { data: fields = [], isLoading: isLoadingFields } = useQuery({
    queryKey: ['fields', selectedDevice],
    queryFn: () => fetchFields(selectedDevice),
    enabled: isActive && !!selectedDevice,
  });

  const numericFields = fields.filter((field) => {
    const liveValue = wsState[selectedDevice]?.[field]?.value;
    const meta = getFieldMeta(field);
    return meta.numeric || (liveValue !== undefined && Number.isFinite(Number.parseFloat(liveValue)));
  });
  const resolvedCoreFields = resolveCoreFields(numericFields);

  useEffect(() => {
    startTransition(() => {
      setCustomFields((previous) => previous.filter((field) => numericFields.includes(field)));
    });
  }, [numericFields]);

  useEffect(() => {
    if (customFields.length > 0) {
      return;
    }
    const defaults = [resolvedCoreFields.solarInput, resolvedCoreFields.acLoad]
      .filter((field): field is string => Boolean(field))
      .filter((field, index, list) => list.indexOf(field) === index);
    if (defaults.length === 0) {
      return;
    }
    startTransition(() => {
      setCustomFields(defaults);
    });
  }, [customFields.length, resolvedCoreFields.acLoad, resolvedCoreFields.solarInput]);

  const analyticsQuery = useQuery({
    queryKey: ['chart-analytics', selectedDevice, range.id, numericFields.join('|')],
    enabled: isActive && !!selectedDevice && numericFields.length > 0,
    queryFn: async (): Promise<AnalyticsPayload> => {
      const resolved = resolveCoreFields(numericFields);
      const uniqueFields = Object.values(resolved)
        .filter((field): field is string => Boolean(field))
        .filter((field, index, list) => list.indexOf(field) === index);
      const historyEntries = await Promise.all(
        uniqueFields.map(async (field) => (
          [field, await fetchHistory(selectedDevice, field, { limit: range.limit, since: sinceIso })] as const
        )),
      );
      const historyByField = Object.fromEntries(historyEntries);
      return {
        timeline: buildAnalyticsTimeline(
          {
            solarInput: resolved.solarInput ? historyByField[resolved.solarInput] : [],
            gridInput: resolved.gridInput ? historyByField[resolved.gridInput] : [],
            acLoad: resolved.acLoad ? historyByField[resolved.acLoad] : [],
            dcLoad: resolved.dcLoad ? historyByField[resolved.dcLoad] : [],
            batteryPercent: resolved.batteryPercent ? historyByField[resolved.batteryPercent] : [],
            batteryVoltage: resolved.batteryVoltage ? historyByField[resolved.batteryVoltage] : [],
            internalTemp: resolved.internalTemp ? historyByField[resolved.internalTemp] : [],
            fanSpeed: resolved.fanSpeed ? historyByField[resolved.fanSpeed] : [],
          },
          range.bucketMs,
        ),
        resolvedFields: resolved,
        bucketLabel: buildCoverageLabel(range.bucketMs),
        sinceIso,
      };
    },
  });

  const comparisonQuery = useQuery({
    queryKey: ['chart-compare', selectedDevice, range.id, customFields.join('|')],
    enabled: isActive && !!selectedDevice && customFields.length > 0,
    queryFn: async (): Promise<ComparisonPayload> => {
      const historyEntries = await Promise.all(
        customFields.map(async (field) => (
          [field, await fetchHistory(selectedDevice, field, { limit: range.limit, since: sinceIso })] as const
        )),
      );
      return {
        timeline: buildIndexedComparisonTimeline(Object.fromEntries(historyEntries), range.bucketMs),
        colors: Object.fromEntries(customFields.map((field, index) => [field, CHART_COLORS[index % CHART_COLORS.length]])),
      };
    },
  });

  if (liveDevices.length === 0) {
    return (
      <div className="page-stack animate-fade-in">
        <div className="empty-state-card">
          <div className="empty-state-title">Waiting for chart data</div>
          <div className="empty-state-copy">
            As soon as the live stream comes online, this page will turn into an analysis workspace for power balance, battery behavior, and hardware health.
          </div>
        </div>
      </div>
    );
  }

  const liveState = wsState[selectedDevice] ?? {};
  const analytics = analyticsQuery.data;
  const timeline = analytics?.timeline ?? [];
  const inputSummary = summarizeTimelineMetric(timeline, 'totalInput');
  const outputSummary = summarizeTimelineMetric(timeline, 'totalOutput');
  const netSummary = summarizeTimelineMetric(timeline, 'netPower');
  const batterySummary = summarizeTimelineMetric(timeline, 'batteryPercent');
  const solarSummary = summarizeTimelineMetric(timeline, 'solarInput');
  const gridSummary = summarizeTimelineMetric(timeline, 'gridInput');
  const voltageSummary = summarizeTimelineMetric(timeline, 'batteryVoltage');
  const temperatureSummary = summarizeTimelineMetric(timeline, 'internalTemp');
  const fanSummary = summarizeTimelineMetric(timeline, 'fanSpeed');
  const solarShare = inputSummary && solarSummary && inputSummary.avg > 0 ? clampPercent((solarSummary.avg / inputSummary.avg) * 100) : null;
  const coverageRatio = inputSummary && outputSummary && outputSummary.avg > 0 ? clampPercent((inputSummary.avg / outputSummary.avg) * 100) : null;
  const chargeBuckets = timeline.filter((point) => typeof point.netPower === 'number' && point.netPower >= 0).length;
  const netBuckets = timeline.filter((point) => typeof point.netPower === 'number').length;
  const chargeShare = netBuckets > 0 ? clampPercent((chargeBuckets / netBuckets) * 100) : null;
  const peakSolarPoint = findPeakPoint(timeline, 'solarInput');
  const peakLoadPoint = findPeakPoint(timeline, 'totalOutput');
  const peakTempPoint = findPeakPoint(timeline, 'internalTemp');
  const customLines = customFields.map((field) => ({ field, label: getFieldMeta(field).label, color: comparisonQuery.data?.colors[field] ?? CHART_COLORS[0] }));
  const filteredExplorerFields = numericFields.filter((field) => {
    if (!deferredSearch.trim()) {
      return true;
    }
    const query = deferredSearch.trim().toLowerCase();
    const meta = getFieldMeta(field);
    return meta.label.toLowerCase().includes(query) || field.toLowerCase().includes(query);
  });

  return (
    <div className="page-stack animate-fade-in">
      <Card className="analytics-hero-card">
        <div className="analytics-hero-top">
          <div className="analytics-hero-copy">
            <div className="workspace-panel-kicker">Telemetry analytics</div>
            <div className="analytics-hero-title">
              <Activity size={18} />
              <span>Charts that explain what the AC500 has been doing</span>
            </div>
            <p className="workspace-panel-summary">
              This workspace turns the field history you are already collecting into report-style views for power balance, charging posture, battery movement, and thermal behavior.
            </p>
          </div>
          <div className="workspace-panel-meta">
            <span>{analytics?.bucketLabel ?? buildCoverageLabel(range.bucketMs)}</span>
            <span>{timeline.length} plotted buckets</span>
            <span>{numericFields.length} numeric fields available</span>
          </div>
        </div>
        <div className="analytics-toolbar">
          <select value={selectedDevice} onChange={(event) => setSelectedDevice(event.target.value)} className="ui-select workspace-select" style={selectStyle}>
            {liveDevices.map((device) => (
              <option key={device} value={device}>{device}</option>
            ))}
          </select>
          <div className="analytics-segmented" role="tablist" aria-label="Window">
            {RANGE_PRESETS.map((preset) => (
              <button key={preset.id} type="button" onClick={() => setRangeId(preset.id)} className={`analytics-segment-button${range.id === preset.id ? ' active' : ''}`}>
                {preset.label}
              </button>
            ))}
          </div>
          <div className="analytics-segmented analytics-focus-strip" role="tablist" aria-label="Report focus">
            {FOCUS_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button key={option.id} type="button" onClick={() => setFocus(option.id)} className={`analytics-segment-button analytics-focus-button${focus === option.id ? ' active' : ''}`}>
                  <Icon size={14} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {analyticsQuery.isLoading || isLoadingFields ? (
        <Card className="chart-card-surface"><div className="chart-loading-shell"><Spinner /></div></Card>
      ) : null}

      {!analyticsQuery.isLoading && timeline.length === 0 ? (
        <Card className="workspace-empty-card">
          <div className="workspace-empty-copy">
            <LineChartIcon size={18} />
            <span>The selected window does not have enough history yet. Try a longer window or wait for more readings to accumulate.</span>
          </div>
        </Card>
      ) : null}

      {timeline.length > 0 ? (
        <>
          <div className="analytics-score-grid">
            <AnalyticsScoreCard label="Battery reserve" value={formatMetricValue(batterySummary?.current, '%', 1)} trend={formatDelta(batterySummary?.change, '%', 1)} detail={`Window ${formatMetricValue(batterySummary?.min, '%', 1)} to ${formatMetricValue(batterySummary?.max, '%', 1)}`} accent="var(--cat-battery)" />
            <AnalyticsScoreCard label="Average input cover" value={coverageRatio === null ? '--' : `${coverageRatio}%`} trend={solarShare === null ? 'Solar share --' : `Solar ${solarShare}%`} detail={`Input ${formatMetricValue(inputSummary?.avg, 'W')} / load ${formatMetricValue(outputSummary?.avg, 'W')}`} accent="var(--cat-input)" />
            <AnalyticsScoreCard label="Load intensity" value={formatMetricValue(outputSummary?.max, 'W')} trend={`Avg ${formatMetricValue(outputSummary?.avg, 'W')}`} detail={peakLoadPoint ? `Peak at ${formatTime(peakLoadPoint.ts)}` : 'Peak load unavailable'} accent="var(--cat-output)" />
            <AnalyticsScoreCard label="Charge posture" value={formatSignedMetric(netSummary?.avg, 'W')} trend={chargeShare === null ? 'Charging buckets --' : `${chargeShare}% charging buckets`} detail={gridSummary?.avg && gridSummary.avg > 0 ? `Grid assist ${formatMetricValue(gridSummary.avg, 'W')}` : 'Mostly DC-driven window'} accent="var(--blue)" />
          </div>

          <div className="analytics-insights-grid">
            <InsightCard label="Best solar moment" value={peakSolarPoint ? formatMetricValue(peakSolarPoint.solarInput, 'W') : '--'} detail={peakSolarPoint ? `Captured at ${formatTime(peakSolarPoint.ts)}` : 'No solar history in this window'} icon={Sun} />
            <InsightCard label="Heaviest load" value={peakLoadPoint ? formatMetricValue(peakLoadPoint.totalOutput, 'W') : '--'} detail={peakLoadPoint ? `Demand peaked at ${formatTime(peakLoadPoint.ts)}` : 'No output history in this window'} icon={Zap} />
            <InsightCard label="Thermal ceiling" value={peakTempPoint ? formatMetricValue(peakTempPoint.internalTemp, 'C', 1) : '--'} detail={peakTempPoint ? `Fan ${formatMetricValue(peakTempPoint.fanSpeed, 'RPM')} at ${formatTime(peakTempPoint.ts)}` : 'No temperature history in this window'} icon={Fan} />
          </div>

          <Card className="analytics-report-card">
            <div className="analytics-report-head">
              <div>
                <div className="workspace-panel-kicker">Focus report</div>
                <div className="analytics-report-title">{getReportTitle(focus)}</div>
                <p className="analytics-report-copy">{getReportSubtitle(focus, analytics?.resolvedFields ?? resolvedCoreFields)}</p>
              </div>
              <div className="analytics-report-meta">
                <span>{formatTime(analytics?.sinceIso ?? sinceIso)} start</span>
                <span>{timeline.length} buckets</span>
              </div>
            </div>
            <div className="analytics-report-body">
              <div className="analytics-chart-shell">
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={timeline} margin={{ top: 8, right: 18, bottom: 8, left: 4 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(ts) => formatAxisTick(ts as number, range)} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} scale="time" />
                    <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={54} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={54} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTooltipLabel(ts as number, range)} formatter={(value, name) => [formatTooltipValue(value), getSeriesLabel(String(name))]} />
                    <Legend wrapperStyle={legendStyle} />
                    {focus === 'balance' ? (
                      <>
                        <Area yAxisId="left" type="monotone" dataKey="totalInput" name="totalInput" stroke="#38bdf8" fill="rgba(56, 189, 248, 0.16)" strokeWidth={2} dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="totalOutput" name="totalOutput" stroke="#f59e0b" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />
                        <Line yAxisId="right" type="monotone" dataKey="netPower" name="netPower" stroke="#e2e8f0" strokeWidth={2} dot={false} />
                        <ReferenceLine yAxisId="right" y={0} stroke="var(--border-hi)" strokeDasharray="4 4" />
                      </>
                    ) : null}
                    {focus === 'sources' ? (
                      <>
                        <Area yAxisId="left" type="monotone" dataKey="solarInput" name="solarInput" stroke="#34d399" fill="rgba(52, 211, 153, 0.2)" strokeWidth={2} dot={false} />
                        <Area yAxisId="left" type="monotone" dataKey="gridInput" name="gridInput" stroke="#60a5fa" fill="rgba(96, 165, 250, 0.16)" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="totalOutput" name="totalOutput" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </>
                    ) : null}
                    {focus === 'battery' ? (
                      <>
                        <Line yAxisId="left" type="monotone" dataKey="batteryPercent" name="batteryPercent" stroke="#34d399" strokeWidth={2.6} dot={false} activeDot={{ r: 4 }} />
                        <Area yAxisId="right" type="monotone" dataKey="batteryVoltage" name="batteryVoltage" stroke="#38bdf8" fill="rgba(56, 189, 248, 0.14)" strokeWidth={2} dot={false} />
                      </>
                    ) : null}
                    {focus === 'health' ? (
                      <>
                        <Line yAxisId="left" type="monotone" dataKey="internalTemp" name="internalTemp" stroke="#f87171" strokeWidth={2.4} dot={false} />
                        <Bar yAxisId="right" dataKey="fanSpeed" name="fanSpeed" fill="rgba(96, 165, 250, 0.42)" radius={[6, 6, 0, 0]} />
                      </>
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="analytics-side-stats">
                {focus === 'balance' ? (
                  <>
                    <SideStat label="Average input" value={formatMetricValue(inputSummary?.avg, 'W')} detail="Solar + AC input" />
                    <SideStat label="Average output" value={formatMetricValue(outputSummary?.avg, 'W')} detail="AC + DC loads" />
                    <SideStat label="Average net" value={formatSignedMetric(netSummary?.avg, 'W')} detail="Positive means charging" />
                    <SideStat label="Charge buckets" value={chargeShare === null ? '--' : `${chargeShare}%`} detail="Buckets where input covered output" />
                  </>
                ) : null}
                {focus === 'sources' ? (
                  <>
                    <SideStat label="Solar share" value={solarShare === null ? '--' : `${solarShare}%`} detail="Average contribution to input" />
                    <SideStat label="Average solar" value={formatMetricValue(solarSummary?.avg, 'W')} detail={analytics?.resolvedFields.solarInput ?? 'Unavailable'} />
                    <SideStat label="Average grid" value={formatMetricValue(gridSummary?.avg, 'W')} detail={analytics?.resolvedFields.gridInput ?? 'Unavailable'} />
                    <SideStat label="Best solar bucket" value={peakSolarPoint ? formatMetricValue(peakSolarPoint.solarInput, 'W') : '--'} detail={peakSolarPoint ? formatTime(peakSolarPoint.ts) : 'No peak in window'} />
                  </>
                ) : null}
                {focus === 'battery' ? (
                  <>
                    <SideStat label="Current reserve" value={formatMetricValue(batterySummary?.current, '%', 1)} detail={analytics?.resolvedFields.batteryPercent ?? 'Unavailable'} />
                    <SideStat label="Window change" value={formatDelta(batterySummary?.change, '%', 1)} detail="End minus start" />
                    <SideStat label="Lowest reserve" value={formatMetricValue(batterySummary?.min, '%', 1)} detail="Battery floor in the window" />
                    <SideStat label="Voltage average" value={formatMetricValue(voltageSummary?.avg, 'V', 1)} detail={analytics?.resolvedFields.batteryVoltage ?? 'Unavailable'} />
                  </>
                ) : null}
                {focus === 'health' ? (
                  <>
                    <SideStat label="Peak temp" value={formatMetricValue(temperatureSummary?.max, 'C', 1)} detail={analytics?.resolvedFields.internalTemp ?? 'Unavailable'} />
                    <SideStat label="Average temp" value={formatMetricValue(temperatureSummary?.avg, 'C', 1)} detail="Internal thermal trend" />
                    <SideStat label="Peak fan" value={formatMetricValue(fanSummary?.max, 'RPM')} detail={analytics?.resolvedFields.fanSpeed ?? 'Unavailable'} />
                    <SideStat label="Hottest bucket" value={peakTempPoint ? formatTime(peakTempPoint.ts) : '--'} detail="When thermal load peaked" />
                  </>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="analytics-detail-grid">
            <Card className="analytics-custom-card">
              <div className="analytics-report-head">
                <div>
                  <div className="workspace-panel-kicker">Custom comparison</div>
                  <div className="analytics-report-title">Indexed trend comparison</div>
                  <p className="analytics-report-copy">
                    Different units should not fight on one axis. This comparison normalizes each selected field to an index of 100 at the start of the window so you can compare trend shape cleanly.
                  </p>
                </div>
                <div className="analytics-report-meta">
                  <span>{customFields.length} selected</span>
                  <span>Indexed base 100</span>
                </div>
              </div>
              <div className="workspace-search search-shell">
                <Search size={16} className="workspace-search-icon" />
                <input value={fieldSearch} onChange={(event) => setFieldSearch(event.target.value)} className="workspace-search-input" placeholder="Search numeric fields to compare" aria-label="Search numeric fields" />
              </div>
              <div className="analytics-selection-row">
                {customFields.map((field) => (
                  <button key={field} type="button" onClick={() => removeCustomField(field, setCustomFields)} className="analytics-selection-chip">
                    <span>{getFieldMeta(field).label}</span>
                    <X size={14} />
                  </button>
                ))}
              </div>
              {comparisonQuery.isLoading ? (
                <div className="chart-loading-shell"><Spinner /></div>
              ) : customFields.length === 0 || (comparisonQuery.data?.timeline.length ?? 0) === 0 ? (
                <div className="workspace-empty-card analytics-inline-empty">
                  <div className="workspace-empty-copy">
                    <Layers3 size={18} />
                    <span>Select one or more numeric fields to compare their movement over the same window.</span>
                  </div>
                </div>
              ) : (
                <div className="analytics-chart-shell compact">
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={comparisonQuery.data?.timeline} margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(ts) => formatAxisTick(ts as number, range)} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} scale="time" />
                      <YAxis tickFormatter={(value) => `${value}%`} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={54} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTooltipLabel(ts as number, range)} formatter={(value, key) => [formatIndexedValue(value), getIndexedLabel(String(key))]} />
                      <Legend wrapperStyle={legendStyle} />
                      <ReferenceLine y={100} stroke="var(--border-hi)" strokeDasharray="4 4" />
                      {customLines.map((line) => (
                        <Line key={line.field} type="monotone" dataKey={`${line.field}Indexed`} name={`${line.field}Indexed`} stroke={line.color} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="analytics-explorer-card">
              <div className="analytics-report-head">
                <div>
                  <div className="workspace-panel-kicker">Metric explorer</div>
                  <div className="analytics-report-title">What is available right now</div>
                  <p className="analytics-report-copy">
                    Curated reports use the most decision-useful series automatically, but you can still pull any numeric field into the indexed comparison panel.
                  </p>
                </div>
                <div className="analytics-report-meta">
                  <span>{filteredExplorerFields.length} matching fields</span>
                  <span>{liveDevices.length} active source{liveDevices.length === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div className="analytics-field-list">
                {filteredExplorerFields.map((field) => {
                  const meta = getFieldMeta(field);
                  const isSelected = customFields.includes(field);
                  return (
                    <div key={field} className="analytics-field-row">
                      <div className="analytics-field-copy">
                        <div className="analytics-field-topline">
                          <strong>{meta.label}</strong>
                          <span className="data-chip" style={{ color: categoryColors[meta.category] || 'var(--text-muted)', borderColor: categoryColors[meta.category] || 'var(--border)' }}>
                            {meta.category}
                          </span>
                        </div>
                        <div className="analytics-field-meta">
                          <span>{field}</span>
                          <span>{formatValue(field, liveState[field]?.value ?? '--')}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => toggleCustomField(field, setCustomFields)} className={`analytics-field-action${isSelected ? ' active' : ''}`}>
                        {isSelected ? <X size={14} /> : <Plus size={14} />}
                        <span>{isSelected ? 'Remove' : 'Compare'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function AnalyticsScoreCard({ label, value, trend, detail, accent }: { label: string; value: string; trend: string; detail: string; accent: string }) {
  return <Card className="analytics-score-card"><div className="analytics-score-label">{label}</div><div className="analytics-score-value" style={{ color: accent }}>{value}</div><div className="analytics-score-trend">{trend}</div><div className="analytics-score-detail">{detail}</div></Card>;
}

function InsightCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: ComponentType<{ size?: number }> }) {
  return <Card className="analytics-insight-card"><div className="analytics-insight-label"><Icon size={15} /><span>{label}</span></div><div className="analytics-insight-value">{value}</div><div className="analytics-insight-detail">{detail}</div></Card>;
}

function SideStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="analytics-side-stat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function getReportTitle(focus: FocusId) {
  if (focus === 'sources') return 'Where input power has been coming from';
  if (focus === 'battery') return 'How the battery has been moving';
  if (focus === 'health') return 'How hard the hardware has been working';
  return 'Whether the system has been covering load';
}

function getReportSubtitle(focus: FocusId, resolvedFields: ReturnType<typeof resolveCoreFields>) {
  if (focus === 'sources') return `Comparing ${resolvedFields.solarInput ?? 'DC input'} against ${resolvedFields.gridInput ?? 'AC input'} to show how much of the window came from solar versus grid assist.`;
  if (focus === 'battery') return `Following ${resolvedFields.batteryPercent ?? 'battery percent'} and ${resolvedFields.batteryVoltage ?? 'battery voltage'} so reserve changes are visible instead of implied.`;
  if (focus === 'health') return `Pairing ${resolvedFields.internalTemp ?? 'internal temperature'} with ${resolvedFields.fanSpeed ?? 'fan speed'} to catch thermal stress before it becomes a mystery.`;
  return 'Balancing all captured input against total output so charging, discharge, and supply gaps show up immediately.';
}

function toggleCustomField(field: string, setCustomFields: Dispatch<SetStateAction<string[]>>) {
  startTransition(() => {
    setCustomFields((previous) => previous.includes(field) ? previous.filter((item) => item !== field) : [...previous, field].slice(-4));
  });
}

function removeCustomField(field: string, setCustomFields: Dispatch<SetStateAction<string[]>>) {
  startTransition(() => {
    setCustomFields((previous) => previous.filter((item) => item !== field));
  });
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(999, Math.round(value)));
}

function formatMetricValue(value: number | null | undefined, unit: string, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  return `${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${unit}`.trim();
}

function formatSignedMetric(value: number | null | undefined, unit: string, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${unit}`.trim();
}

function formatDelta(value: number | null | undefined, unit: string, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Window change --';
  return `Window ${formatSignedMetric(value, unit, digits)}`;
}

function formatAxisTick(ts: number, range: RangePreset) {
  const formatter = range.minutes > 1_440
    ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric' })
    : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  return formatter.format(new Date(ts));
}

function formatTooltipLabel(ts: number, range: RangePreset) {
  const formatter = range.minutes > 1_440
    ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;
  return formatter ? formatter.format(new Date(ts)) : formatTime(ts);
}

function formatTooltipValue(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return `${Math.round(value).toLocaleString()} units`;
}

function formatIndexedValue(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return `${value.toFixed(0)} index`;
}

function getSeriesLabel(name: string) {
  if (name === 'totalInput') return 'Total input';
  if (name === 'totalOutput') return 'Total output';
  if (name === 'netPower') return 'Net power';
  if (name === 'solarInput') return 'Solar input';
  if (name === 'gridInput') return 'Grid input';
  if (name === 'batteryPercent') return 'Battery reserve';
  if (name === 'batteryVoltage') return 'Battery voltage';
  if (name === 'internalTemp') return 'Internal temp';
  if (name === 'fanSpeed') return 'Fan speed';
  return name;
}

function getIndexedLabel(name: string) {
  return getSeriesLabel(name.replace(/Indexed$/, ''));
}

const legendStyle = { fontFamily: 'var(--font-mono)', fontSize: 12 };
const tooltipStyle = {
  background: 'var(--bg-3)',
  border: '1px solid var(--border-hi)',
  borderRadius: 12,
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  color: 'var(--text)',
  padding: '10px 14px',
};
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

