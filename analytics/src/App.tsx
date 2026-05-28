import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Battery, CheckCircle2, Gauge, LineChart, PlugZap, Sun, WifiOff, Zap } from 'lucide-react';
import {
  IS_STATIC_ANALYTICS,
  fetchDevices,
  fetchFields,
  fetchStaticMetadata,
  fetchStatus,
} from './lib/api';
import {
  CUSTOM_RANGE_ID,
  RANGE_PRESETS,
  buildCustomRange,
  fieldsForResolved,
  getNumericFields,
  resolveFields,
  type RangeId,
} from './lib/analytics';
import { fetchCoreTimelineInWorker } from './lib/history-worker-client';
import { formatMetric } from './lib/fields';
import { formatFreshness, formatShortTime } from './lib/time';
import {
  ANALYTICS_DENSITY_KEY,
  ANALYTICS_SKIN_KEY,
  ANALYTICS_THEME_KEY,
  COMPARISON_DEFAULT_FIELDS_KEY,
  DARK_CHART_COLORS,
  EMPTY_TIMELINE,
  LIGHT_CHART_COLORS,
  buildRainbow,
  getStoredAnalyticsDensity,
  getStoredAnalyticsSkin,
  getStoredAnalyticsTheme,
  getStoredComparisonDefaultFields,
  isComparableField,
  type AnalyticsDensity,
  type AnalyticsSkin,
  type AnalyticsTheme,
} from './lib/constants';
import { useLiveTelemetry } from './hooks/useLiveTelemetry';
import { useStableStringArray } from './hooks/useStableStringArray';
import { useTimelineSummary } from './hooks/useTimelineSummary';
import {
  ControlsBand,
  CustomDateRange,
  DenseTimeSeries,
  FieldComparisonPanel,
  Kpi,
  PanelHeader,
  SettingsModal,
  SideStat,
  SnapshotPanel,
  StatusPill,
  type DenseSeries,
} from './components';

