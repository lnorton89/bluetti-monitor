import { startTransition } from 'react';
import { Maximize2, Minimize2, Moon, RefreshCw, Settings, Sun } from 'lucide-react';
import { IS_STATIC_ANALYTICS } from '../lib/api';
import { RANGE_PRESETS, type RangeId } from '../lib/analytics';
import { type AnalyticsDensity, type AnalyticsTheme } from '../lib/constants';

export function ControlsBand({
  densityMode,
  devices,
  historyQueryRefetch,
  liveConnected,
  rangeId,
  selectedDevice,
  themeMode,
  onDensityChange,
  onDeviceChange,
  onRangeChange,
  onSettingsOpen,
  onThemeChange,
}: {
  densityMode: AnalyticsDensity;
  devices: string[];
  historyQueryRefetch: () => void;
  liveConnected: boolean;
  rangeId: RangeId;
  selectedDevice: string;
  themeMode: AnalyticsTheme;
  onDensityChange: (density: AnalyticsDensity) => void;
  onDeviceChange: (device: string) => void;
  onRangeChange: (rangeId: RangeId) => void;
  onSettingsOpen: () => void;
  onThemeChange: (theme: AnalyticsTheme) => void;
}) {
  return (
    <section className="controls-band">
      <label className="control-field">
        <span className="sr-only">Device</span>
        <select value={selectedDevice} onChange={(event) => onDeviceChange(event.target.value)}>
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
            className={[
              item.id === rangeId ? 'active' : '',
              item.id === rangeId && liveConnected ? 'is-live' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => startTransition(() => onRangeChange(item.id))}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button
        className="icon-button"
        type="button"
        aria-label="Refresh analytics"
        disabled={IS_STATIC_ANALYTICS}
        onClick={() => historyQueryRefetch()}
      >
        <RefreshCw size={18} />
      </button>
      <button
        className="icon-button theme-toggle-button"
        type="button"
        aria-label={themeMode === 'dark' ? 'Switch analytics to light mode' : 'Switch analytics to dark mode'}
        title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={() => onThemeChange(themeMode === 'dark' ? 'light' : 'dark')}
      >
        {themeMode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      <button
        className="icon-button compact-toggle-button"
        type="button"
        aria-label={densityMode === 'compact' ? 'Switch analytics to comfortable layout' : 'Switch analytics to compact layout'}
        aria-pressed={densityMode === 'compact'}
        title={densityMode === 'compact' ? 'Switch to comfortable layout' : 'Switch to compact layout'}
        onClick={() => onDensityChange(densityMode === 'compact' ? 'comfortable' : 'compact')}
      >
        {densityMode === 'compact' ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
      </button>
      <button
        className="icon-button"
        type="button"
        aria-label="Open analytics settings"
        onClick={onSettingsOpen}
      >
        <Settings size={18} />
      </button>
    </section>
  );
}
