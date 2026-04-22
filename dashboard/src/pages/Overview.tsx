import { useEffect } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
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
import { BoolBadge, Card, SectionPanel, MetricTile, InfoRow, StatusChip, EmptyState, StatHelpTooltip, type StatHelpContent } from '../components/ui';
import { SkeletonCard } from '../components/SkeletonCard';
import { useTelemetryState } from '../hooks/useTelemetryState';
import { formatRelativeTime } from '../lib/time';
import { BatteryEstimates } from '../components/BatteryEstimates';

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
    summary: `${label} is a direct reading from the live AC500 telemetry.`,
    dataPoints: [formatNumericFieldDetail(state, field, unit, digits)],
    calculation: [
      'Read the current field value from the selected device state.',
      `Parse it as a number and format it with${unit ? ` ${unit}` : ''} display rounding only.`,
    ],
    note,
  };
}

function latestTimestamp(state: DeviceState) {
  let latest: string | null = null;
  for (const field of Object.values(state)) {
    if (latest === null || field.ts > latest) {
      latest = field.ts;
    }
  }
  return latest;
}

function batteryTone(percent: number | null) {
  if (percent === null) return 'var(--text-dim)';
  if (percent >= 60) return 'var(--green)';
  if (percent >= 25) return 'var(--amber)';
  return 'var(--red)';
}

function describeInputMix(dcInput: number, acInput: number) {
  if (dcInput > 0 && acInput > 0) {
    return 'Solar plus grid assist are both active right now.';
  }

  if (dcInput > 0) {
    return 'Solar-side DC input is feeding the system right now.';
  }

  if (acInput > 0) {
    return 'AC shore or grid input is carrying the incoming power right now.';
  }

  return 'No meaningful incoming power is being reported right now.';
}

function describeOutputMix(acOutput: number, dcOutput: number) {
  if (acOutput > 0 && dcOutput > 0) {
    return 'The AC500 is serving both AC and DC loads.';
  }

  if (acOutput > 0) {
    return 'The current demand is mostly on the AC side.';
  }

  if (dcOutput > 0) {
    return 'The current demand is mostly on the DC side.';
  }

  return 'No active output load is being reported right now.';
}

function describeActivity(totalIn: number, totalOut: number, gridIn: number, solarIn: number) {
  if (totalIn === 0 && totalOut === 0) {
    return {
      label: 'Idle',
      description: 'The inverter is standing by without meaningful input or load.',
      tone: 'var(--text-dim)',
      icon: MoonStar,
    };
  }

  if (gridIn > 0) {
    return {
      label: 'Grid Assist',
      description: 'AC shore or grid input is active and supporting the current load.',
      tone: 'var(--blue)',
      icon: Plug,
    };
  }

  if (solarIn > 0 && totalIn >= totalOut) {
    return {
      label: 'Solar Harvest',
      description: 'DC input is covering the present demand and feeding the battery path.',
      tone: 'var(--green)',
      icon: ArrowDownRight,
    };
  }

  return {
    label: 'Supplying Load',
    description: 'The AC500 is discharging to support connected loads.',
    tone: 'var(--amber)',
    icon: ArrowUpRight,
  };
}

function modelName(state: DeviceState, deviceId: string) {
  return getText(state, 'device_type') ?? deviceId.split('-')[0] ?? deviceId;
}

function deviceSerial(state: DeviceState, deviceId: string) {
  return getText(state, 'serial_number') ?? deviceId.replace(/^AC500-/, '');
}

