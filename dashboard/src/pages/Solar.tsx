import { startTransition, useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
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
import { Battery, Gauge, LineChart as LineChartIcon, RefreshCw, Sun, Wifi, Zap } from 'lucide-react';
import { fetchFields, fetchHistory, type DeviceState, type HistoryPoint } from '../lib/api';
import { buildCoverageLabel } from '../lib/chartAnalytics';
import { formatTime } from '../lib/time';
import { Card, Spinner, SectionPanel, MetricTile, InfoRow, StatusChip, PageHeader, EmptyState } from '../components/ui';
import { SkeletonCard } from '../components/SkeletonCard';
import { useTelemetryState } from '../hooks/useTelemetryState';
import { useShellStore } from '../store/shell';
import { useWsStore } from '../store/ws';
import { RANGE_PRESETS, useDeviceSelector, type RangePreset } from '../lib/shared-controls';

const FOCUS_OPTIONS = [
  { id: 'generation', label: 'Generation', icon: Sun },
  { id: 'inputs', label: 'Input split', icon: Zap },
  { id: 'charge', label: 'Charge climb', icon: Battery },
] as const;

const SOLAR_FIELD_ALIASES = {
  totalSolar: ['dc_input_power', 'pv_input_power', 'solar_power'],
  pv1Power: ['pv1_power', 'dc_input_power1'],
  pv2Power: ['pv2_power', 'dc_input_power2'],
  pv1Voltage: ['pv1_voltage', 'dc_input_voltage1'],
  pv2Voltage: ['pv2_voltage', 'dc_input_voltage2'],
  pv1Current: ['pv1_current', 'dc_input_current1'],
  pv2Current: ['pv2_current', 'dc_input_current2'],
  solarVoltage: ['internal_dc_input_voltage', 'pv_input_voltage'],
  solarCurrent: ['internal_dc_input_current', 'pv_input_current'],
  gridInput: ['ac_input_power', 'grid_charge_power'],
  acLoad: ['ac_output_power'],
  dcLoad: ['dc_output_power'],
  batteryPercent: ['total_battery_percent', 'battery_percent', 'charge_level', 'soc'],
  batteryToFull: ['battery_range_to_full'],
  chargeCeiling: ['battery_range_end'],
} as const;

type FocusId = typeof FOCUS_OPTIONS[number]['id'];
type SolarFieldKey = keyof typeof SOLAR_FIELD_ALIASES;
type ResolvedSolarFields = Record<SolarFieldKey, string | null>;
type SolarTimelinePoint = {
  ts: number;
  totalSolar: number | null;
  pv1Power: number | null;
  pv2Power: number | null;
  pv1Voltage: number | null;
  pv2Voltage: number | null;
  pv1Current: number | null;
  pv2Current: number | null;
  solarVoltage: number | null;
  solarCurrent: number | null;
  totalInput: number | null;
  gridInput: number | null;
  totalOutput: number | null;
  batteryPercent: number | null;
  batteryToFull: number | null;
  solarNet: number | null;
};
type SolarAnalyticsPayload = {
  timeline: SolarTimelinePoint[];
  resolvedFields: ResolvedSolarFields;
  bucketLabel: string;
  sinceIso: string;
};
type ChargeEstimate = {
  minutes: number | null;
  sourceLabel: string;
  detail: string;
  targetPercent: number | null;
  percentPerHour: number | null;
};
type SeriesSummary = {
  current: number | null;
  start: number | null;
  min: number;
  max: number;
  avg: number;
  change: number | null;
};

export default function Solar() {
  const location = useLocation();
  const wsState = useWsStore((state) => state.state);
  const setRouteSignal = useShellStore((state) => state.setRouteSignal);
  const resetRouteSignal = useShellStore((state) => state.resetRouteSignal);
  const liveDevices = Object.keys(wsState);

  // Telemetry state for loading/offline/stale detection
  const { isLoading, isOffline, isStale, staleSeverity, reconnect } = useTelemetryState();

  const { selectedDevice, setSelectedDevice } = useDeviceSelector(liveDevices);
  const [rangeId, setRangeId] = useState<RangePreset['id']>('24h');
  const [focus, setFocus] = useState<FocusId>('generation');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(location.pathname === '/solar');
  }, [location.pathname]);

  const range = RANGE_PRESETS.find((preset) => preset.id === rangeId) ?? RANGE_PRESETS[2];
  const sinceIso = new Date(Date.now() - range.minutes * 60_000).toISOString();
  const liveState = wsState[selectedDevice] ?? {};

  const { data: fields = [], isLoading: isLoadingFields } = useQuery({
    queryKey: ['fields', selectedDevice],
    queryFn: () => fetchFields(selectedDevice),
    enabled: isActive && !!selectedDevice,
  });

  const availableFields = fields.length > 0 ? fields : Object.keys(liveState);
  const resolvedFields = resolveSolarFields(availableFields);

  const solarQuery = useQuery({
    queryKey: ['solar-analytics', selectedDevice, range.id, Object.values(resolvedFields).join('|')],
    enabled: isActive && !!selectedDevice && Object.keys(liveState).length > 0,
    queryFn: async (): Promise<SolarAnalyticsPayload> => {
      const uniqueFields = Object.values(resolvedFields)
        .filter((field): field is string => Boolean(field))
        .filter((field, index, list) => list.indexOf(field) === index);

      const historyEntries = await Promise.all(
        uniqueFields.map(async (field) => (
          [field, await fetchHistory(selectedDevice, field, { limit: range.limit, since: sinceIso })] as const
        )),
      );

      return {
        timeline: buildSolarTimeline(
          mapResolvedHistory(resolvedFields, Object.fromEntries(historyEntries)),
          range.bucketMs,
        ),
        resolvedFields,
        bucketLabel: buildCoverageLabel(range.bucketMs),
        sinceIso,
      };
    },
  });

  if (liveDevices.length === 0) {
    return (
      <div className="page-stack animate-fade-in">
        <EmptyState
          title="Waiting for solar telemetry"
          description="Once the AC500 starts publishing live input fields, this page will turn into a dedicated solar workspace for both PV inputs, charge tracking, and harvest history."
        />
      </div>
    );
  }

  const timeline = solarQuery.data?.timeline ?? [];
  const resolved = solarQuery.data?.resolvedFields ?? resolvedFields;
  const liveSnapshot = buildLiveSnapshot(liveState, resolved);
  useEffect(() => {
    setRouteSignal('solar', formatMetricValue(liveSnapshot.totalSolar, 'W'));

    return () => {
      resetRouteSignal('solar');
    };
  }, [liveSnapshot.totalSolar, resetRouteSignal, setRouteSignal]);
  const totalSolarSummary = summarizeSeries(timeline, 'totalSolar');
  const pv1Summary = summarizeSeries(timeline, 'pv1Power');
  const pv2Summary = summarizeSeries(timeline, 'pv2Power');
  const batterySummary = summarizeSeries(timeline, 'batteryPercent');
  const gridSummary = summarizeSeries(timeline, 'gridInput');
  const inputSummary = summarizeSeries(timeline, 'totalInput');
  const outputSummary = summarizeSeries(timeline, 'totalOutput');
  const solarNetSummary = summarizeSeries(timeline, 'solarNet');
  const batteryToFullSummary = summarizeSeries(timeline, 'batteryToFull');
  const solarPeak = findPeakPoint(timeline, 'totalSolar');
  const pv1Peak = findPeakPoint(timeline, 'pv1Power');
  const pv2Peak = findPeakPoint(timeline, 'pv2Power');
  const hasSplitElectrical = Boolean(
    resolved.pv1Voltage || resolved.pv2Voltage || resolved.pv1Current || resolved.pv2Current,
  );
  const hasSharedElectrical = Boolean(resolved.solarVoltage || resolved.solarCurrent);
  const showSplitCards = Boolean(
    resolved.pv1Power || resolved.pv2Power || hasSplitElectrical,
  );
  const solarCoverage = liveSnapshot.totalOutput > 0
    ? clampPercent((liveSnapshot.totalSolar / liveSnapshot.totalOutput) * 100)
    : null;
  const solarShare = inputSummary && inputSummary.avg > 0 && totalSolarSummary
    ? clampPercent((totalSolarSummary.avg / inputSummary.avg) * 100)
    : null;
  const chargeEstimate = buildChargeEstimate(liveState, timeline, resolved, range);

  return (
    <div className="page-stack animate-fade-in">
      {/* Show loading skeleton on initial load */}
      {isLoading && (
        <>
          <SkeletonCard lines={6} />
          <SkeletonCard lines={4} />
        </>
      )}

      {/* Offline banner when disconnected */}
      {isOffline && (
        <div className="offline-banner">
          <span>
            <Wifi size={16} />
            Connection lost. Reconnecting...
          </span>
          <button onClick={reconnect}>
            <RefreshCw size={14} style={{ marginRight: 6 }} />
            Retry now
          </button>
        </div>
      )}

      {/* Stale data indicator */}
      {isStale && staleSeverity && (
        <div className="stale-indicator" data-severity={staleSeverity}>
          <RefreshCw size={12} />
          <span>{staleSeverity === 'stale' ? 'Data stale' : 'Data aging'}</span>
        </div>
      )}

      <Card className="analytics-hero-card solar-hero-card surface-card">
        <PageHeader
          kicker="Solar workspace"
          title="One place to track both solar inputs and charging progress"
          icon={Sun}
          description="This page is centered on the AC500's solar-side telemetry: total harvest, per-input string behavior, output coverage, and a battery full-charge estimate tied back to the fields your stack actually receives."
          meta={
            <div className="workspace-panel-meta">
              <StatusChip label={solarQuery.data?.bucketLabel ?? buildCoverageLabel(range.bucketMs)} variant="info" />
              <StatusChip label={`${timeline.length} plotted buckets`} variant="default" />
              <StatusChip label={`${countResolvedFields(resolved)} mapped solar fields`} variant="default" />
            </div>
          }
        />

        <div className="analytics-toolbar">
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

          <div className="analytics-segmented" role="tablist" aria-label="Window">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => startTransition(() => setRangeId(preset.id))}
                className={`analytics-segment-button${range.id === preset.id ? ' active' : ''}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="analytics-segmented analytics-focus-strip" role="tablist" aria-label="Solar focus">
            {FOCUS_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => startTransition(() => setFocus(option.id))}
                  className={`analytics-segment-button analytics-focus-button${focus === option.id ? ' active' : ''}`}
                >
                  <Icon size={14} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {solarQuery.isLoading || isLoadingFields ? (
        <Card className="chart-card-surface">
          <div className="chart-loading-shell"><Spinner /></div>
        </Card>
      ) : null}

      {!solarQuery.isLoading && timeline.length === 0 ? (
        <Card className="workspace-empty-card">
          <div className="workspace-empty-copy">
            <LineChartIcon size={18} />
            <span>The selected window does not have enough solar history yet. Try a longer range or wait for more telemetry to accumulate.</span>
          </div>
        </Card>
      ) : null}

      <div className="tile-grid tile-grid--cols-4">
        <MetricTile label="Solar right now" value={formatMetricValue(liveSnapshot.totalSolar, 'W')} detail={resolved.totalSolar ? `Live field ${resolved.totalSolar}` : 'Combined from PV1 + PV2 when available'} accent="var(--cat-input)" />
        <MetricTile label="PV1 input" value={formatMetricValue(liveSnapshot.pv1Power, 'W')} detail={describeElectricalLive(liveSnapshot.pv1Voltage, liveSnapshot.pv1Current)} accent="#f472b6" />
        <MetricTile label="PV2 input" value={formatMetricValue(liveSnapshot.pv2Power, 'W')} detail={describeElectricalLive(liveSnapshot.pv2Voltage, liveSnapshot.pv2Current)} accent="#38bdf8" />
        <MetricTile label="Battery to full" value={formatDuration(chargeEstimate.minutes)} detail={chargeEstimate.detail} accent="var(--cat-battery)" />
      </div>

      <div className="tile-grid tile-grid--cols-3">
        <MetricTile label="Solar coverage now" value={solarCoverage === null ? '--' : `${solarCoverage}%`} detail={liveSnapshot.totalOutput > 0 ? `Solar ${formatMetricValue(liveSnapshot.totalSolar, 'W')} vs output ${formatMetricValue(liveSnapshot.totalOutput, 'W')}` : 'No live output load reported right now'} icon={Gauge} />
        <MetricTile label="Best harvest bucket" value={solarPeak ? formatMetricValue(solarPeak.totalSolar, 'W') : '--'} detail={solarPeak ? `Captured at ${formatTime(solarPeak.ts)}` : 'No solar bucket in this window'} icon={Sun} />
        <MetricTile label="Battery climb" value={formatSignedMetric(batterySummary?.change, '%', 1)} detail={batterySummary ? `Window ${formatMetricValue(batterySummary.min, '%', 1)} to ${formatMetricValue(batterySummary.max, '%', 1)}` : 'No battery trend in this window'} icon={Battery} />
      </div>

      {timeline.length > 0 ? (
        <>
          <SectionPanel
            title={getFocusTitle(focus)}
            kicker="Focus report"
            icon={Sun}
            className="analytics-report-card solar-report-card"
            meta={
              <div className="analytics-report-meta">
                <StatusChip label={`${formatTime(solarQuery.data?.sinceIso ?? sinceIso)} start`} variant="default" />
                <StatusChip label={`${timeline.length} buckets`} variant="default" />
              </div>
            }
          >
            <p className="analytics-report-copy">{getFocusSubtitle(focus, resolved, chargeEstimate)}</p>

            <div className="analytics-report-body">
              <div className="analytics-chart-shell">
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={timeline} margin={{ top: 8, right: 18, bottom: 8, left: 4 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="ts"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(ts) => formatAxisTick(ts as number, range)}
                      tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      axisLine={false}
                      tickLine={false}
                      scale="time"
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(ts) => formatTooltipLabel(ts as number, range)}
                      formatter={(value, name) => [formatSolarTooltipValue(String(name), value), getSeriesLabel(String(name))]}
                    />
                    <Legend wrapperStyle={legendStyle} />

                    {focus === 'generation' ? (
                      <>
                        <Area yAxisId="left" type="monotone" dataKey="totalSolar" name="totalSolar" stroke="#f59e0b" fill="rgba(245, 158, 11, 0.18)" strokeWidth={2.4} dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="totalOutput" name="totalOutput" stroke="#e2e8f0" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="batteryPercent" name="batteryPercent" stroke="#34d399" strokeWidth={2} dot={false} />
                      </>
                    ) : null}

                    {focus === 'inputs' ? (
                      <>
                        <Area yAxisId="left" type="monotone" dataKey="pv1Power" name="pv1Power" stroke="#f472b6" fill="rgba(244, 114, 182, 0.18)" strokeWidth={2} dot={false} />
                        <Area yAxisId="left" type="monotone" dataKey="pv2Power" name="pv2Power" stroke="#38bdf8" fill="rgba(56, 189, 248, 0.18)" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="gridInput" name="gridInput" stroke="#a78bfa" strokeWidth={2} dot={false} />
                      </>
                    ) : null}

                    {focus === 'charge' ? (
                      <>
                        <Line yAxisId="left" type="monotone" dataKey="batteryPercent" name="batteryPercent" stroke="#34d399" strokeWidth={2.6} dot={false} activeDot={{ r: 4 }} />
                        <Area yAxisId="right" type="monotone" dataKey="solarNet" name="solarNet" stroke="#f59e0b" fill="rgba(245, 158, 11, 0.16)" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="batteryToFull" name="batteryToFull" stroke="#60a5fa" strokeWidth={1.8} dot={false} />
                        <ReferenceLine yAxisId="right" y={0} stroke="var(--border-hi)" strokeDasharray="4 4" />
                      </>
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="analytics-side-stats">
                {focus === 'generation' ? (
                  <>
                    <SideStat label="Average solar" value={formatMetricValue(totalSolarSummary?.avg, 'W')} detail="Window mean harvest" />
                    <SideStat label="Average input" value={formatMetricValue(inputSummary?.avg, 'W')} detail="Solar plus any AC assist" />
                    <SideStat label="Average output" value={formatMetricValue(outputSummary?.avg, 'W')} detail="AC plus DC loads" />
                    <SideStat label="Battery reserve" value={formatMetricValue(batterySummary?.current, '%', 1)} detail="Current reserve level" />
                  </>
                ) : null}
                {focus === 'inputs' ? (
                  <>
                    <SideStat label="PV1 average" value={formatMetricValue(pv1Summary?.avg, 'W')} detail={resolved.pv1Power ?? 'PV1 field unavailable'} />
                    <SideStat label="PV2 average" value={formatMetricValue(pv2Summary?.avg, 'W')} detail={resolved.pv2Power ?? 'PV2 field unavailable'} />
                    <SideStat label="Grid assist" value={formatMetricValue(gridSummary?.avg, 'W')} detail={resolved.gridInput ?? 'No AC assist field mapped'} />
                    <SideStat label="Window share" value={solarShare === null ? '--' : `${solarShare}%`} detail="Solar portion of all input" />
                  </>
                ) : null}
                {focus === 'charge' ? (
                  <>
                    <SideStat label="Current reserve" value={formatMetricValue(batterySummary?.current, '%', 1)} detail={resolved.batteryPercent ?? 'Battery field unavailable'} />
                    <SideStat label="Window climb" value={formatSignedMetric(batterySummary?.change, '%', 1)} detail="End minus start reserve" />
                    <SideStat label="Solar net avg" value={formatSignedMetric(solarNetSummary?.avg, 'W')} detail="Solar minus current load" />
                    <SideStat label="Reported full time" value={formatMetricValue(batteryToFullSummary?.current, 'min')} detail={resolved.batteryToFull ?? 'Derived estimate in hero'} />
                  </>
                ) : null}
              </div>
            </div>
          </SectionPanel>

          <div className="solar-detail-grid">
            <SectionPanel
              title="Live string health and electrical detail"
              kicker="Input detail"
              icon={Gauge}
              className="solar-input-detail-card"
              meta={
                <div className="analytics-report-meta">
                  <StatusChip label={`${formatMetricValue(liveSnapshot.totalSolar, 'W')} total`} variant="default" />
                  <StatusChip label={describeInputDetailMode(showSplitCards, hasSplitElectrical, hasSharedElectrical)} variant="info" />
                </div>
              }
            >
              <p className="analytics-report-copy">
                The two solar inputs are broken out here so you can spot mismatched generation, low-voltage behavior, or one string underperforming the other without leaving the page.
              </p>

              <div className="solar-string-grid">
                {showSplitCards ? (
                  <>
                    <SolarInputCard
                      label="PV1"
                      power={liveSnapshot.pv1Power}
                      voltage={liveSnapshot.pv1Voltage}
                      current={liveSnapshot.pv1Current}
                      peak={pv1Peak ? `${formatMetricValue(pv1Peak.pv1Power, 'W')} peak` : 'Peak unavailable'}
                      accent="#f472b6"
                    />
                    <SolarInputCard
                      label="PV2"
                      power={liveSnapshot.pv2Power}
                      voltage={liveSnapshot.pv2Voltage}
                      current={liveSnapshot.pv2Current}
                      peak={pv2Peak ? `${formatMetricValue(pv2Peak.pv2Power, 'W')} peak` : 'Peak unavailable'}
                      accent="#38bdf8"
                    />
                  </>
                ) : (
                  <SolarInputCard
                    label="Solar bus"
                    power={liveSnapshot.totalSolar}
                    voltage={liveSnapshot.solarVoltage}
                    current={liveSnapshot.solarCurrent}
                    peak={solarPeak ? `${formatMetricValue(solarPeak.totalSolar, 'W')} peak` : 'Peak unavailable'}
                    accent="var(--cat-input)"
                  />
                )}
              </div>

              {showSplitCards && !hasSplitElectrical && hasSharedElectrical ? (
                <div className="solar-input-shared-note">
                  Electrical telemetry is currently published on the shared solar bus: {describeElectricalLive(liveSnapshot.solarVoltage, liveSnapshot.solarCurrent)}.
                </div>
              ) : null}

              {hasSplitElectrical || hasSharedElectrical ? (
                <div className="analytics-chart-shell compact">
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={timeline} margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="ts"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(ts) => formatAxisTick(ts as number, range)}
                        tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                        axisLine={false}
                        tickLine={false}
                        scale="time"
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                        axisLine={false}
                        tickLine={false}
                        width={56}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                        axisLine={false}
                        tickLine={false}
                        width={56}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(ts) => formatTooltipLabel(ts as number, range)}
                        formatter={(value, name) => [formatSolarTooltipValue(String(name), value), getSeriesLabel(String(name))]}
                      />
                      <Legend wrapperStyle={legendStyle} />
                      {hasSplitElectrical ? (
                        <>
                          <Line yAxisId="left" type="monotone" dataKey="pv1Voltage" name="pv1Voltage" stroke="#f472b6" strokeWidth={2} dot={false} />
                          <Line yAxisId="left" type="monotone" dataKey="pv2Voltage" name="pv2Voltage" stroke="#38bdf8" strokeWidth={2} dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="pv1Current" name="pv1Current" stroke="#fb7185" strokeWidth={1.8} dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="pv2Current" name="pv2Current" stroke="#60a5fa" strokeWidth={1.8} dot={false} />
                        </>
                      ) : (
                        <>
                          <Line yAxisId="left" type="monotone" dataKey="solarVoltage" name="solarVoltage" stroke="#f59e0b" strokeWidth={2.2} dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="solarCurrent" name="solarCurrent" stroke="#38bdf8" strokeWidth={2} dot={false} />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="workspace-empty-card analytics-inline-empty">
                  <div className="workspace-empty-copy">
                    <Gauge size={18} />
                    <span>This device is not publishing solar voltage/current telemetry yet, so this section can only show power fields.</span>
                  </div>
                </div>
              )}
            </SectionPanel>

            <div className="solar-side-column">
              <SectionPanel
                title="How long until the battery is full"
                kicker="Charge estimate"
                icon={Battery}
                className="solar-forecast-card"
              >
                <p className="analytics-report-copy">
                  {chargeEstimate.sourceLabel}. When the AC500 reports a direct time-to-full value, that wins. Otherwise this page derives the estimate from the recent battery-percent climb and the configured charge ceiling.
                </p>
                <div className="solar-forecast-value">{formatDuration(chargeEstimate.minutes)}</div>
                <div className="solar-forecast-meta">
                  <InfoRow label="Charge detail" value={chargeEstimate.detail} />
                  <InfoRow label="Charge trend" value={chargeEstimate.percentPerHour === null ? 'Charge trend unavailable' : `${chargeEstimate.percentPerHour.toFixed(2)}% per hour`} />
                  <InfoRow label="Battery now" value={batterySummary ? formatMetricValue(batterySummary.current, '%', 1) : 'Battery reserve unavailable'} />
                </div>
              </SectionPanel>

              <SectionPanel
                title="Fields driving this solar page"
                kicker="Telemetry map"
                icon={Gauge}
                className="solar-mapping-card"
              >
                <InfoRow label="Total solar" value={resolved.totalSolar ?? 'Unavailable'} />
                <InfoRow label="PV1 power" value={resolved.pv1Power ?? 'Unavailable'} />
                <InfoRow label="PV2 power" value={resolved.pv2Power ?? 'Unavailable'} />
                <InfoRow label="PV1 voltage" value={resolved.pv1Voltage ?? 'Unavailable'} />
                <InfoRow label="PV2 voltage" value={resolved.pv2Voltage ?? 'Unavailable'} />
                <InfoRow label="PV1 current" value={resolved.pv1Current ?? 'Unavailable'} />
                <InfoRow label="PV2 current" value={resolved.pv2Current ?? 'Unavailable'} />
                <InfoRow label="Solar bus voltage" value={resolved.solarVoltage ?? 'Unavailable'} />
                <InfoRow label="Solar bus current" value={resolved.solarCurrent ?? 'Unavailable'} />
                <InfoRow label="Battery reserve" value={resolved.batteryPercent ?? 'Unavailable'} />
                <InfoRow label="Battery full time" value={resolved.batteryToFull ?? 'Unavailable'} />
                <InfoRow label="Charge ceiling" value={resolved.chargeCeiling ?? 'Unavailable'} />
              </SectionPanel>

              <SectionPanel
                title="What the window says"
                kicker="Solar posture"
                icon={Gauge}
                className="solar-mapping-card"
              >
                <InfoRow label="Average solar" value={formatMetricValue(totalSolarSummary?.avg, 'W')} />
                <InfoRow label="Average grid assist" value={formatMetricValue(gridSummary?.avg, 'W')} />
                <InfoRow label="Average load" value={formatMetricValue(outputSummary?.avg, 'W')} />
                <InfoRow label="Solar minus load" value={formatSignedMetric(solarNetSummary?.avg, 'W')} />
                <InfoRow label="Battery change" value={formatSignedMetric(batterySummary?.change, '%', 1)} />
              </SectionPanel>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SideStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="analytics-side-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function SolarInputCard({
  label,
  power,
  voltage,
  current,
  peak,
  accent,
}: {
  label: string;
  power: number | null;
  voltage: number | null;
  current: number | null;
  peak: string;
  accent: string;
}) {
  return (
    <div className="solar-input-card" style={{ boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 18%, transparent)` }}>
      <div className="solar-input-card-header">
        <span>{label}</span>
        <strong style={{ color: accent }}>{formatMetricValue(power, 'W')}</strong>
      </div>
      <div className="solar-input-card-row">
        <span>Voltage</span>
        <strong>{formatMetricValue(voltage, 'V', 1)}</strong>
      </div>
      <div className="solar-input-card-row">
        <span>Current</span>
        <strong>{formatMetricValue(current, 'A', 1)}</strong>
      </div>
      <div className="solar-input-card-foot">{peak}</div>
    </div>
  );
}

