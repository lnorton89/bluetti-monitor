import { useEffect } from 'react';
import { BellRing, FileText, LaptopMinimal, Moon, Paintbrush, Settings2, Sun, Waves } from 'lucide-react';
import { PageHeader, SectionPanel, StatusChip } from '../components/ui';
import { isDesktopHostAvailable, sendToDesktopHost } from '../lib/desktop-host';
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

const LOG_TRUNCATE_OPTIONS = [
  { description: 'Trim aggressively and keep the footprint small.', label: '512 KB', value: 512 * 1024 },
  { description: 'Good default for everyday debugging sessions.', label: '1 MB', value: 1024 * 1024 },
  { description: 'Hold a longer desktop session before trimming.', label: '5 MB', value: 5 * 1024 * 1024 },
  { description: 'Use only when you want a much longer local trace.', label: '10 MB', value: 10 * 1024 * 1024 },
] as const;

const LOG_RETAIN_OPTIONS = [
  { description: 'Keep the newest short tail after a trim.', label: '128 KB', value: 128 * 1024 },
  { description: 'Balanced tail for recent context.', label: '256 KB', value: 256 * 1024 },
  { description: 'Keep more context after each trim.', label: '512 KB', value: 512 * 1024 },
  { description: 'Keep a large recent tail after trimming.', label: '1 MB', value: 1024 * 1024 },
] as const;

