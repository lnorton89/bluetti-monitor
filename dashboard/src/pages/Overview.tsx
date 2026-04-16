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
  ShieldCheck,
  Split,
  Sun,
  Wifi,
  Zap,
} from 'lucide-react';
import { useWsStore } from '../store/ws';
import { BoolBadge, Card } from '../components/ui';
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

function getBool(state: DeviceState, field: string) {
  const value = getText(state, field);
  if (value === null) return null;
  return value === 'True' || value === 'true' || value === '1' || value === 'ON';
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

function SummaryCard({
  label,
  value,
  detail,
  accent = 'var(--text)',
}: {
  label: string;
  value: string;
  detail?: string | null;
  accent?: string;
}) {
  return (
    <Card className="summary-card">
      <div className="summary-card-label">
        <span>{label}</span>
      </div>
      <div className="summary-card-value" style={{ color: accent }}>
        {value}
      </div>
      {detail ? <div className="summary-card-detail">{detail}</div> : null}
    </Card>
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
    <Card className="info-panel">
      <div className="info-panel-header">
        <div className="info-panel-title">
          <Icon size={16} />
          <span>{title}</span>
        </div>
      </div>
        <div className="info-table">
          {rows.map((row) => (
            <div key={row.label} className="info-row">
              <span className="info-row-label">{row.label}</span>
              <strong className="info-row-value">{row.value}</strong>
            </div>
          ))}
        </div>
    </Card>
  );
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
      };
    })
    .filter((item): item is StatItem & { value: string } => item !== null);

  if (resolved.length === 0) return null;

  return (
    <Card className="info-panel">
      <div className="info-panel-header">
        <div className="info-panel-title">
          <Icon size={16} />
          <span>{title}</span>
        </div>
      </div>
      <div className="stat-grid">
        {resolved.map((item) => (
          <div key={item.field} className="stat-tile">
            <span className="stat-tile-label">{item.label}</span>
            <strong className="stat-tile-value" style={{ color: item.accent ?? 'var(--text)' }}>{item.value}</strong>
          </div>
        ))}
      </div>
    </Card>
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

  const statusChips = [
    { label: 'AC Output', value: getBool(state, 'ac_output_on') },
    { label: 'DC Output', value: getBool(state, 'dc_output_on') },
    { label: 'Grid Charge', value: getBool(state, 'grid_charge_on') },
    { label: 'Bluetooth', value: getBool(state, 'bluetooth_connected') },
  ].filter((item) => item.value !== null);

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
              <strong style={{ color: net >= 0 ? 'var(--green)' : 'var(--amber)' }}>
                {net >= 0 ? '+' : ''}
                {formatNumber(net)} W
              </strong>
            </div>

            <BatteryEstimates state={state} />
          </div>

          {statusChips.length > 0 ? (
            <div className="mode-chip-row">
              {statusChips.map((chip) => (
                <div
                  key={chip.label}
                  className="mode-chip"
                  data-on={chip.value ? 'true' : 'false'}
                >
                  <span className="mode-chip-label">{chip.label}</span>
                  <strong>{chip.value ? 'On' : 'Off'}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="power-flow-panel">
          <div className="power-node input">
            <div className="power-node-label">
              <Sun size={16} />
              Input
            </div>
            <div className="power-node-total">{formatNumber(totalIn)} W</div>
            <div className="power-node-split">
              <span>DC input</span>
              <strong>{formatNumber(dcInput)} W</strong>
            </div>
            <div className="power-node-split">
              <span>AC input</span>
              <strong>{formatNumber(acInput)} W</strong>
            </div>
            {generation !== null ? (
              <div className="power-node-split">
              <span>Generated energy</span>
              <strong>{formatNumber(generation, 1)} kWh</strong>
              </div>
            ) : null}
          </div>

          <div className="power-flow-arrow">
            <ArrowRight size={24} />
          </div>

          <div className="power-node battery">
            <div className="power-node-label">
              <Battery size={16} />
              Reserve
            </div>
            <div className="power-node-total">
              {battery === null ? '--' : `${formatNumber(battery)}%`}
            </div>
            <div className="power-node-split">
              <span>Battery path</span>
              <strong>{net >= 0 ? 'Charging' : 'Discharging'}</strong>
            </div>
            <div className="power-node-split">
              <span>Net</span>
              <strong>{net >= 0 ? '+' : ''}{formatNumber(net)} W</strong>
            </div>
          </div>

          <div className="power-flow-arrow">
            <ArrowRight size={24} />
          </div>

          <div className="power-node output">
            <div className="power-node-label">
              <Plug size={16} />
              Output
            </div>
            <div className="power-node-total">{formatNumber(totalOut)} W</div>
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
    },
    {
      label: 'Generated Energy',
      value: formatMetric(getNumber(state, 'power_generation'), ' kWh', 1),
      detail: 'Cumulative solar generation',
      accent: 'var(--cat-input)',
    },
    {
      label: 'AC Output Mode',
      value: outputMode,
      detail: upsMode ? `UPS ${upsMode}` : null,
      accent: 'var(--cat-output)',
    },
    {
      label: 'Battery Window',
      value: batteryRangeStart !== null && batteryRangeEnd !== null ? `${batteryRangeStart}% - ${batteryRangeEnd}%` : null,
      detail: 'Configured charge band',
      accent: 'var(--cat-battery)',
    },
    {
      label: 'Selected Pack',
      value: selectedPack !== null ? `Pack ${selectedPack}` : null,
      detail: packCount !== null ? `${packCount} pack slots reported` : null,
      accent: 'var(--cat-system)',
    },
  ].filter((item): item is { label: string; value: string; detail: string | null; accent: string } => Boolean(item.value));

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
          <div className="device-status-pill" data-online={connected ? 'true' : 'false'}>
            <span className="device-status-dot" />
            <span>{connected ? 'Live telemetry stream' : 'Stream offline'}</span>
          </div>
          {latest ? <div className="device-status-time">Updated {formatRelativeTime(latest)}</div> : null}
        </div>
      </div>

      <Hero state={state} />

      <div className="summary-grid">
        {topCards.map((card) => (
          <SummaryCard
            key={card.label}
            label={card.label}
            value={card.value}
            detail={card.detail}
            accent={card.accent}
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
        <Card className="status-board-card">
          <div className="info-panel-header">
            <div className="info-panel-title">
              <Bluetooth size={16} />
              <span>Switchboard</span>
            </div>
          </div>
          <div className="switchboard-grid">
            {statusFlags.map((flag) => (
              <div key={flag.label} className="switchboard-item">
                <span className="switchboard-item-label">{flag.label}</span>
                <BoolBadge value={flag.value} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {(hasField(state, '_raw') || hasField(state, 'split_phase_machine_mode')) ? (
        <Card className="ac500-note-card">
          <div className="ac500-note-header">
            <Split size={16} />
            <span>Why This Layout Changed</span>
          </div>
          <p>
            This overview is now based on the AC500’s real telemetry footprint in your stack. It focuses on the fields the device actually publishes here:
            power flow, internal electrical channels, operating modes, charge window, firmware, and connection state.
          </p>
        </Card>
      ) : null}
    </section>
  );
}

export default function Overview() {
  const wsState = useWsStore((s) => s.state);
  const connected = useWsStore((s) => s.connected);
  const devices = Object.keys(wsState);

  if (devices.length === 0) {
    return (
      <div className="empty-state-card">
        <div className="empty-state-title">Waiting for live data</div>
        <div className="empty-state-copy">
          Start `bluetti-mqtt`, confirm the broker connection, and this dashboard will begin filling in automatically.
        </div>
      </div>
    );
  }

  return (
    <div className="overview-page animate-fade-in">
      {devices.map((deviceId) => (
        <Ac500Overview
          key={deviceId}
          deviceId={deviceId}
          state={wsState[deviceId]}
          connected={connected}
        />
      ))}
    </div>
  );
}