function resolveSolarFields(availableFields: string[]): ResolvedSolarFields {
  const fieldSet = new Set(availableFields);

  return Object.fromEntries(
    Object.entries(SOLAR_FIELD_ALIASES).map(([key, aliases]) => [
      key,
      aliases.find((field) => fieldSet.has(field)) ?? null,
    ]),
  ) as ResolvedSolarFields;
}

function mapResolvedHistory(
  resolvedFields: ResolvedSolarFields,
  historyByField: Record<string, HistoryPoint[]>,
) {
  return Object.fromEntries(
    Object.entries(resolvedFields).map(([key, field]) => [key, field ? historyByField[field] ?? [] : []]),
  ) as Record<SolarFieldKey, HistoryPoint[]>;
}

function buildSolarTimeline(
  historyByMetric: Record<SolarFieldKey, HistoryPoint[]>,
  bucketMs: number,
): SolarTimelinePoint[] {
  const bucketed = {
    totalSolar: bucketHistory(historyByMetric.totalSolar ?? [], bucketMs),
    pv1Power: bucketHistory(historyByMetric.pv1Power ?? [], bucketMs),
    pv2Power: bucketHistory(historyByMetric.pv2Power ?? [], bucketMs),
    pv1Voltage: bucketHistory(historyByMetric.pv1Voltage ?? [], bucketMs),
    pv2Voltage: bucketHistory(historyByMetric.pv2Voltage ?? [], bucketMs),
    pv1Current: bucketHistory(historyByMetric.pv1Current ?? [], bucketMs),
    pv2Current: bucketHistory(historyByMetric.pv2Current ?? [], bucketMs),
    solarVoltage: bucketHistory(historyByMetric.solarVoltage ?? [], bucketMs),
    solarCurrent: bucketHistory(historyByMetric.solarCurrent ?? [], bucketMs),
    gridInput: bucketHistory(historyByMetric.gridInput ?? [], bucketMs),
    acLoad: bucketHistory(historyByMetric.acLoad ?? [], bucketMs),
    dcLoad: bucketHistory(historyByMetric.dcLoad ?? [], bucketMs),
    batteryPercent: bucketHistory(historyByMetric.batteryPercent ?? [], bucketMs),
    batteryToFull: bucketHistory(historyByMetric.batteryToFull ?? [], bucketMs),
  };

  const timestamps = collectBucketKeys(Object.values(bucketed));
  const preferSplitTotal = historyByMetric.pv1Power.length > 0 || historyByMetric.pv2Power.length > 0;

  return timestamps.map((ts) => {
    const directTotalSolar = bucketed.totalSolar.get(ts) ?? null;
    const pv1Power = bucketed.pv1Power.get(ts) ?? null;
    const pv2Power = bucketed.pv2Power.get(ts) ?? null;
    const gridInput = bucketed.gridInput.get(ts) ?? null;
    const acLoad = bucketed.acLoad.get(ts) ?? null;
    const dcLoad = bucketed.dcLoad.get(ts) ?? null;
    const splitTotalSolar = sumNullable([pv1Power, pv2Power]);
    const totalSolar = preferSplitTotal
      ? splitTotalSolar ?? directTotalSolar
      : directTotalSolar ?? splitTotalSolar;
    const totalOutput = sumNullable([acLoad, dcLoad]);
    const totalInput = sumNullable([totalSolar, gridInput]);

    return {
      ts,
      totalSolar,
      pv1Power,
      pv2Power,
      pv1Voltage: bucketed.pv1Voltage.get(ts) ?? null,
      pv2Voltage: bucketed.pv2Voltage.get(ts) ?? null,
      pv1Current: bucketed.pv1Current.get(ts) ?? null,
      pv2Current: bucketed.pv2Current.get(ts) ?? null,
      solarVoltage: bucketed.solarVoltage.get(ts) ?? null,
      solarCurrent: bucketed.solarCurrent.get(ts) ?? sumNullable([bucketed.pv1Current.get(ts) ?? null, bucketed.pv2Current.get(ts) ?? null]),
      totalInput,
      gridInput,
      totalOutput,
      batteryPercent: bucketed.batteryPercent.get(ts) ?? null,
      batteryToFull: bucketed.batteryToFull.get(ts) ?? null,
      solarNet: hasAnyValue([totalSolar, totalOutput]) ? (totalSolar ?? 0) - (totalOutput ?? 0) : null,
    };
  });
}