type DesktopLogSettingsHostMessage = {
  enabled: boolean;
  retainBytes: number;
  truncateAtBytes: number;
  type: 'desktop-log-settings';
};

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${value / (1024 * 1024)} MB`;
  }

  return `${Math.round(value / 1024)} KB`;
}

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
  const desktopHostAvailable = isDesktopHostAvailable();

  const themeMode = useAppSettingsStore((s) => s.appearance.themeMode);
  const batteryFullBrowser = useAppSettingsStore((s) => s.alerts.batteryFullBrowser);
  const batteryFullDesktop = useAppSettingsStore((s) => s.alerts.batteryFullDesktop);
  const defaultAnalyticsWindow = useAppSettingsStore((s) => s.dashboard.defaultAnalyticsWindow);
  const showFreshness = useAppSettingsStore((s) => s.dashboard.showFreshness);
  const logCaptureEnabled = useAppSettingsStore((s) => s.desktop.logCaptureEnabled);
  const logRetainBytes = useAppSettingsStore((s) => s.desktop.logRetainBytes);
  const logTruncateAtBytes = useAppSettingsStore((s) => s.desktop.logTruncateAtBytes);
  const setThemeMode = useAppSettingsStore((s) => s.setThemeMode);
  const setBatteryFullBrowser = useAppSettingsStore((s) => s.setBatteryFullBrowser);
  const setBatteryFullDesktop = useAppSettingsStore((s) => s.setBatteryFullDesktop);
  const setDefaultAnalyticsWindow = useAppSettingsStore((s) => s.setDefaultAnalyticsWindow);
  const setDesktopLogCaptureEnabled = useAppSettingsStore((s) => s.setDesktopLogCaptureEnabled);
  const setDesktopLogRetainBytes = useAppSettingsStore((s) => s.setDesktopLogRetainBytes);
  const setDesktopLogTruncateAtBytes = useAppSettingsStore((s) => s.setDesktopLogTruncateAtBytes);
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
  const desktopLogSummary = logCaptureEnabled
    ? `Trim at ${formatBytes(logTruncateAtBytes)}`
    : 'Capture disabled';

  useEffect(() => {
    setRouteSignal('settings', `${themeMode} theme - ${logCaptureEnabled ? 'log capture on' : 'log capture off'}`);

    return () => {
      resetRouteSignal('settings');
    };
  }, [logCaptureEnabled, resetRouteSignal, setRouteSignal, themeMode]);

  useEffect(() => {
    const message: DesktopLogSettingsHostMessage = {
      type: 'desktop-log-settings',
      enabled: logCaptureEnabled,
      truncateAtBytes: logTruncateAtBytes,
      retainBytes: logRetainBytes,
    };

    sendToDesktopHost(message);
  }, [logCaptureEnabled, logRetainBytes, logTruncateAtBytes]);

  return (
    <div className="overview-page animate-fade-in settings-page">
      <PageHeader
        kicker="App preferences"
        title="Settings"
        icon={Settings2}
        description="Theme, alerts, dashboard behavior, and desktop log capture."
        meta={(
          <div className="workspace-panel-meta">
            <span><Paintbrush size={14} /> {effectiveTheme} theme live</span>
            <span><BellRing size={14} /> {browserPermissionLabel}</span>
            <span><FileText size={14} /> {desktopLogSummary}</span>
          </div>
        )}
      />

      <div className="detail-grid">
        <SectionPanel
          title="Appearance"
          icon={Paintbrush}
          kicker="Immediate"
          meta={<StatusChip label={effectiveTheme} variant="active" />}
        >
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
        </SectionPanel>

        <SectionPanel
          title="Desktop shell"
          icon={FileText}
          kicker="Local diagnostics"
          meta={<StatusChip label={desktopHostAvailable ? 'Shell connected' : 'Browser only'} variant={desktopHostAvailable ? 'active' : 'inactive'} />}
        >
          <div className="settings-stack">
            <ToggleRow
              checked={logCaptureEnabled}
              label="Desktop log capture"
              description="Write desktop-shell events into the local rolling log so startup, bridge, and device-service issues are easier to inspect without letting the file grow forever."
              impact="Persists"
              onChange={(checked) => setDesktopLogCaptureEnabled(checked)}
            />

            <div className={`settings-control-block${logCaptureEnabled ? '' : ' is-disabled'}`}>
              <div className="settings-toggle-top">
                <div>
                  <span className="settings-toggle-label">Truncate when file reaches</span>
                </div>
                <span className="settings-impact-pill">Persists</span>
              </div>
              <div className="settings-choice-grid" role="radiogroup" aria-label="Desktop log truncate threshold">
                {LOG_TRUNCATE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={logTruncateAtBytes === option.value}
                    disabled={!logCaptureEnabled}
                    className={`settings-choice-card settings-choice-card--compact${logTruncateAtBytes === option.value ? ' is-active' : ''}`}
                    onClick={() => setDesktopLogTruncateAtBytes(option.value)}
                  >
                    <div className="settings-choice-top">
                      <div className="settings-choice-label">
                        <FileText size={16} />
                        <span>{option.label}</span>
                      </div>
                    </div>
                    <p className="settings-choice-description">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className={`settings-control-block${logCaptureEnabled ? '' : ' is-disabled'}`}>
              <div className="settings-toggle-top">
                <div>
                  <span className="settings-toggle-label">Keep after truncation</span>
                </div>
                <span className="settings-impact-pill">Persists</span>
              </div>
              <div className="settings-segmented" role="radiogroup" aria-label="Desktop log retained tail">
                {LOG_RETAIN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={logRetainBytes === option.value}
                    disabled={!logCaptureEnabled || option.value > logTruncateAtBytes}
                    className={`settings-segmented-button${logRetainBytes === option.value ? ' is-active' : ''}`}
                    onClick={() => setDesktopLogRetainBytes(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-footnote">
              {logCaptureEnabled
                ? `Writes to .dev-data/logs/desktop.log, trims at ${formatBytes(logTruncateAtBytes)}, and keeps ${formatBytes(logRetainBytes)} after rollover.`
                : 'Desktop log file writes are disabled.'}
            </div>
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
            <div className="settings-footnote">
              {desktopNotificationsAvailable
                ? 'Desktop bridge is available in this session.'
                : 'Desktop bridge is not attached in this browser session.'}
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          title="Dashboard behavior"
          icon={Waves}
          kicker="Immediate"
          meta={<StatusChip label={RANGE_PRESETS.find((preset) => preset.id === defaultAnalyticsWindow)?.label ?? '24H'} variant="active" />}
        >
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
            <div className="settings-footnote">
              Affects Charts, Solar, the shell freshness stamp, and stale-data cues. It does not change polling or telemetry timing.
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
