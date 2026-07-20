import { useEffect } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Battery,
  Bluetooth,
  Cpu,
  Info,
  MoonStar,
  Plug,
  RefreshCw,
  ShieldCheck,
  Sun,
  Wifi,
  Zap,
} from 'lucide-react';
import { useWsStore } from '../store/ws';
import { useShellStore } from '../store/shell';
import { useAppSettingsStore } from '../store/settings';
import { BoolBadge, Card, SectionPanel, MetricTile, InfoRow, EmptyState, StatHelpTooltip, type StatHelpContent } from '../components/ui';
import { SkeletonCard } from '../components/SkeletonCard';
import { useTelemetryState } from '../hooks/useTelemetryState';
import { getDeviceModel, getDeviceSerial } from '../lib/device-meta';
import { getCurrentSolarInputWatts } from '../lib/power';

type FieldValue = { value: string; ts: string };
type DeviceState = Record<string, FieldValue>;

type StatItem = {
  label: string;
  field: string;
  unit?: string;
  accent?: string;
};

type MetricDefinition = {
  label: string;
  value: string | null;
  detail?: string | null;
  accent?: string;
  tooltip: StatHelpContent;
};

function getNumber(state: DeviceState, field: string) {
  const raw = state[field]?.value;
  if (raw === undefined) return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getText(state: DeviceState, field: string) {
  return state[field]?.value ?? null;
}

function hasField(state: DeviceState, field: string) {
  return state[field] !== undefined;
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatMetric(value: number | null, unit = '', digits = 0) {
  if (value === null) return null;
  return `${formatNumber(value, digits)}${unit}`;
}

function formatNumericFieldDetail(state: DeviceState, field: string, unit = '', digits = 0) {
  const value = getNumber(state, field);
  if (value === null) {
    return `${field}: unavailable`;
  }

  return `${field}: ${formatNumber(value, digits)}${unit ? ` ${unit}` : ''}`;
}

function formatTextFieldDetail(state: DeviceState, field: string) {
  const value = getText(state, field);
  return `${field}: ${value ?? 'unavailable'}`;
}

function rawNumericTooltip(
  label: string,
  state: DeviceState,
  field: string,
  unit = '',
  digits = 0,
  note?: string,
): StatHelpContent {
  return {
    summary: `${label} is a direct reading from the live device telemetry.`,
    dataPoints: [formatNumericFieldDetail(state, field, unit, digits)],
    calculation: [
      'Read the current field value from the selected device state.',
      `Parse it as a number and format it with${unit ? ` ${unit}` : ''} display rounding only.`,
    ],
    note,
  };
}

function batteryTone(percent: number | null) {
  if (percent === null) return 'var(--text-dim)';
  if (percent >= 60) return 'var(--green)';
  if (percent >= 25) return 'var(--amber)';
  return 'var(--red)';
}

function describeActivity(totalIn: number, totalOut: number, gridIn: number, solarIn: number) {
  if (totalIn === 0 && totalOut === 0) {
    return {
      label: 'Idle',
      description: 'Power flow is quiet',
      tone: 'var(--text-dim)',
      icon: MoonStar,
    };
  }

  if (gridIn > 0) {
    return {
      label: 'Grid Assist',
      description: 'Grid input is supporting the load',
      tone: 'var(--blue)',
      icon: Plug,
    };
  }

  if (solarIn > 0 && totalIn >= totalOut) {
    return {
      label: 'Solar Harvest',
      description: 'Solar is covering the current demand',
      tone: 'var(--green)',
      icon: ArrowDownRight,
    };
  }

  return {
    label: 'Supplying Load',
    description: 'Battery is supporting the load',
    tone: 'var(--amber)',
    icon: ArrowUpRight,
  };
}

function modelName(state: DeviceState, deviceId: string) {
  return getDeviceModel(state, deviceId);
}

function deviceSerial(state: DeviceState, deviceId: string) {
  return getDeviceSerial(state, deviceId);
}

function StatPanel({
  title,
  icon: Icon,
  items,
  state,
  description,
}: {
  title: string;
  icon: React.ElementType;
  items: StatItem[];
  state: DeviceState;
  description?: string;
}) {
  const resolved = items
    .map((item) => {
      const value = getNumber(state, item.field);
      if (value === null) return null;
      const digits = item.unit === 'Hz' || item.unit === 'V' || item.unit === 'A' ? 1 : 0;
      return {
        ...item,
        value: `${formatNumber(value, digits)}${item.unit ? ` ${item.unit}` : ''}`,
        tooltip: rawNumericTooltip(item.label, state, item.field, item.unit ?? '', digits),
      };
    })
    .filter((item): item is StatItem & { value: string; tooltip: StatHelpContent } => item !== null);

  if (resolved.length === 0) return null;

  return (
    <SectionPanel title={title} icon={Icon}>
      {description ? <p className="stat-panel-note">{description}</p> : null}
      <div className="tile-grid tile-grid--cols-2">
        {resolved.map((item) => (
          <MetricTile
            key={item.field}
            label={item.label}
            value={item.value}
            accent={item.accent}
            tooltip={item.tooltip}
          />
        ))}
      </div>
    </SectionPanel>
  );
}

function InfoTable({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: React.ElementType;
  rows: Array<{ label: string; value: string }>;
}) {
  if (rows.length === 0) return null;

  return (
    <SectionPanel title={title} icon={Icon}>
      {rows.map((row) => (
        <InfoRow key={row.label} label={row.label} value={row.value} />
      ))}
    </SectionPanel>
  );
}

function Hero({ model, state }: { model: string; state: DeviceState }) {
  const dcInput = getCurrentSolarInputWatts(state);
  const acInput = getNumber(state, 'ac_input_power') ?? getNumber(state, 'grid_charge_power') ?? 0;
  const acOutput = getNumber(state, 'ac_output_power') ?? 0;
  const dcOutput = getNumber(state, 'dc_output_power') ?? 0;
  const battery = getNumber(state, 'total_battery_percent');
  const totalIn = dcInput + acInput;
  const totalOut = acOutput + dcOutput;
  const net = totalIn - totalOut;
  const batteryFlow = Math.abs(net);
  const batteryFlowLabel = net < -10
    ? 'Supporting load'
    : net > 10
      ? 'Charging headroom'
      : 'Power balanced';
  const batteryFlowTone = net < -10 ? 'warning' : net > 10 ? 'positive' : 'neutral';
  const mode = describeActivity(totalIn, totalOut, acInput, dcInput);
  const ModeIcon = mode.icon;
  const batteryDigits = 0;
  const powerDigits = 0;
  const flowDirection = net < -10 ? 'discharging' : net > 10 ? 'charging' : 'balanced';
  const balanceStatement = net < -10
    ? `${formatNumber(totalIn)} W input + ${formatNumber(batteryFlow)} W battery = ${formatNumber(totalOut)} W load`
    : net > 10
      ? `${formatNumber(totalIn)} W input covers ${formatNumber(totalOut)} W load with ${formatNumber(batteryFlow)} W available to charge`
      : `${formatNumber(totalIn)} W input is closely matched to ${formatNumber(totalOut)} W load`;
  const inputStatus = dcInput > 0 && acInput > 0
    ? 'Solar + grid active'
    : dcInput > 0
      ? 'Solar active'
      : acInput > 0
        ? 'Grid active'
        : 'No active input';
  const outputStatus = acOutput > 0 && dcOutput > 0
    ? 'AC + DC active'
    : acOutput > 0
      ? 'AC active'
      : dcOutput > 0
        ? 'DC active'
        : 'No active load';

  return (
    <Card className="hero-card live-power-card">
      <div className="live-power-header">
        <div className="live-power-heading">
          <div className="hero-kicker">{model} · Live power</div>
          <div className="live-power-title-row">
            <span className="live-power-mode-icon" style={{ color: mode.tone }}><ModeIcon size={20} /></span>
            <div>
              <h2>{mode.description}</h2>
              <p>{balanceStatement}</p>
            </div>
          </div>
        </div>
        <div className="hero-mode-pill" style={{ color: mode.tone, borderColor: mode.tone }}>
          <ModeIcon size={15} />
          <span>{mode.label}</span>
        </div>
      </div>

      <div className="live-power-map" data-flow={flowDirection}>
        <div className="power-node input live-power-source">
          <div className="power-node-head">
            <div className="power-node-label">
              <Sun size={17} />
              Power in
              <StatHelpTooltip
                label="Power in"
                content={{
                  summary: 'Power in is the live power entering the selected device from DC and AC sources.',
                  dataPoints: [
                    formatNumericFieldDetail(state, 'dc_input_power', 'W'),
                    formatNumericFieldDetail(state, 'ac_input_power', 'W'),
                  ],
                  calculation: [
                    'total input = dc_input_power + ac_input_power',
                    'The split rows beneath the total show those same two contributors.',
                  ],
                }}
              />
            </div>
            <span className="power-node-kicker">Sources</span>
          </div>
          <div className="power-node-total">{formatNumber(totalIn)} <small>W</small></div>
          <div className="power-node-note" data-tone={totalIn > 0 ? 'positive' : 'neutral'}>{inputStatus}</div>
          <div className="power-node-splits">
            <div className="power-node-split">
              <span>Solar / DC</span>
              <strong>{formatNumber(dcInput)} W</strong>
            </div>
            <div className="power-node-split">
              <span>Grid / AC</span>
              <strong>{formatNumber(acInput)} W</strong>
            </div>
          </div>
        </div>

        <div className="live-flow-link live-flow-link--input" aria-hidden="true">
          <span>into system</span>
          <i />
        </div>

        <div className="power-node live-power-hub">
          <div className="live-power-hub-icon"><Zap size={24} /></div>
          <span className="power-node-kicker">Power hub</span>
          <strong>{model}</strong>
          <span className="live-power-hub-state">Balancing live demand</span>
        </div>

        <div className="live-flow-link live-flow-link--output" aria-hidden="true">
          <span>to loads</span>
          <i />
        </div>

        <div className="power-node output live-power-output">
          <div className="power-node-head">
            <div className="power-node-label">
              <Plug size={17} />
              Power out
              <StatHelpTooltip
                label="Power out"
                content={{
                  summary: 'Power out is the live load the selected device is serving right now.',
                  dataPoints: [
                    formatNumericFieldDetail(state, 'ac_output_power', 'W'),
                    formatNumericFieldDetail(state, 'dc_output_power', 'W'),
                  ],
                  calculation: [
                    'total output = ac_output_power + dc_output_power',
                    'The split rows beneath the total show the AC and DC load components.',
                  ],
                }}
              />
            </div>
            <span className="power-node-kicker">Loads</span>
          </div>
          <div className="power-node-total">{formatNumber(totalOut)} <small>W</small></div>
          <div className="power-node-note" data-tone={totalOut > 0 ? 'warning' : 'neutral'}>{outputStatus}</div>
          <div className="power-node-splits">
            <div className="power-node-split">
              <span>AC load</span>
              <strong>{formatNumber(acOutput)} W</strong>
            </div>
            <div className="power-node-split">
              <span>DC load</span>
              <strong>{formatNumber(dcOutput)} W</strong>
            </div>
          </div>
        </div>

        <div className="live-battery-link" aria-hidden="true"><i /></div>

        <div className="power-node battery live-power-battery" data-testid="battery-flow-node">
          <div className="live-battery-main">
            <div className="live-battery-reserve">
              <div className="power-node-label">
                <Battery size={17} />
                Battery reserve
                <StatHelpTooltip
                  label="Battery Reserve"
                  content={{
                    summary: 'This is the current battery state of charge reported by the device.',
                    dataPoints: [formatNumericFieldDetail(state, 'total_battery_percent', '%', batteryDigits)],
                    calculation: [
                      'Read total_battery_percent from the live device state.',
                      'Use the same percentage to size the reserve bar.',
                    ],
                    note: 'If the field is missing, the reserve displays as unavailable.',
                  }}
                />
              </div>
              <div className="live-battery-value" style={{ color: batteryTone(battery) }}>
                {battery === null ? '--' : `${formatNumber(battery)}%`}
              </div>
              <div className="live-battery-bar">
                <div
                  className="live-battery-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, battery ?? 0))}%`,
                    background: batteryTone(battery),
                  }}
                />
              </div>
            </div>
            <div className="live-battery-flow">
              <span className="power-node-kicker">Battery balance</span>
              <strong>{formatNumber(batteryFlow)} <small>W</small></strong>
              <div className="power-node-note" data-tone={batteryFlowTone}>{batteryFlowLabel}</div>
            </div>
          </div>
          <div className="live-battery-note">
            <span>{net < -10 ? 'Battery is flowing into the AC500' : net > 10 ? 'Surplus power is flowing into the battery' : 'Battery flow is near neutral'}</span>
            <StatHelpTooltip
              label="Battery Balance"
              content={{
                summary: 'Battery balance closes the live input-to-output power equation.',
                dataPoints: [
                  formatNumericFieldDetail(state, 'dc_input_power', 'W', powerDigits),
                  formatNumericFieldDetail(state, 'ac_input_power', 'W', powerDigits),
                  formatNumericFieldDetail(state, 'ac_output_power', 'W', powerDigits),
                  formatNumericFieldDetail(state, 'dc_output_power', 'W', powerDigits),
                ],
                calculation: [
                  'total input = DC input + AC input',
                  'total output = AC output + DC output',
                  'battery balance = absolute value of total output - total input',
                ],
                note: 'This is a calculated load-side balance, not a direct battery-pack sensor. Conversion losses can make it differ from battery voltage multiplied by battery current.',
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function DeviceOverview({
  deviceId,
  state,
}: {
  deviceId: string;
  state: DeviceState;
}) {
  const model = modelName(state, deviceId);
  const serial = deviceSerial(state, deviceId);
  const firmware = [getText(state, 'arm_version'), getText(state, 'dsp_version')].filter(Boolean).join(' / ');
  const outputMode = getText(state, 'ac_output_mode');
  const upsMode = getText(state, 'ups_mode');
  const sleepMode = getText(state, 'auto_sleep_mode');
  const splitMode = getText(state, 'split_phase_machine_mode');
  const batteryRangeStart = getNumber(state, 'battery_range_start');
  const batteryRangeEnd = getNumber(state, 'battery_range_end');
  const topCards = [
    {
      label: 'Battery Voltage',
      value: formatMetric(getNumber(state, 'total_battery_voltage'), ' V', 1),
      detail: 'Main DC bus',
      accent: 'var(--cat-battery)',
      tooltip: rawNumericTooltip('Battery Voltage', state, 'total_battery_voltage', 'V', 1, 'This is the live total battery bus voltage, not an averaged historical value.'),
    },
    {
      label: 'Generated Energy',
      value: formatMetric(getNumber(state, 'power_generation'), ' kWh', 1),
      detail: 'Cumulative solar generation',
      accent: 'var(--cat-input)',
      tooltip: rawNumericTooltip('Generated Energy', state, 'power_generation', 'kWh', 1, 'The device reports this as a cumulative energy counter.'),
    },
    {
      label: 'AC Output Mode',
      value: outputMode,
      detail: upsMode ? `UPS ${upsMode}` : null,
      accent: 'var(--cat-output)',
      tooltip: {
        summary: 'AC Output Mode shows the inverter mode text currently reported by the device.',
        dataPoints: [
          formatTextFieldDetail(state, 'ac_output_mode'),
          ...(upsMode ? [formatTextFieldDetail(state, 'ups_mode')] : []),
        ],
        calculation: [
          'Read ac_output_mode from the live state and display it as the card value.',
          'If ups_mode is present, show it as supporting detail beneath the mode.',
        ],
      },
    },
    {
      label: 'Battery Window',
      value: batteryRangeStart !== null && batteryRangeEnd !== null ? `${batteryRangeStart}% - ${batteryRangeEnd}%` : null,
      detail: 'Configured charge band',
      accent: 'var(--cat-battery)',
      tooltip: {
        summary: 'Battery Window reflects the configured lower and upper charge-band limits.',
        dataPoints: [
          formatNumericFieldDetail(state, 'battery_range_start', '%'),
          formatNumericFieldDetail(state, 'battery_range_end', '%'),
        ],
        calculation: [
          'Read battery_range_start and battery_range_end from live settings telemetry.',
          'Display them together as a percentage range from start to end.',
        ],
      },
    },
  ].reduce<Array<MetricDefinition & { value: string }>>((cards, item) => {
    if (!item.value) {
      return cards;
    }

    cards.push({ ...item, value: item.value });
    return cards;
  }, []);

  const modeRows = [
    outputMode ? { label: 'AC Output Mode', value: outputMode } : null,
    upsMode ? { label: 'UPS Mode', value: upsMode } : null,
    sleepMode ? { label: 'Auto Sleep', value: sleepMode } : null,
    splitMode ? { label: 'Split Phase Role', value: splitMode } : null,
    batteryRangeStart !== null && batteryRangeEnd !== null
      ? { label: 'Battery Range', value: `${batteryRangeStart}% to ${batteryRangeEnd}%` }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  const identityRows = [
    { label: 'Model', value: model },
    { label: 'Serial', value: serial },
    ...(firmware ? [{ label: 'Firmware', value: firmware }] : []),
  ];

  const internalBusRows = [
    hasField(state, 'internal_power_one') || hasField(state, 'internal_current_one')
      ? {
          label: 'AC Sensor 1',
          value: `${formatMetric(getNumber(state, 'internal_power_one'), ' W') ?? '--'} / ${formatMetric(getNumber(state, 'internal_current_one'), ' A', 1) ?? '--'}`,
        }
      : null,
    hasField(state, 'internal_power_two') || hasField(state, 'internal_current_two')
      ? {
          label: 'AC Sensor 2',
          value: `${formatMetric(getNumber(state, 'internal_power_two'), ' W') ?? '--'} / ${formatMetric(getNumber(state, 'internal_current_two'), ' A', 1) ?? '--'}`,
        }
      : null,
    hasField(state, 'internal_power_three') || hasField(state, 'internal_current_three')
      ? {
          label: 'AC Sensor 3',
          value: `${formatMetric(getNumber(state, 'internal_power_three'), ' W') ?? '--'} / ${formatMetric(getNumber(state, 'internal_current_three'), ' A', 1) ?? '--'}`,
        }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  const statusFlags = [
    hasField(state, 'ac_output_on') ? { label: 'AC Output', value: getText(state, 'ac_output_on') ?? '' } : null,
    hasField(state, 'dc_output_on') ? { label: 'DC Output', value: getText(state, 'dc_output_on') ?? '' } : null,
    hasField(state, 'grid_charge_on') ? { label: 'Grid Charge', value: getText(state, 'grid_charge_on') ?? '' } : null,
    hasField(state, 'time_control_on') ? { label: 'Time Control', value: getText(state, 'time_control_on') ?? '' } : null,
    hasField(state, 'split_phase_on') ? { label: 'Split Phase', value: getText(state, 'split_phase_on') ?? '' } : null,
    hasField(state, 'bluetooth_connected') ? { label: 'Bluetooth', value: getText(state, 'bluetooth_connected') ?? '' } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  return (
    <section className="device-section">
      <div className="device-overview-header">
        <div>
          <div className="device-header">
            <Wifi size={22} />
            {model}
          </div>
          <div className="device-subtitle">
            Live power flow, battery reserve, and system state from your AC500.
          </div>
        </div>

      </div>

      <Hero model={model} state={state} />

      <section className="overview-report-section overview-report-section--essentials" aria-labelledby={`${deviceId}-essentials-title`}>
        <div className="overview-section-heading">
          <span className="overview-section-kicker">At a glance</span>
          <h2 id={`${deviceId}-essentials-title`} className="overview-section-title">System essentials</h2>
        </div>
        <div className="tile-grid tile-grid--fit">
          {topCards.map((card) => (
            <MetricTile
              key={card.label}
              label={card.label}
              value={card.value}
              detail={card.detail ?? undefined}
              accent={card.accent}
              tooltip={card.tooltip}
            />
          ))}
        </div>
      </section>

      <section className="overview-report-section" aria-labelledby={`${deviceId}-power-title`}>
        <div className="overview-section-heading">
          <span className="overview-section-kicker">Live telemetry</span>
          <h2 id={`${deviceId}-power-title`} className="overview-section-title">Power channels</h2>
        </div>
        <div className="detail-grid overview-detail-grid">
          <StatPanel
            title="Input Bus"
            icon={Sun}
            state={state}
            items={[
              { label: 'DC Input Total', field: 'dc_input_power', unit: 'W', accent: 'var(--cat-input)' },
              { label: 'PV1 Power', field: 'dc_input_1_power', unit: 'W' },
              { label: 'PV2 Power', field: 'dc_input_2_power', unit: 'W' },
              { label: 'AC Input', field: 'ac_input_power', unit: 'W', accent: 'var(--cat-input)' },
              { label: 'AC Voltage', field: 'ac_input_voltage', unit: 'V' },
              { label: 'AC Frequency', field: 'ac_input_frequency', unit: 'Hz' },
              { label: 'PV1 MPPT Voltage', field: 'dc_input_1_voltage', unit: 'V' },
              { label: 'PV2 MPPT Voltage', field: 'dc_input_2_voltage', unit: 'V' },
            ]}
          />

          <StatPanel
            title="Output Bus"
            icon={Plug}
            state={state}
            items={[
              { label: 'AC Output', field: 'ac_output_power', unit: 'W', accent: 'var(--cat-output)' },
              { label: 'DC Output', field: 'dc_output_power', unit: 'W', accent: 'var(--cat-output)' },
              { label: 'Internal AC', field: 'internal_ac_voltage', unit: 'V' },
              { label: 'AC Frequency', field: 'internal_ac_frequency', unit: 'Hz' },
            ]}
          />

          <StatPanel
            title="AC Sensor Channels"
            icon={Zap}
            state={state}
            description="Diagnostic AC-side sensor registers. Treat each channel independently; their powers are not battery-pack readings and should not be summed into AC Output."
            items={[
              { label: 'Sensor 1 Power', field: 'internal_power_one', unit: 'W' },
              { label: 'Sensor 1 Current', field: 'internal_current_one', unit: 'A' },
              { label: 'Sensor 2 Power', field: 'internal_power_two', unit: 'W' },
              { label: 'Sensor 2 Current', field: 'internal_current_two', unit: 'A' },
              { label: 'Sensor 3 Power', field: 'internal_power_three', unit: 'W' },
              { label: 'Sensor 3 Current', field: 'internal_current_three', unit: 'A' },
            ]}
          />
        </div>
      </section>

      <section className="overview-report-section" aria-labelledby={`${deviceId}-configuration-title`}>
        <div className="overview-section-heading">
          <span className="overview-section-kicker">Device context</span>
          <h2 id={`${deviceId}-configuration-title`} className="overview-section-title">Configuration and identity</h2>
        </div>
        <div className="detail-grid overview-detail-grid overview-detail-grid--context">
          <InfoTable title="Mode and Limits" icon={ShieldCheck} rows={modeRows} />
          <InfoTable title="Identity" icon={Info} rows={identityRows} />
          <InfoTable title="AC Sensor Pairing" icon={Cpu} rows={internalBusRows} />
        </div>
      </section>

      {statusFlags.length > 0 ? (
        <SectionPanel title="Switchboard" icon={Bluetooth}>
          <div className="switchboard-grid">
            {statusFlags.map((flag) => (
              <div key={flag.label} className="switchboard-item">
                <span className="switchboard-item-label">{flag.label}</span>
                <BoolBadge value={flag.value} />
              </div>
            ))}
          </div>
        </SectionPanel>
      ) : null}
    </section>
  );
}

export default function Overview() {
  const wsState = useWsStore((s) => s.state);
  const setRouteSignal = useShellStore((s) => s.setRouteSignal);
  const resetRouteSignal = useShellStore((s) => s.resetRouteSignal);
  const showFreshness = useAppSettingsStore((s) => s.dashboard.showFreshness);

  // Telemetry state for loading/offline/stale detection
  const { isLoading, isOffline, isStale, staleSeverity, reconnect, devices } = useTelemetryState();

  // Stale indicator - show above content when data is aging/stale
  const showStaleIndicator = isStale && staleSeverity;

  const primaryState = devices[0] ? wsState[devices[0]] : null;
  const primaryBattery = primaryState ? getNumber(primaryState, 'total_battery_percent') : null;

  useEffect(() => {
    const value = primaryBattery === null ? '-- reserve' : `${formatNumber(primaryBattery)}% reserve`;
    setRouteSignal('overview', value);

    return () => {
      resetRouteSignal('overview');
    };
  }, [primaryBattery, resetRouteSignal, setRouteSignal]);

  // Show loading skeleton on initial load
  if (isLoading) {
    return (
      <div className="overview-page animate-fade-in">
        <SkeletonCard lines={8} />
        <SkeletonCard lines={5} />
      </div>
    );
  }

  return (
    <div className="overview-page animate-fade-in">
      {/* Stale data indicator */}
      {showFreshness && showStaleIndicator && (
        <div className="stale-indicator" data-severity={staleSeverity!}>
          <RefreshCw size={12} />
          <span>{staleSeverity === 'stale' ? 'Data stale' : 'Data aging'}</span>
        </div>
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

      {devices.length === 0 ? (
        <EmptyState
          title="Waiting for live data"
          description="Start `bluetti-mqtt`, confirm the broker connection, and this dashboard will begin filling in automatically."
        />
      ) : (
        devices.map((deviceId) => (
          <DeviceOverview
            key={deviceId}
            deviceId={deviceId}
            state={wsState[deviceId]}
          />
        ))
      )}
    </div>
  );
}
