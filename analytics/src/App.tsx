import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
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
  computeComparisonRange,
  exportTimelineToCsv,
  fieldsForResolved,
  getNumericFields,
  resolveFields,
  type RangeId,
} from './lib/analytics';
import { fetchCoreTimelineInWorker } from './lib/history-worker-client';
import { formatMetric } from './lib/fields';
import { formatFreshness, formatShortTime } from './lib/time';
import {
  ANALYTICS_COMPARE_KEY,
  ANALYTICS_DENSITY_KEY,
  ANALYTICS_SKIN_KEY,
  ANALYTICS_THEME_KEY,
  COMPARISON_DEFAULT_FIELDS_KEY,
  EMPTY_TIMELINE,
  buildRainbow,
  getChartColors,
  getStoredAnalyticsDensity,
  getStoredAnalyticsSkin,
  getStoredAnalyticsTheme,
  getStoredComparisonDefaultFields,
  getStoredAccentOverride,
  getStoredComparisonOption,
  isComparableField,
  setStoredAccentOverride,
  type AnalyticsDensity,
  type AnalyticsSkin,
  type AnalyticsTheme,
  type ComparisonOption,
} from './lib/constants';
import { useAnnotations } from './hooks/useAnnotations';
import { useLiveTelemetry } from './hooks/useLiveTelemetry';
import { useStableStringArray } from './hooks/useStableStringArray';
import { useTimelineSummary } from './hooks/useTimelineSummary';
import { AnnotationPopover } from './components/AnnotationPopover';
import { NotesPanel } from './components/NotesPanel';
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
  type ComparisonSeriesGroup,
  type DenseSeries,
} from './components';