function buildLiveSnapshot(state: DeviceState, resolved: ResolvedSolarFields) {
  const totalSolarDirect = getLiveNumber(state, resolved.totalSolar);
  const pv1Power = getLiveNumber(state, resolved.pv1Power);
  const pv2Power = getLiveNumber(state, resolved.pv2Power);
  const splitTotalSolar = sumNullable([pv1Power, pv2Power]);
  const totalSolar = splitTotalSolar ?? totalSolarDirect ?? 0;
  const totalOutput = sumNullable([
    getLiveNumber(state, resolved.acLoad),
    getLiveNumber(state, resolved.dcLoad),
  ]) ?? 0;

  return {
    totalSolar,
    pv1Power,
    pv2Power,
    pv1Voltage: getLiveNumber(state, resolved.pv1Voltage),
    pv2Voltage: getLiveNumber(state, resolved.pv2Voltage),
    pv1Current: getLiveNumber(state, resolved.pv1Current),
    pv2Current: getLiveNumber(state, resolved.pv2Current),
    solarVoltage: getLiveNumber(state, resolved.solarVoltage),
    solarCurrent: getLiveNumber(state, resolved.solarCurrent) ?? sumNullable([
      getLiveNumber(state, resolved.pv1Current),
      getLiveNumber(state, resolved.pv2Current),
    ]),
    totalOutput,
  };
}

