import { startTransition, useId } from 'react';
import { Eye, Maximize2, Minimize2, Moon, RefreshCw, Settings, Sun } from 'lucide-react';
import { IS_STATIC_ANALYTICS } from '../lib/api';
import { CUSTOM_RANGE_ID, RANGE_PRESETS, type RangeId } from '../lib/analytics';
import { COMPARISON_OPTIONS, type AnalyticsDensity, type AnalyticsTheme, type ComparisonOption } from '../lib/constants';

export function ControlsBand({
  datePickerOpen,
  comparisonOption,
  densityMode,
  devices,
  historyQueryRefetch,
  liveConnected,
  rangeId,
  selectedDevice,
  themeMode,
  onComparisonChange,
  onDensityChange,
  onDeviceChange,
  onRangeChange,
  onSettingsOpen,
  onThemeChange,
}: {
  datePickerOpen: boolean;
  comparisonOption: ComparisonOption;
  densityMode: AnalyticsDensity;
  devices: string[];
  historyQueryRefetch: () => void;
  liveConnected: boolean;
  rangeId: RangeId;
  selectedDevice: string;
  themeMode: AnalyticsTheme;
  onComparisonChange: (option: ComparisonOption) => void;
  onDensityChange: (density: AnalyticsDensity) => void;
  onDeviceChange: (device: string) => void;
  onRangeChange: (rangeId: RangeId) => void;
  onSettingsOpen: () => void;
  onThemeChange: (theme: AnalyticsTheme) => void;
}) {
  const compareSelectId = useId();
  const isComparing = comparisonOption !== 'none';
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
        <button
          type="button"
          className={rangeId === CUSTOM_RANGE_ID || datePickerOpen ? 'active' : ''}
          onClick={() => startTransition(() => onRangeChange(CUSTOM_RANGE_ID))}
        >
          Custom
        </button>
      </div>
      <label className="control-field compare-select">
        <span className="sr-only">Compare with</span>
        <Eye size={14} className="compare-icon" />
        <select
          id={compareSelectId}
          value={comparisonOption}
          onChange={(event) => onComparisonChange(event.target.value as ComparisonOption)}
        >
          {COMPARISON_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        {isComparing ? <span className="compare-badge">Comparing</span> : null}
      </label>
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
