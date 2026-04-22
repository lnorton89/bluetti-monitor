import { useEffect } from 'react';
import { BellRing, LaptopMinimal, Moon, Paintbrush, Settings2, ShieldCheck, Sun, Waves, Wifi } from 'lucide-react';
import { InfoRow, PageHeader, SectionPanel, StatusChip } from '../components/ui';
import { useBatteryFullNotifications } from '../lib/notifications';
import { RANGE_PRESETS } from '../lib/shared-controls';
import { useShellStore } from '../store/shell';
import { useWsStore } from '../store/ws';
import { getEffectiveTheme, type ThemePreference, useAppSettingsStore } from '../store/settings';

const THEME_OPTIONS: Array<{
  description: string;
  icon: typeof LaptopMinimal;
  label: string;
  value: ThemePreference;
}> = [
  {
    value: 'system',
    label: 'System',
    description: 'Match your OS color preference and follow it automatically.',
    icon: LaptopMinimal,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Keep the darker control-room theme regardless of system mode.',
    icon: Moon,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Use the brighter workspace theme across the dashboard shell.',
    icon: Sun,
  },
];

function ToggleRow({
  checked,
  description,
  disabled = false,
  impact,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  impact: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`settings-toggle-row${disabled ? ' is-disabled' : ''}`}>
      <div className="settings-toggle-copy">
        <div className="settings-toggle-top">
          <span className="settings-toggle-label">{label}</span>
          <span className="settings-impact-pill">{impact}</span>
        </div>
        <p className="settings-toggle-description">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`settings-switch${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-switch-thumb" />
      </button>
    </label>
  );
}

export default function Settings() {
  const wsState = useWsStore((s) => s.state);
  const setRouteSignal = useShellStore((s) => s.setRouteSignal);
  const resetRouteSignal = useShellStore((s) => s.resetRouteSignal);

  const themeMode = useAppSettingsStore((s) => s.appearance.themeMode);
  const batteryFullBrowser = useAppSettingsStore((s) => s.alerts.batteryFullBrowser);
  const batteryFullDesktop = useAppSettingsStore((s) => s.alerts.batteryFullDesktop);
  const defaultAnalyticsWindow = useAppSettingsStore((s) => s.dashboard.defaultAnalyticsWindow);
  const showFreshness = useAppSettingsStore((s) => s.dashboard.showFreshness);
  const setThemeMode = useAppSettingsStore((s) => s.setThemeMode);
  const setBatteryFullBrowser = useAppSettingsStore((s) => s.setBatteryFullBrowser);
  const setBatteryFullDesktop = useAppSettingsStore((s) => s.setBatteryFullDesktop);
  const setDefaultAnalyticsWindow = useAppSettingsStore((s) => s.setDefaultAnalyticsWindow);
  const setShowFreshness = useAppSettingsStore((s) => s.setShowFreshness);

  const {
    browserNotificationPermission,
    desktopNotificationsAvailable,
    requestBrowserNotifications,
  } = useBatteryFullNotifications(wsState);

  const effectiveTheme = getEffectiveTheme(themeMode);
  const browserPermissionLabel = browserNotificationPermission === 'granted'
    ? 'Allowed'
    : browserNotificationPermission === 'denied'
      ? 'Blocked in browser'
      : browserNotificationPermission === 'default'
        ? 'Not requested yet'
        : 'Unsupported here';

  useEffect(() => {
    setRouteSignal('settings', `${themeMode} theme`);

    return () => {
      resetRouteSignal('settings');
    };
  }, [resetRouteSignal, setRouteSignal, themeMode]);

  return (
    <div className="overview-page animate-fade-in settings-page">
      <PageHeader
        kicker="App preferences"
        title="Settings and preferences"
        icon={Settings2}
        description="This page configures app-owned behavior like theme, alerts, and dashboard presentation. It does not change live AC500 hardware state or invent unsupported device controls."
        meta={(
          <div className="workspace-panel-meta">
            <span><Paintbrush size={14} /> {effectiveTheme} theme live</span>
            <span><BellRing size={14} /> battery-full alerts</span>
          </div>
        )}
      />

      <SectionPanel
        title="Preference scope"
        icon={ShieldCheck}
        kicker="Ownership boundary"
      >
        <div className="settings-scope-grid">
          <div className="settings-scope-card">
            <div className="settings-scope-title">Configurable here</div>
            <p className="settings-scope-copy">
              Visual theme, notification delivery, and dashboard presentation rules that belong to this app.
            </p>
          </div>
          <div className="settings-scope-card">
            <div className="settings-scope-title">Observed only</div>
            <p className="settings-scope-copy">
              AC500 mode, output state, charge windows, and other telemetry-reported values still come from the live device stream.
            </p>
          </div>
        </div>
      </SectionPanel>

      <div className="detail-grid">
        <SectionPanel title="Appearance" icon={Paintbrush} kicker="Immediate">
          <div className="settings-option-grid">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = themeMode === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`settings-choice-card${active ? ' is-active' : ''}`}
                  onClick={() => setThemeMode(option.value)}
                >
                  <div className="settings-choice-top">
                    <div className="settings-choice-label">
                      <Icon size={16} />
                      <span>{option.label}</span>
                    </div>
                    {active ? <StatusChip label="Selected" variant="active" /> : null}
                  </div>
                  <p className="settings-choice-description">{option.description}</p>
                </button>
              );
            })}
          </div>
          <div className="settings-inline-note">
            Current effective theme: <strong>{effectiveTheme}</strong>
          </div>
        </SectionPanel>

        <SectionPanel
          title="Alerts"
          icon={BellRing}
          kicker="App-owned delivery"
          meta={<StatusChip label={browserPermissionLabel} variant={browserNotificationPermission === 'granted' ? 'active' : 'inactive'} />}
        >
          <div className="settings-stack">
            <ToggleRow
              checked={batteryFullBrowser}
              label="Battery-full browser notifications"
              description="Allow this dashboard to raise a browser notification when the battery reaches its configured charge ceiling."
              impact="Immediate"
              onChange={(checked) => setBatteryFullBrowser(checked)}
            />
            <ToggleRow
              checked={batteryFullDesktop}
              label="Battery-full desktop notifications"
              description="Send the same battery-full event through the desktop shell bridge when this app is running in the desktop shell."
              impact="Immediate"
              disabled={!desktopNotificationsAvailable}
              onChange={(checked) => setBatteryFullDesktop(checked)}
            />
            {browserNotificationPermission === 'default' ? (
              <button
                type="button"
                className="ui-control-button settings-action-button"
                onClick={() => {
                  void requestBrowserNotifications();
                }}
              >
                Request browser notification permission
              </button>
            ) : null}
            <div className="info-table">
              <InfoRow label="Browser permission" value={browserPermissionLabel} />
              <InfoRow label="Desktop bridge" value={desktopNotificationsAvailable ? 'Available in this session' : 'Not available in this browser session'} />
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Dashboard behavior" icon={Waves} kicker="Immediate">
          <div className="settings-stack">
            <div className="settings-control-block">
              <div className="settings-toggle-top">
                <div>
                  <span className="settings-toggle-label">Default analytics window</span>
                  <p className="settings-toggle-description">
                    Choose the time window Charts and Solar should start with when you open them. You can still switch windows on each page whenever you need a different view.
                  </p>
                </div>
                <span className="settings-impact-pill">Persists</span>
              </div>
              <div className="settings-segmented" role="radiogroup" aria-label="Default analytics window">
                {RANGE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={defaultAnalyticsWindow === preset.id}
                    className={`settings-segmented-button${defaultAnalyticsWindow === preset.id ? ' is-active' : ''}`}
                    onClick={() => setDefaultAnalyticsWindow(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <ToggleRow
              checked={showFreshness}
              label="Telemetry freshness cues"
              description="Show the shell timestamp and stale-data warnings so it is obvious when the live stream is aging or offline across the dashboard views."
              impact="Immediate"
              onChange={(checked) => setShowFreshness(checked)}
            />
            <div className="info-table">
              <InfoRow label="Analytics default" value={`Charts and Solar start at ${RANGE_PRESETS.find((preset) => preset.id === defaultAnalyticsWindow)?.label ?? '24H'}`} />
              <InfoRow label="Affects" value="Top bar freshness stamp plus stale banners on Overview, Charts, Solar, and Raw Data" />
              <InfoRow label="Does not affect" value="Actual device polling or MQTT/API timing" />
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Live telemetry boundary" icon={Wifi} kicker="Not configurable here">
          <div className="info-table">
            <InfoRow label="Charge ceilings" value="Observed from AC500 telemetry" />
            <InfoRow label="Output and switch state" value="Observed from AC500 telemetry" />
            <InfoRow label="Input and output power" value="Observed from AC500 telemetry" />
            <InfoRow label="Firmware and pack identity" value="Observed from AC500 telemetry" />
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