function buildChargeEstimate(
  state: DeviceState,
  timeline: SolarTimelinePoint[],
  resolved: ResolvedSolarFields,
  range: RangePreset,
): ChargeEstimate {
  const reportedMinutes = getLiveNumber(state, resolved.batteryToFull);
  const currentPercent = getLiveNumber(state, resolved.batteryPercent);
  const configuredCeiling = getLiveNumber(state, resolved.chargeCeiling);
  const targetPercent = Math.max(currentPercent ?? 0, Math.min(100, configuredCeiling ?? 100));

  if (reportedMinutes !== null && reportedMinutes >= 0) {
    return {
      minutes: reportedMinutes,
      sourceLabel: 'Device-reported battery_range_to_full',
      detail: resolved.batteryToFull
        ? `Using live ${resolved.batteryToFull} from the device`
        : 'Using device-reported time to full',
      targetPercent,
      percentPerHour: null,
    };
  }

  const batteryPoints = timeline.filter(
    (point): point is SolarTimelinePoint & { batteryPercent: number } =>
      typeof point.batteryPercent === 'number' && Number.isFinite(point.batteryPercent),
  );

  if (batteryPoints.length >= 2 && currentPercent !== null && targetPercent > currentPercent) {
    const first = batteryPoints[0];
    const last = batteryPoints.at(-1) ?? first;
    const elapsedHours = (last.ts - first.ts) / 3_600_000;
    const percentChange = last.batteryPercent - first.batteryPercent;
    const percentPerHour = elapsedHours > 0 ? percentChange / elapsedHours : null;

    if (percentPerHour !== null && percentPerHour > 0) {
      return {
        minutes: ((targetPercent - currentPercent) / percentPerHour) * 60,
        sourceLabel: 'Derived from recent battery climb',
        detail: `Based on reserve change over the selected ${range.label} window`,
        targetPercent,
        percentPerHour,
      };
    }
  }

  return {
    minutes: null,
    sourceLabel: 'Estimate unavailable',
    detail: 'Waiting for either battery_range_to_full or a positive battery-percent trend',
    targetPercent: configuredCeiling ?? currentPercent ?? null,
    percentPerHour: null,
  };
}