export default function App() {
  const [rangeId, setRangeId] = useState<RangeId>('24h');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<AnalyticsTheme>(() => getStoredAnalyticsTheme());
  const [densityMode, setDensityMode] = useState<AnalyticsDensity>(() => getStoredAnalyticsDensity());
  const [skin, setSkin] = useState<AnalyticsSkin>(() => getStoredAnalyticsSkin());
  const [accentOverride, setAccentOverride] = useState<string | null>(() => getStoredAccentOverride(getStoredAnalyticsSkin()));
  const [solarViewMode, setSolarViewMode] = useState<'power' | 'voltage'>('power');
  const [comparisonDefaultFields, setComparisonDefaultFields] = useState<string[]>(getStoredComparisonDefaultFields);
  const [comparisonOption, setComparisonOption] = useState<ComparisonOption>(getStoredComparisonOption);
  const { addAnnotation, annotations, removeAnnotation, annotationsInRange } = useAnnotations(selectedDevice || '_');
  const [pendingAnnotationTs, setPendingAnnotationTs] = useState<{ ts: number; rect: DOMRect } | null>(null);
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60_000);
    return d.toISOString().slice(0, 16);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 16));
  const [customApplied, setCustomApplied] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const chartColors = useMemo(() => getChartColors(skin, themeMode), [skin, themeMode]);
  const rainbow = useMemo(() => buildRainbow(chartColors), [chartColors]);
  const live = useLiveTelemetry();

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-analytics-theme', themeMode);
    window.localStorage.setItem(ANALYTICS_THEME_KEY, themeMode);
  }, [themeMode]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-analytics-skin', skin);
    window.localStorage.setItem(ANALYTICS_SKIN_KEY, skin);
    setAccentOverride(getStoredAccentOverride(skin));
  }, [skin]);

  useLayoutEffect(() => {
    if (accentOverride) {
      document.documentElement.style.setProperty('--accent', accentOverride);
    } else {
      document.documentElement.style.removeProperty('--accent');
    }
  }, [accentOverride, skin]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-analytics-density', densityMode);
    window.localStorage.setItem(ANALYTICS_DENSITY_KEY, densityMode);
  }, [densityMode]);

  useEffect(() => {
    window.localStorage.setItem(COMPARISON_DEFAULT_FIELDS_KEY, JSON.stringify(comparisonDefaultFields));
  }, [comparisonDefaultFields]);

  useEffect(() => {
    window.localStorage.setItem(ANALYTICS_COMPARE_KEY, comparisonOption);
  }, [comparisonOption]);

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

  useLayoutEffect(() => {
    const bat = summary.batterySummary;
    const solar = summary.solarShare;
    const batLevel = bat?.current;
    if (batLevel != null && batLevel < 20) {
      document.documentElement.setAttribute('data-analytics-state', 'critical');
    } else if (solar != null && solar >= 100) {
      document.documentElement.setAttribute('data-analytics-state', 'surplus');
    } else {
      document.documentElement.removeAttribute('data-analytics-state');
    }
  }, [summary.batterySummary, summary.solarShare]);

  const comparisonRange = useMemo(
    () => computeComparisonRange(sinceIso, range.minutes, comparisonOption),
    [sinceIso, range.minutes, comparisonOption],
  );

  const comparisonHistoryQuery = useQuery({
    queryKey: ['core-timeline-comparison', selectedDevice, comparisonOption, range.id, sinceIso, historyFields.join('|')],
    queryFn: () => fetchCoreTimelineInWorker(selectedDevice, historyFields, { limit: range.limit, since: comparisonRange!.since }, resolved, range.bucketMs),
    enabled: Boolean(selectedDevice) && historyFields.length > 0 && comparisonRange !== null,
  });

  const comparisonTimeline = comparisonHistoryQuery.data ?? EMPTY_TIMELINE;
  const chartsLoading = historyQuery.isFetching || comparisonHistoryQuery.isFetching;
  const comparisonOffsetMs = comparisonRange ? Date.parse(sinceIso) - Date.parse(comparisonRange.since) : 0;

  const powerBalanceSeries = useMemo<DenseSeries[]>(() => [
    { label: 'Total input', color: rainbow.red, values: timeline.map((row) => row.totalInput), unit: 'W', digits: 0 },
    { label: 'Total output', color: rainbow.green, values: timeline.map((row) => row.totalOutput), unit: 'W', digits: 0 },
    { label: 'Net power', color: rainbow.blue, values: timeline.map((row) => row.netPower), unit: 'W', digits: 0 },
  ], [rainbow.blue, rainbow.green, rainbow.red, timeline]);
  const solarInputSeries = useMemo<DenseSeries[]>(() => {
    if (solarViewMode === 'power') {
      return [
        { label: 'DC1 wattage', color: rainbow.yellow, values: timeline.map((row) => row.dcInput1Power), unit: 'W', digits: 0 },
        { label: 'DC2 wattage', color: rainbow.cyan, values: timeline.map((row) => row.dcInput2Power), unit: 'W', digits: 0 },
      ];
    }
    return [
      { label: 'DC1 voltage', color: rainbow.orange, values: timeline.map((row) => row.dcInput1Voltage), unit: 'V', digits: 1 },
      { label: 'DC2 voltage', color: rainbow.blue, values: timeline.map((row) => row.dcInput2Voltage), unit: 'V', digits: 1 },
    ];
  }, [rainbow.blue, rainbow.cyan, rainbow.orange, rainbow.yellow, timeline, solarViewMode]);
  const batteryPostureSeries = useMemo<DenseSeries[]>(() => [
    { label: 'SOC trend', color: rainbow.green, values: timeline.map((row) => row.batteryPercent), unit: '%', digits: 1 },
  ], [rainbow.green, timeline]);

  const comparisonLabel = comparisonRange?.label ?? '';
  const powerBalanceComparison = useMemo<ComparisonSeriesGroup[]>(() => {
    if (!comparisonRange || comparisonTimeline.length === 0) return [];
    const shiftTs = (ts: number) => ts + comparisonOffsetMs;
    return [
      { label: `Total input (${comparisonLabel})`, color: rainbow.red, timestamps: comparisonTimeline.map((r) => shiftTs(r.ts)), values: comparisonTimeline.map((r) => r.totalInput), unit: 'W', digits: 0 },
      { label: `Total output (${comparisonLabel})`, color: rainbow.green, timestamps: comparisonTimeline.map((r) => shiftTs(r.ts)), values: comparisonTimeline.map((r) => r.totalOutput), unit: 'W', digits: 0 },
      { label: `Net power (${comparisonLabel})`, color: rainbow.blue, timestamps: comparisonTimeline.map((r) => shiftTs(r.ts)), values: comparisonTimeline.map((r) => r.netPower), unit: 'W', digits: 0 },
    ];
  }, [comparisonRange, comparisonTimeline, comparisonOffsetMs, rainbow, comparisonLabel]);
  const solarInputComparison = useMemo<ComparisonSeriesGroup[]>(() => {
    if (!comparisonRange || comparisonTimeline.length === 0) return [];
    const shiftTs = (ts: number) => ts + comparisonOffsetMs;
    if (solarViewMode === 'power') {
      return [
        { label: `DC1 wattage (${comparisonLabel})`, color: rainbow.yellow, timestamps: comparisonTimeline.map((r) => shiftTs(r.ts)), values: comparisonTimeline.map((r) => r.dcInput1Power), unit: 'W', digits: 0 },
        { label: `DC2 wattage (${comparisonLabel})`, color: rainbow.cyan, timestamps: comparisonTimeline.map((r) => shiftTs(r.ts)), values: comparisonTimeline.map((r) => r.dcInput2Power), unit: 'W', digits: 0 },
      ];
    }
    return [
      { label: `DC1 voltage (${comparisonLabel})`, color: rainbow.orange, timestamps: comparisonTimeline.map((r) => shiftTs(r.ts)), values: comparisonTimeline.map((r) => r.dcInput1Voltage), unit: 'V', digits: 1 },
      { label: `DC2 voltage (${comparisonLabel})`, color: rainbow.blue, timestamps: comparisonTimeline.map((r) => shiftTs(r.ts)), values: comparisonTimeline.map((r) => r.dcInput2Voltage), unit: 'V', digits: 1 },
    ];
  }, [comparisonRange, comparisonTimeline, comparisonOffsetMs, rainbow, comparisonLabel, solarViewMode]);
  const batteryPostureComparison = useMemo<ComparisonSeriesGroup[]>(() => {
    if (!comparisonRange || comparisonTimeline.length === 0) return [];
    const shiftTs = (ts: number) => ts + comparisonOffsetMs;
    return [
      { label: `SOC trend (${comparisonLabel})`, color: rainbow.green, timestamps: comparisonTimeline.map((r) => shiftTs(r.ts)), values: comparisonTimeline.map((r) => r.batteryPercent), unit: '%', digits: 1 },
    ];
  }, [comparisonRange, comparisonTimeline, comparisonOffsetMs, rainbow, comparisonLabel]);

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
            comparisonOption={comparisonOption}
            datePickerOpen={datePickerOpen}
            densityMode={densityMode}
            devices={devices}
            historyQueryRefetch={() => void historyQuery.refetch()}
            liveConnected={live.connected}
            rangeId={rangeId}
            selectedDevice={selectedDevice}
            accentOverride={accentOverride}
            themeMode={themeMode}
            onAccentChange={(color) => { setAccentOverride(color); setStoredAccentOverride(skin, color); }}
            onComparisonChange={setComparisonOption}
            onDensityChange={setDensityMode}
            onDeviceChange={setSelectedDevice}
            onExportCsv={() => { if (timeline.length > 0) exportTimelineToCsv(timeline, range.label); }}
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
            <section className="system-summary">
              {(() => {
                const lines: string[] = [];
                const bat = summary.batterySummary;
                const net = summary.netSummary;
                const peak = summary.peakLoad;
                const peakSolar = summary.peakSolar;
                const solarShare = summary.solarShare;
                if (bat?.current != null && net?.avg != null && net.avg > 0) {
                  const estHours = (bat.current / (net.avg / 100)).toFixed(1);
                  lines.push(`Battery can sustain current load for ~${estHours}h`);
                }
                if (solarShare != null) {
                  lines.push(`Solar offset today: ${formatMetric(solarShare, '%')}`);
                }
                if (peak) {
                  lines.push(`Peak load occurred at ${formatShortTime(peak.ts)}`);
                }
                if (peakSolar) {
                  lines.push(`Peak solar at ${formatShortTime(peakSolar.ts)}`);
                }
                if (lines.length === 0) lines.push('Collecting telemetry...');
                return (
                  <div className="system-summary-body">
                    {lines.map((line, i) => <span key={i}>{line}</span>)}
                  </div>
                );
              })()}
            </section>
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
                <PanelHeader icon={LineChart} title="Power Balance" subtitle={`${range.label} — ${timeline.length} data points`} tooltip={`Total input, total output, and net power over ${range.label}`} loading={chartsLoading} />
                <div className="chart-frame">
                  <DenseTimeSeries deferMs={0} themeMode={themeMode} timestamps={timelineTimestamps} series={powerBalanceSeries} comparisonSeries={powerBalanceComparison} loading={chartsLoading} annotations={annotations} onClickPoint={(ts, rect) => setPendingAnnotationTs({ ts, rect })} />
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
                <PanelHeader icon={Sun} title="Solar Input" subtitle={solarViewMode === 'power' ? 'DC wattage' : 'DC voltage'} tooltip={solarViewMode === 'power' ? 'DC1 and DC2 solar input wattage over time' : 'DC1 and DC2 solar input voltage over time'} loading={chartsLoading} />
                <div className="solar-toggle-group">
                  <button type="button" className={solarViewMode === 'power' ? 'active' : ''} onClick={() => setSolarViewMode('power')}>Power</button>
                  <button type="button" className={solarViewMode === 'voltage' ? 'active' : ''} onClick={() => setSolarViewMode('voltage')}>Voltage</button>
                </div>
                <DenseTimeSeries deferMs={90} themeMode={themeMode} timestamps={timelineTimestamps} series={solarInputSeries} comparisonSeries={solarInputComparison} loading={chartsLoading} annotations={annotations} onClickPoint={(ts, rect) => setPendingAnnotationTs({ ts, rect })} />
                <div className="legend-strip compact">
                  {solarViewMode === 'power' ? (
                    <>
                      <span><i style={{ background: rainbow.yellow }} />DC1 wattage</span>
                      <span><i style={{ background: rainbow.cyan }} />DC2 wattage</span>
                    </>
                  ) : (
                    <>
                      <span><i style={{ background: rainbow.orange }} />DC1 voltage</span>
                      <span><i style={{ background: rainbow.blue }} />DC2 voltage</span>
                    </>
                  )}
                </div>
                <div className="side-stats">
                  {solarViewMode === 'power' ? (
                    <>
                      <SideStat label="DC1 power avg" value={formatMetric(summary.dcInput1PowerSummary?.avg, 'W')} sub={summary.dcInput1PowerSummary ? `Peak ${formatMetric(summary.dcInput1PowerSummary.max, 'W')}` : undefined} />
                      <SideStat label="DC2 power avg" value={formatMetric(summary.dcInput2PowerSummary?.avg, 'W')} sub={summary.dcInput2PowerSummary ? `Peak ${formatMetric(summary.dcInput2PowerSummary.max, 'W')}` : undefined} />
                    </>
                  ) : (
                    <>
                      <SideStat label="DC1 voltage avg" value={formatMetric(summary.dcInput1VoltageSummary?.avg, 'V', 1)} sub={summary.dcInput1VoltageSummary ? `Peak ${formatMetric(summary.dcInput1VoltageSummary.max, 'V', 1)}` : undefined} />
                      <SideStat label="DC2 voltage avg" value={formatMetric(summary.dcInput2VoltageSummary?.avg, 'V', 1)} sub={summary.dcInput2VoltageSummary ? `Peak ${formatMetric(summary.dcInput2VoltageSummary.max, 'V', 1)}` : undefined} />
                    </>
                  )}
                </div>
              </article>

              <article className="panel battery-posture-panel">
                <PanelHeader icon={Battery} title="Battery Posture" subtitle={resolved.batteryPercent ? `State of Charge trend from ${resolved.batteryPercent}` : 'No battery level data'} tooltip="Battery state of charge percentage trend over the selected window" loading={chartsLoading} />
                <DenseTimeSeries deferMs={180} themeMode={themeMode} timestamps={timelineTimestamps} series={batteryPostureSeries} comparisonSeries={batteryPostureComparison} loading={chartsLoading} annotations={annotations} onClickPoint={(ts, rect) => setPendingAnnotationTs({ ts, rect })} />
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
                skin={skin}
                themeMode={themeMode}
              />
            </section>

            <SnapshotPanel liveState={liveState} />

            <NotesPanel
              annotations={sinceIso ? annotationsInRange(Date.parse(sinceIso), Date.now()) : annotations}
              onDelete={removeAnnotation}
              onJumpTo={() => document.querySelector('.chart-frame')?.scrollIntoView({ behavior: 'smooth' })}
            />
          </>
        )}
      </section>

      {pendingAnnotationTs ? (
        <AnnotationPopover
          timestamp={pendingAnnotationTs.ts}
          anchorRect={pendingAnnotationTs.rect}
          onSave={(text) => { addAnnotation(pendingAnnotationTs.ts, text); }}
          onClose={() => setPendingAnnotationTs(null)}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          accentOverride={accentOverride}
          availableComparisonFields={comparableFields}
          comparisonDefaultFields={comparisonDefaultFields}
          densityMode={densityMode}
          skin={skin}
          themeMode={themeMode}
          onAccentChange={(color) => { setAccentOverride(color); setStoredAccentOverride(skin, color); }}
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