export default function App() {
  const [rangeId, setRangeId] = useState<RangeId>('24h');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<AnalyticsTheme>(getStoredAnalyticsTheme);
  const [densityMode, setDensityMode] = useState<AnalyticsDensity>(getStoredAnalyticsDensity);
  const [skin, setSkin] = useState<AnalyticsSkin>(getStoredAnalyticsSkin);
  const [comparisonDefaultFields, setComparisonDefaultFields] = useState<string[]>(getStoredComparisonDefaultFields);
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60_000);
    return d.toISOString().slice(0, 16);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 16));
  const [customApplied, setCustomApplied] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const chartColors = themeMode === 'light' ? LIGHT_CHART_COLORS : DARK_CHART_COLORS;
  const rainbow = useMemo(() => buildRainbow(chartColors), [chartColors]);
  const live = useLiveTelemetry();

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-analytics-theme', themeMode);
    window.localStorage.setItem(ANALYTICS_THEME_KEY, themeMode);
  }, [themeMode]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-analytics-skin', skin);
    window.localStorage.setItem(ANALYTICS_SKIN_KEY, skin);
  }, [skin]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-analytics-density', densityMode);
    window.localStorage.setItem(ANALYTICS_DENSITY_KEY, densityMode);
  }, [densityMode]);

  useEffect(() => {
    window.localStorage.setItem(COMPARISON_DEFAULT_FIELDS_KEY, JSON.stringify(comparisonDefaultFields));
  }, [comparisonDefaultFields]);

  const statusQuery = useQuery({ queryKey: ['status'], queryFn: fetchStatus });
  const devicesQuery = useQuery({ queryKey: ['devices'], queryFn: fetchDevices });
  const staticMetadataQuery = useQuery({
    queryKey: ['static-metadata'],
    queryFn: fetchStaticMetadata,
    enabled: IS_STATIC_ANALYTICS,
  });

  const mergedState = Object.keys(live.state).length > 0 ? live.state : statusQuery.data ?? {};
  const devices = devicesQuery.data?.length ? devicesQuery.data : Object.keys(mergedState);

  useEffect(() => {
    if (devices.length > 0 && (!selectedDevice || !devices.includes(selectedDevice))) {
      setSelectedDevice(devices[0]);
    }
  }, [devices, selectedDevice]);

  const liveState = mergedState[selectedDevice] ?? {};
  const range = useMemo(() => {
    if (rangeId === CUSTOM_RANGE_ID && customApplied && customStart && customEnd) {
      const endDate = new Date(customEnd);
      if (endDate.getTime() > new Date(customStart).getTime()) {
        return { id: CUSTOM_RANGE_ID, label: 'Custom', ...buildCustomRange(customStart, customEnd) };
      }
    }
    return RANGE_PRESETS.find((item) => item.id === rangeId) ?? RANGE_PRESETS[2];
  }, [rangeId, customApplied, customStart, customEnd]);
  const rangeAnchorMs = useMemo(
    () => IS_STATIC_ANALYTICS && staticMetadataQuery.data?.generatedAt
      ? Date.parse(staticMetadataQuery.data.generatedAt) : Date.now(),
    [staticMetadataQuery.data?.generatedAt],
  );
  const sinceIso = useMemo(
    () => {
      if (range.id === CUSTOM_RANGE_ID && customApplied && customStart) {
        return new Date(customStart).toISOString();
      }
      return new Date(rangeAnchorMs - range.minutes * 60_000).toISOString();
    },
    [range.id, range.minutes, rangeAnchorMs, customApplied, customStart],
  );

  const fieldsQuery = useQuery({
    queryKey: ['fields', selectedDevice],
    queryFn: () => fetchFields(selectedDevice),
    enabled: Boolean(selectedDevice),
  });

  const fields = fieldsQuery.data ?? Object.keys(liveState);
  const numericFields = useStableStringArray(useMemo(() => getNumericFields(fields, liveState), [fields, liveState]));
  const comparableFields = useStableStringArray(useMemo(() => numericFields.filter(isComparableField), [numericFields]));
  const resolved = useMemo(() => resolveFields(numericFields), [numericFields]);
  const historyFields = useStableStringArray(useMemo(() => fieldsForResolved(resolved), [resolved]));

  const historyQuery = useQuery({
    queryKey: ['core-timeline', selectedDevice, range.id, sinceIso, historyFields.join('|')],
    queryFn: () => fetchCoreTimelineInWorker(selectedDevice, historyFields, { limit: range.limit, since: sinceIso }, resolved, range.bucketMs),
    enabled: Boolean(selectedDevice) && historyFields.length > 0,
  });

  const timeline = historyQuery.data ?? EMPTY_TIMELINE;
  const timelineTimestamps = useMemo(() => timeline.map((row) => row.ts), [timeline]);
  const summary = useTimelineSummary(timeline);

  const powerBalanceSeries = useMemo<DenseSeries[]>(() => [
    { label: 'Total input', color: rainbow.red, values: timeline.map((row) => row.totalInput), unit: 'W', digits: 0 },
    { label: 'Total output', color: rainbow.green, values: timeline.map((row) => row.totalOutput), unit: 'W', digits: 0 },
    { label: 'Net power', color: rainbow.blue, values: timeline.map((row) => row.netPower), unit: 'W', digits: 0 },
  ], [rainbow.blue, rainbow.green, rainbow.red, timeline]);
  const solarInputSeries = useMemo<DenseSeries[]>(() => [
    { label: 'DC1 wattage', color: rainbow.yellow, values: timeline.map((row) => row.dcInput1Power), unit: 'W', digits: 0 },
    { label: 'DC1 voltage', color: rainbow.orange, values: timeline.map((row) => row.dcInput1Voltage), unit: 'V', digits: 1 },
    { label: 'DC2 wattage', color: rainbow.cyan, values: timeline.map((row) => row.dcInput2Power), unit: 'W', digits: 0 },
    { label: 'DC2 voltage', color: rainbow.blue, values: timeline.map((row) => row.dcInput2Voltage), unit: 'V', digits: 1 },
  ], [rainbow.blue, rainbow.cyan, rainbow.orange, rainbow.yellow, timeline]);
  const batteryPostureSeries = useMemo<DenseSeries[]>(() => [
    { label: 'SOC trend', color: rainbow.green, values: timeline.map((row) => row.batteryPercent), unit: '%', digits: 1 },
  ], [rainbow.green, timeline]);

  const latestTimestamp = useMemo(() => (
    Object.values(liveState).map((item) => item.ts).sort().at(-1) ?? live.lastUpdate
  ), [live.lastUpdate, liveState]);

  return (
    <main className="analytics-root min-h-screen">
      <section className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Bluetti Monitor</p>
            <h1>Analytics</h1>
          </div>
          <div className="status-row">
            <StatusPill
              active={live.connected}
              label={IS_STATIC_ANALYTICS ? 'Static export' : live.connected ? 'Live stream' : 'Offline'}
            />
            <span className="status-pill muted">
              <Activity size={15} />
              {IS_STATIC_ANALYTICS
                ? `Exported ${formatFreshness(staticMetadataQuery.data?.generatedAt ?? latestTimestamp)}`
                : formatFreshness(latestTimestamp)}
            </span>
          </div>
        </header>

        <div className="controls-band-anchor">
          <ControlsBand
            datePickerOpen={datePickerOpen}
            densityMode={densityMode}
            devices={devices}
            historyQueryRefetch={() => void historyQuery.refetch()}
            liveConnected={live.connected}
            rangeId={rangeId}
            selectedDevice={selectedDevice}
            themeMode={themeMode}
            onDensityChange={setDensityMode}
            onDeviceChange={setSelectedDevice}
            onRangeChange={(id) => {
              if (id === CUSTOM_RANGE_ID) {
                setDatePickerOpen((open) => !open);
              } else {
                setDatePickerOpen(false);
                setRangeId(id);
                setCustomApplied(false);
              }
            }}
            onSettingsOpen={() => setSettingsOpen(true)}
            onThemeChange={setThemeMode}
          />

          {datePickerOpen ? (
            <CustomDateRange
              endIso={customEnd}
              startIso={customStart}
              onApply={() => {
                setRangeId(CUSTOM_RANGE_ID);
                setCustomApplied(true);
                setDatePickerOpen(false);
              }}
              onClose={() => setDatePickerOpen(false)}
              onEndChange={setCustomEnd}
              onStartChange={setCustomStart}
            />
          ) : null}
        </div>

        {devices.length === 0 ? (
          <section className="empty-state">
            <WifiOff size={36} />
            <h2>Waiting for telemetry</h2>
            <p>Start the API stack or open with <code>?mock=1</code> to preview the analytics workspace.</p>
          </section>
        ) : (
          <>
            <section className="kpi-grid">
              <Kpi accent={rainbow.red} icon={Gauge} label="Net Power" value={formatMetric(summary.netSummary?.current, 'W')} detail={`Average ${formatMetric(summary.netSummary?.avg, 'W')}`} tone={summary.netSummary?.current && summary.netSummary.current >= 0 ? 'good' : 'warn'} />
              <Kpi accent={rainbow.orange} icon={PlugZap} label="Average Load" value={formatMetric(summary.outputSummary?.avg, 'W')} detail={summary.peakLoad ? `Peak ${formatMetric(summary.peakLoad.totalOutput, 'W')} at ${formatShortTime(summary.peakLoad.ts)}` : 'No load history'} />
              <Kpi accent={rainbow.yellow} icon={Sun} label="Solar Share" value={formatMetric(summary.solarShare, '%')} detail={summary.peakSolar ? `Peak ${formatMetric(summary.peakSolar.solarInput, 'W')} at ${formatShortTime(summary.peakSolar.ts)}` : 'No solar history'} tone="sun" />
              <Kpi accent={rainbow.green} icon={Battery} label="Battery Move" value={formatMetric(summary.batterySummary?.change, '%', 1)} detail={`Current ${formatMetric(summary.batterySummary?.current, '%', 1)}`} tone="battery" />
              <Kpi accent={rainbow.cyan} icon={Zap} label="Generated" value={formatMetric(summary.energyDelta, 'kWh', 2)} detail={`${range.label} production delta`} />
              <Kpi accent={rainbow.blue} icon={CheckCircle2} label="Input Coverage" value={formatMetric(summary.coverage, '%')} detail={`${formatMetric(summary.chargeShare, '%')} of buckets charging`} />
            </section>

            <section className="grid-layout">
              <article className="panel panel-large">
                <PanelHeader icon={LineChart} title="Power Balance" subtitle={`${range.label} window, ${timeline.length} buckets`} loading={historyQuery.isFetching} />
                <div className="chart-frame">
                  <DenseTimeSeries deferMs={0} themeMode={themeMode} timestamps={timelineTimestamps} series={powerBalanceSeries} />
                </div>
                <div className="legend-strip">
                  <span><i style={{ background: rainbow.red }} />Total input</span>
                  <span><i style={{ background: rainbow.green }} />Total output</span>
                  <span><i style={{ background: rainbow.blue }} />Net power</span>
                </div>
                <div className="side-stats">
                  <SideStat label="Net range" value={`${formatMetric(summary.netSummary?.min, 'W')} to ${formatMetric(summary.netSummary?.max, 'W')}`} />
                  <SideStat label="Avg input / output" value={`${formatMetric(summary.inputSummary?.avg, 'W')} / ${formatMetric(summary.outputSummary?.avg, 'W')}`} />
                </div>
              </article>

              <article className="panel solar-input-panel">
                <PanelHeader icon={Sun} title="Solar Input" subtitle="Voltage and wattage history" loading={historyQuery.isFetching} />
                <DenseTimeSeries deferMs={90} themeMode={themeMode} timestamps={timelineTimestamps} series={solarInputSeries} />
                <div className="legend-strip compact">
                  <span><i style={{ background: rainbow.yellow }} />DC1 wattage</span>
                  <span><i style={{ background: rainbow.orange }} />DC1 voltage</span>
                  <span><i style={{ background: rainbow.cyan }} />DC2 wattage</span>
                  <span><i style={{ background: rainbow.blue }} />DC2 voltage</span>
                </div>
                <div className="side-stats">
                  <SideStat label="DC1 power avg" value={formatMetric(summary.dcInput1PowerSummary?.avg, 'W')} />
                  <SideStat label="DC1 voltage avg" value={formatMetric(summary.dcInput1VoltageSummary?.avg, 'V', 1)} />
                  <SideStat label="DC2 power avg" value={formatMetric(summary.dcInput2PowerSummary?.avg, 'W')} />
                  <SideStat label="DC2 voltage avg" value={formatMetric(summary.dcInput2VoltageSummary?.avg, 'V', 1)} />
                </div>
              </article>

              <article className="panel battery-posture-panel">
                <PanelHeader icon={Battery} title="Battery Posture" subtitle={resolved.batteryPercent ? `SOC trend from ${resolved.batteryPercent}` : 'No SOC field'} />
                <DenseTimeSeries deferMs={180} themeMode={themeMode} timestamps={timelineTimestamps} series={batteryPostureSeries} />
                <div className="legend-strip compact">
                  <span><i style={{ background: rainbow.green }} />SOC trend</span>
                </div>
                <div className="side-stats">
                  <SideStat label="SOC range" value={`${formatMetric(summary.batterySummary?.min, '%', 1)} to ${formatMetric(summary.batterySummary?.max, '%', 1)}`} />
                  <SideStat label="Battery voltage avg" value={formatMetric(summary.voltageSummary?.avg, 'V', 1)} />
                </div>
              </article>

              <FieldComparisonPanel
                availableFields={comparableFields}
                bucketMs={range.bucketMs}
                defaultFields={comparisonDefaultFields}
                device={selectedDevice}
                limit={range.limit}
                onSaveDefaultFields={setComparisonDefaultFields}
                sinceIso={sinceIso}
                themeMode={themeMode}
              />
            </section>

            <SnapshotPanel liveState={liveState} />
          </>
        )}
      </section>
      {settingsOpen ? (
        <SettingsModal
          availableComparisonFields={comparableFields}
          comparisonDefaultFields={comparisonDefaultFields}
          densityMode={densityMode}
          skin={skin}
          themeMode={themeMode}
          onComparisonDefaultFieldsChange={setComparisonDefaultFields}
          onClose={() => setSettingsOpen(false)}
          onDensityChange={setDensityMode}
          onSkinChange={setSkin}
          onThemeChange={setThemeMode}
        />
      ) : null}
    </main>
  );
}