function summarizeSeries(
  timeline: SolarTimelinePoint[],
  key: keyof SolarTimelinePoint,
): SeriesSummary | null {
  const values = timeline
    .map((point) => point[key])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  const current = values.at(-1) ?? null;
  const start = values[0] ?? null;

  return {
    current,
    start,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, value) => sum + value, 0) / values.length,
    change: current !== null && start !== null ? current - start : null,
  };
}

function findPeakPoint(
  timeline: SolarTimelinePoint[],
  key: keyof SolarTimelinePoint,
) {
  let match: SolarTimelinePoint | null = null;
  let peak = Number.NEGATIVE_INFINITY;

  for (const point of timeline) {
    const value = point[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > peak) {
      peak = value;
      match = point;
    }
  }

  return match;
}

function bucketHistory(points: HistoryPoint[], bucketMs: number) {
  const buckets = new Map<number, { count: number; sum: number }>();

  for (const point of points) {
    const numericValue = Number.parseFloat(point.value);
    const ts = Date.parse(point.ts);

    if (!Number.isFinite(numericValue) || !Number.isFinite(ts)) {
      continue;
    }

    const bucket = Math.floor(ts / bucketMs) * bucketMs;
    const current = buckets.get(bucket) ?? { count: 0, sum: 0 };
    current.count += 1;
    current.sum += numericValue;
    buckets.set(bucket, current);
  }

  return new Map(
    [...buckets.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([bucket, entry]) => [bucket, entry.sum / entry.count]),
  );
}