function StatPanel({
  title,
  icon: Icon,
  items,
  state,
}: {
  title: string;
  icon: React.ElementType;
  items: StatItem[];
  state: DeviceState;
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

function Hero({ state }: { state: DeviceState }) {
  const dcInput = getNumber(state, 'dc_input_power') ?? 0;
  const acInput = getNumber(state, 'ac_input_power') ?? 0;
  const acOutput = getNumber(state, 'ac_output_power') ?? 0;
  const dcOutput = getNumber(state, 'dc_output_power') ?? 0;
  const generation = getNumber(state, 'power_generation');
  const battery = getNumber(state, 'total_battery_percent');
  const totalIn = dcInput + acInput;
  const totalOut = acOutput + dcOutput;
  const net = totalIn - totalOut;
  const mode = describeActivity(totalIn, totalOut, acInput, dcInput);
  const ModeIcon = mode.icon;
  const batteryDigits = 0;
  const powerDigits = 0;

  const inputSummary = describeInputMix(dcInput, acInput);
  const outputSummary = describeOutputMix(acOutput, dcOutput);
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
    <Card className="hero-card">
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="hero-kicker">AC500 Live Snapshot</div>
          <div className="hero-mode-row">
            <div className="hero-mode-pill" style={{ color: mode.tone, borderColor: mode.tone }}>
              <ModeIcon size={16} />
              <span>{mode.label}</span>
            </div>
            <div className="hero-mode-text">{mode.description}</div>
          </div>

          <div className="hero-battery">
            <div className="hero-battery-top">
              <div className="hero-battery-label">
                <Battery size={18} />
                <span>Battery Reserve</span>
                <StatHelpTooltip
                  label="Battery Reserve"
                  content={{
                    summary: 'This is the current battery state of charge shown in the hero card.',
                    dataPoints: [
                      formatNumericFieldDetail(state, 'total_battery_percent', '%', batteryDigits),
                    ],
                    calculation: [
                      'Read total_battery_percent from the live device state.',
                      'Display the current percentage and use the same value to size the battery bar.',
                    ],
                    note: 'If the field is missing, the hero falls back to an empty display.',
                  }}
                />
              </div>
              <div className="hero-battery-value" style={{ color: batteryTone(battery) }}>
                {battery === null ? '--' : `${formatNumber(battery)}%`}
              </div>
            </div>
            <div className="hero-battery-bar">
              <div
                className="hero-battery-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, battery ?? 0))}%`,
                  background: batteryTone(battery),
                }}
              />
            </div>
            <div className="hero-battery-foot">
              <span>Net balance</span>
              <StatHelpTooltip
                label="Net Balance"
                content={{
                  summary: 'Net balance compares live input power against live output power.',
                  dataPoints: [
                    formatNumericFieldDetail(state, 'dc_input_power', 'W', powerDigits),
                    formatNumericFieldDetail(state, 'ac_input_power', 'W', powerDigits),
                    formatNumericFieldDetail(state, 'ac_output_power', 'W', powerDigits),
                    formatNumericFieldDetail(state, 'dc_output_power', 'W', powerDigits),
                  ],
                  calculation: [
                    'totalIn = dc_input_power + ac_input_power',
                    'totalOut = ac_output_power + dc_output_power',
                    'net balance = totalIn - totalOut',
                  ],
                  note: 'Positive means charging headroom. Negative means the battery is supporting load.',
                }}
              />
              <strong style={{ color: net >= 0 ? 'var(--green)' : 'var(--amber)' }}>
                {net >= 0 ? '+' : ''}
                {formatNumber(net)} W
              </strong>
            </div>

            <BatteryEstimates state={state} />
          </div>
        </div>

        <div className="power-flow-panel">
          <div className="power-node input">
            <div className="power-node-head">
              <div className="power-node-label">
                <Sun size={16} />
                Input
                <StatHelpTooltip
                  label="Input"
                  content={{
                    summary: 'Input is the live power entering the AC500 from DC and AC sources.',
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
              <span className="power-node-kicker">Source side</span>
            </div>
            <div className="power-node-total">{formatNumber(totalIn)} W</div>
            <div className="power-node-note">{inputStatus}</div>
            <div className="power-node-split">
              <span>DC input</span>
              <strong>{formatNumber(dcInput)} W</strong>
            </div>
            <div className="power-node-split">
              <span>AC input</span>
              <strong>{formatNumber(acInput)} W</strong>
            </div>
            <div className="power-node-foot">
              <span>{generation !== null ? `Generated ${formatNumber(generation, 1)} kWh` : inputSummary}</span>
            </div>
          </div>

          <div className="power-flow-arrow">
            <ArrowRight size={24} />
          </div>

          <div className="power-node output">
            <div className="power-node-head">
              <div className="power-node-label">
                <Plug size={16} />
                Output
                <StatHelpTooltip
                  label="Output"
                  content={{
                    summary: 'Output is the live load the AC500 is serving right now.',
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
              <span className="power-node-kicker">Load side</span>
            </div>
            <div className="power-node-total">{formatNumber(totalOut)} W</div>
            <div className="power-node-note">{outputStatus}</div>
            <div className="power-node-split">
              <span>AC load</span>
              <strong>{formatNumber(acOutput)} W</strong>
            </div>
            <div className="power-node-split">
              <span>DC load</span>
              <strong>{formatNumber(dcOutput)} W</strong>
            </div>
            <div className="power-node-foot">
              <span>{outputSummary}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Ac500Overview({ deviceId, state, connected }: { deviceId: string; state: DeviceState; connected: boolean }) {
  const latest = latestTimestamp(state);
  const model = modelName(state, deviceId);
  const serial = deviceSerial(state, deviceId);
  const firmware = [getText(state, 'arm_version'), getText(state, 'dsp_version')].filter(Boolean).join(' / ');
  const outputMode = getText(state, 'ac_output_mode');
  const upsMode = getText(state, 'ups_mode');
  const sleepMode = getText(state, 'auto_sleep_mode');
  const splitMode = getText(state, 'split_phase_machine_mode');
  const batteryRangeStart = getNumber(state, 'battery_range_start');
  const batteryRangeEnd = getNumber(state, 'battery_range_end');
  const selectedPack = getNumber(state, 'pack_num');
  const packCount = getNumber(state, 'pack_num_max');

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
        summary: 'AC Output Mode shows the inverter mode text currently reported by the AC500.',
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
    {
      label: 'Selected Pack',
      value: selectedPack !== null ? `Pack ${selectedPack}` : null,
      detail: packCount !== null ? `${packCount} pack slots reported` : null,
      accent: 'var(--cat-system)',
      tooltip: {
        summary: 'Selected Pack shows the currently addressed battery pack slot plus the reported slot count.',
        dataPoints: [
          formatNumericFieldDetail(state, 'pack_num'),
          formatNumericFieldDetail(state, 'pack_num_max'),
        ],
        calculation: [
          'Read pack_num as the active pack identifier.',
          'Read pack_num_max and show it as detail when the device reports available slots.',
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
    ...(selectedPack !== null ? [{ label: 'Current Pack', value: String(selectedPack) }] : []),
  ];

  const internalBusRows = [
    hasField(state, 'internal_power_one') || hasField(state, 'internal_current_one')
      ? {
          label: 'Channel One',
          value: `${formatMetric(getNumber(state, 'internal_power_one'), ' W') ?? '--'} / ${formatMetric(getNumber(state, 'internal_current_one'), ' A', 1) ?? '--'}`,
        }
      : null,
    hasField(state, 'internal_power_two') || hasField(state, 'internal_current_two')
      ? {
          label: 'Channel Two',
          value: `${formatMetric(getNumber(state, 'internal_power_two'), ' W') ?? '--'} / ${formatMetric(getNumber(state, 'internal_current_two'), ' A', 1) ?? '--'}`,
        }
      : null,
    hasField(state, 'internal_power_three') || hasField(state, 'internal_current_three')
      ? {
          label: 'Channel Three',
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
            Built around the AC500 field set this app actually receives: input, output, internal bus, mode, and identity data.
          </div>
        </div>

        <div className="device-status-strip">
          <StatusChip
            label={connected ? 'Live telemetry stream' : 'Stream offline'}
            variant={connected ? 'active' : 'error'}
          />
          {latest ? <div className="device-status-time">Updated {formatRelativeTime(latest)}</div> : null}
        </div>
      </div>

      <Hero state={state} />

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

      <div className="detail-grid">
        <StatPanel
          title="Input Bus"
          icon={Sun}
          state={state}
          items={[
            { label: 'DC Input', field: 'dc_input_power', unit: 'W', accent: 'var(--cat-input)' },
            { label: 'AC Input', field: 'ac_input_power', unit: 'W', accent: 'var(--cat-input)' },
            { label: 'AC Voltage', field: 'ac_input_voltage', unit: 'V' },
            { label: 'AC Frequency', field: 'ac_input_frequency', unit: 'Hz' },
            { label: 'DC Voltage', field: 'internal_dc_input_voltage', unit: 'V' },
            { label: 'DC Current', field: 'internal_dc_input_current', unit: 'A' },
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
          title="Internal Channels"
          icon={Zap}
          state={state}
          items={[
            { label: 'Power One', field: 'internal_power_one', unit: 'W' },
            { label: 'Current One', field: 'internal_current_one', unit: 'A' },
            { label: 'Power Two', field: 'internal_power_two', unit: 'W' },
            { label: 'Current Two', field: 'internal_current_two', unit: 'A' },
            { label: 'Power Three', field: 'internal_power_three', unit: 'W' },
            { label: 'Current Three', field: 'internal_current_three', unit: 'A' },
          ]}
        />

        <InfoTable title="Mode and Limits" icon={ShieldCheck} rows={modeRows} />
        <InfoTable title="Identity" icon={Info} rows={identityRows} />
        <InfoTable title="Internal Bus Pairing" icon={Cpu} rows={internalBusRows} />
      </div>

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
  const connected = useWsStore((s) => s.connected);
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
          <Ac500Overview
            key={deviceId}
            deviceId={deviceId}
            state={wsState[deviceId]}
            connected={connected}
          />
        ))
      )}
    </div>
  );
}