function collectBucketKeys(seriesList: Array<Map<number, number>>) {
  return [...new Set(seriesList.flatMap((series) => [...series.keys()]))].sort((left, right) => left - right);
}

function getLiveNumber(state: DeviceState, field: string | null) {
  if (!field) return null;
  const raw = state[field]?.value;
  if (raw === undefined) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumNullable(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) {
    return null;
  }

  return present.reduce((sum, value) => sum + value, 0);
}

function hasAnyValue(values: Array<number | null>) {
  return values.some((value) => value !== null);
}

function countResolvedFields(resolved: ResolvedSolarFields) {
  return Object.values(resolved).filter(Boolean).length;
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

function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '--';
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;

  if (hours === 0) {
    return `${remainder}m`;
  }

  if (remainder === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}

function describeElectricalLive(voltage: number | null, current: number | null) {
  if (voltage === null && current === null) {
    return 'Voltage and current not published yet';
  }

  return `${formatMetricValue(voltage, 'V', 1)} / ${formatMetricValue(current, 'A', 1)}`;
}

function describeInputDetailMode(
  showSplitCards: boolean,
  hasSplitElectrical: boolean,
  hasSharedElectrical: boolean,
) {
  if (showSplitCards && hasSplitElectrical) {
    return 'Per-string power and electrical telemetry';
  }

  if (showSplitCards && hasSharedElectrical) {
    return 'Per-string power with shared DC bus electrical telemetry';
  }

  if (hasSharedElectrical) {
    return 'Combined solar bus telemetry';
  }

  return 'Power-only telemetry available';
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(999, Math.round(value)));
}

function getFocusTitle(focus: FocusId) {
  if (focus === 'inputs') return 'How PV1 and PV2 are sharing the harvest';
  if (focus === 'charge') return 'How solar is moving the battery upward';
  return 'How much solar the system has been collecting';
}

function getFocusSubtitle(
  focus: FocusId,
  resolved: ResolvedSolarFields,
  estimate: ChargeEstimate,
) {
  if (focus === 'inputs') {
    return `Comparing ${resolved.pv1Power ?? 'PV1'} and ${resolved.pv2Power ?? 'PV2'} so mismatched string behavior is visible instead of implied.`;
  }

  if (focus === 'charge') {
    return `${estimate.sourceLabel}. The report pairs battery reserve with solar net power so you can judge whether harvest is actually lifting the pack.`;
  }

  return `Following ${resolved.totalSolar ?? 'total solar input'} against current output and battery reserve so you can see whether solar is covering demand or just assisting it.`;
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

function formatSolarTooltipValue(name: string, value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  if (name === 'batteryPercent') return `${value.toFixed(1)} %`;
  if (name === 'batteryToFull') return `${Math.round(value)} min`;
  if (name === 'pv1Voltage' || name === 'pv2Voltage' || name === 'solarVoltage') return `${value.toFixed(1)} V`;
  if (name === 'pv1Current' || name === 'pv2Current' || name === 'solarCurrent') return `${value.toFixed(1)} A`;
  return `${Math.round(value).toLocaleString()} W`;
}

function getSeriesLabel(name: string) {
  if (name === 'totalSolar') return 'Total solar';
  if (name === 'pv1Power') return 'PV1 power';
  if (name === 'pv2Power') return 'PV2 power';
  if (name === 'pv1Voltage') return 'PV1 voltage';
  if (name === 'pv2Voltage') return 'PV2 voltage';
  if (name === 'pv1Current') return 'PV1 current';
  if (name === 'pv2Current') return 'PV2 current';
  if (name === 'solarVoltage') return 'Solar bus voltage';
  if (name === 'solarCurrent') return 'Solar bus current';
  if (name === 'gridInput') return 'Grid assist';
  if (name === 'totalOutput') return 'Total output';
  if (name === 'batteryPercent') return 'Battery reserve';
  if (name === 'batteryToFull') return 'Time to full';
  if (name === 'solarNet') return 'Solar net';
  return name;
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
