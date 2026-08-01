import { create } from 'zustand';
import { fetchAppSettings, saveAppSettingsRemote } from '../lib/api';

export type ThemePreference = 'system' | 'dark' | 'light';

export interface AppSettings {
  appearance: {
    themeMode: ThemePreference;
  };
  alerts: {
    batteryFullBrowser: boolean;
    batteryFullDesktop: boolean;
    lowBatteryBrowser: boolean;
    lowBatteryDesktop: boolean;
    lowBatteryDurationSeconds: number;
    lowBatteryEnabled: boolean;
    lowBatteryRepeatMinutes: number;
    lowBatteryThresholdPercent: number;
    lowBatteryVolume: number;
    ntfyEnabled: boolean;
    ntfyIntervalMinutes: number;
    ntfyServer: string;
    ntfyTopic: string;
  };
  dashboard: {
    defaultAnalyticsWindow: '1h' | '6h' | '24h' | '72h';
    showFreshness: boolean;
    batteryCapacityWh: number;
  };
  desktop: {
    logCaptureEnabled: boolean;
    logRetainBytes: number;
    logTruncateAtBytes: number;
  };
}

interface AppSettingsStore extends AppSettings {
  hydrated: boolean;
  setThemeMode: (themeMode: ThemePreference) => void;
  setBatteryFullBrowser: (enabled: boolean) => void;
  setBatteryFullDesktop: (enabled: boolean) => void;
  setLowBatteryBrowser: (enabled: boolean) => void;
  setLowBatteryDesktop: (enabled: boolean) => void;
  setLowBatteryDurationSeconds: (seconds: number) => void;
  setLowBatteryEnabled: (enabled: boolean) => void;
  setLowBatteryRepeatMinutes: (minutes: number) => void;
  setLowBatteryThresholdPercent: (percent: number) => void;
  setLowBatteryVolume: (volume: number) => void;
  setNtfyEnabled: (enabled: boolean) => void;
  setNtfyIntervalMinutes: (minutes: number) => void;
  setNtfyServer: (server: string) => void;
  setNtfyTopic: (topic: string) => void;
  setDefaultAnalyticsWindow: (window: AppSettings['dashboard']['defaultAnalyticsWindow']) => void;
  setDesktopLogCaptureEnabled: (enabled: boolean) => void;
  setDesktopLogRetainBytes: (bytes: number) => void;
  setDesktopLogTruncateAtBytes: (bytes: number) => void;
  setShowFreshness: (enabled: boolean) => void;
  setBatteryCapacityWh: (wh: number) => void;
}

const STORAGE_KEY = 'bluetti-monitor:settings';
export const NTFY_INTERVAL_MINUTES_OPTIONS = [5, 15, 30, 60] as const;
export const LOW_BATTERY_DURATION_SECONDS_OPTIONS = [1, 2, 3, 5] as const;
export const LOW_BATTERY_REPEAT_MINUTES_OPTIONS = [0, 5, 15, 30, 60] as const;
const LOW_BATTERY_THRESHOLD_MIN_PERCENT = 1;
const LOW_BATTERY_THRESHOLD_MAX_PERCENT = 90;
const LOG_TRUNCATE_BYTES_OPTIONS = [512 * 1024, 1024 * 1024, 5 * 1024 * 1024, 10 * 1024 * 1024] as const;
const LOG_RETAIN_BYTES_OPTIONS = [128 * 1024, 256 * 1024, 512 * 1024, 1024 * 1024] as const;

const DEFAULT_SETTINGS: AppSettings = {
  appearance: {
    themeMode: 'system',
  },
  alerts: {
    batteryFullBrowser: true,
    batteryFullDesktop: true,
    lowBatteryBrowser: true,
    lowBatteryDesktop: true,
    lowBatteryDurationSeconds: 2,
    lowBatteryEnabled: true,
    lowBatteryRepeatMinutes: 15,
    lowBatteryThresholdPercent: 20,
    lowBatteryVolume: 70,
    ntfyEnabled: false,
    ntfyIntervalMinutes: 15,
    ntfyServer: 'https://ntfy.sh',
    ntfyTopic: '',
  },
  dashboard: {
    defaultAnalyticsWindow: '24h',
    showFreshness: true,
    batteryCapacityWh: 3072,
  },
  desktop: {
    logCaptureEnabled: true,
    logRetainBytes: 256 * 1024,
    logTruncateAtBytes: 1024 * 1024,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeThemePreference(value: unknown): ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system'
    ? value
    : DEFAULT_SETTINGS.appearance.themeMode;
}

function sanitizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeNumber(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? Math.round(value)
    : fallback;
}

function sanitizeAnalyticsWindow(value: unknown): AppSettings['dashboard']['defaultAnalyticsWindow'] {
  return value === '1h' || value === '6h' || value === '24h' || value === '72h'
    ? value
    : DEFAULT_SETTINGS.dashboard.defaultAnalyticsWindow;
}

function sanitizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeNtfyServer(value: unknown, fallback = DEFAULT_SETTINGS.alerts.ntfyServer) {
  return typeof value === 'string' ? value.trim() : fallback;
}

function sanitizeNtfyIntervalMinutes(value: unknown, fallback = DEFAULT_SETTINGS.alerts.ntfyIntervalMinutes) {
  return typeof value === 'number' && NTFY_INTERVAL_MINUTES_OPTIONS.includes(
    value as typeof NTFY_INTERVAL_MINUTES_OPTIONS[number],
  )
    ? value
    : fallback;
}

function sanitizeOptionValue<T extends readonly number[]>(value: unknown, allowed: T, fallback: T[number]) {
  return typeof value === 'number' && allowed.includes(value) ? value : fallback;
}

function sanitizeSettings(candidate: unknown): AppSettings {
  if (!isRecord(candidate)) {
    return DEFAULT_SETTINGS;
  }

  const appearance = isRecord(candidate.appearance) ? candidate.appearance : {};
  const alerts = isRecord(candidate.alerts) ? candidate.alerts : {};
  const dashboard = isRecord(candidate.dashboard) ? candidate.dashboard : {};
  const desktop = isRecord(candidate.desktop) ? candidate.desktop : {};
  const batteryCapacityWh = sanitizeNumber(
    dashboard.batteryCapacityWh,
    500,
    50000,
    DEFAULT_SETTINGS.dashboard.batteryCapacityWh,
  );
  const logTruncateAtBytes = sanitizeOptionValue(
    desktop.logTruncateAtBytes,
    LOG_TRUNCATE_BYTES_OPTIONS,
    DEFAULT_SETTINGS.desktop.logTruncateAtBytes,
  );
  const logRetainBytes = Math.min(
    sanitizeOptionValue(
      desktop.logRetainBytes,
      LOG_RETAIN_BYTES_OPTIONS,
      DEFAULT_SETTINGS.desktop.logRetainBytes,
    ),
    logTruncateAtBytes,
  );

  return {
    appearance: {
      themeMode: sanitizeThemePreference(appearance.themeMode),
    },
    alerts: {
      batteryFullBrowser: sanitizeBoolean(
        alerts.batteryFullBrowser,
        DEFAULT_SETTINGS.alerts.batteryFullBrowser,
      ),
      batteryFullDesktop: sanitizeBoolean(
        alerts.batteryFullDesktop,
        DEFAULT_SETTINGS.alerts.batteryFullDesktop,
      ),
      lowBatteryBrowser: sanitizeBoolean(
        alerts.lowBatteryBrowser,
        DEFAULT_SETTINGS.alerts.lowBatteryBrowser,
      ),
      lowBatteryDesktop: sanitizeBoolean(
        alerts.lowBatteryDesktop,
        DEFAULT_SETTINGS.alerts.lowBatteryDesktop,
      ),
      lowBatteryDurationSeconds: sanitizeOptionValue(
        alerts.lowBatteryDurationSeconds,
        LOW_BATTERY_DURATION_SECONDS_OPTIONS,
        DEFAULT_SETTINGS.alerts.lowBatteryDurationSeconds,
      ),
      lowBatteryEnabled: sanitizeBoolean(
        alerts.lowBatteryEnabled,
        DEFAULT_SETTINGS.alerts.lowBatteryEnabled,
      ),
      lowBatteryRepeatMinutes: sanitizeOptionValue(
        alerts.lowBatteryRepeatMinutes,
        LOW_BATTERY_REPEAT_MINUTES_OPTIONS,
        DEFAULT_SETTINGS.alerts.lowBatteryRepeatMinutes,
      ),
      lowBatteryThresholdPercent: sanitizeNumber(
        alerts.lowBatteryThresholdPercent,
        LOW_BATTERY_THRESHOLD_MIN_PERCENT,
        LOW_BATTERY_THRESHOLD_MAX_PERCENT,
        DEFAULT_SETTINGS.alerts.lowBatteryThresholdPercent,
      ),
      lowBatteryVolume: sanitizeNumber(
        alerts.lowBatteryVolume,
        0,
        100,
        DEFAULT_SETTINGS.alerts.lowBatteryVolume,
      ),
      ntfyEnabled: sanitizeBoolean(
        alerts.ntfyEnabled,
        DEFAULT_SETTINGS.alerts.ntfyEnabled,
      ),
      ntfyIntervalMinutes: sanitizeNtfyIntervalMinutes(alerts.ntfyIntervalMinutes),
      ntfyServer: sanitizeNtfyServer(alerts.ntfyServer),
      ntfyTopic: sanitizeString(alerts.ntfyTopic),
    },
    dashboard: {
      defaultAnalyticsWindow: sanitizeAnalyticsWindow(dashboard.defaultAnalyticsWindow),
      showFreshness: sanitizeBoolean(
        dashboard.showFreshness,
        DEFAULT_SETTINGS.dashboard.showFreshness,
      ),
      batteryCapacityWh,
    },
    desktop: {
      logCaptureEnabled: sanitizeBoolean(
        desktop.logCaptureEnabled,
        DEFAULT_SETTINGS.desktop.logCaptureEnabled,
      ),
      logRetainBytes,
      logTruncateAtBytes,
    },
  };
}

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: AppSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  void saveAppSettingsRemote(settings).catch(() => {
    // Offline or API unreachable - localStorage still has this session's value.
  });
}

// The desktop shell can load this dashboard from different origins depending on how
// it was launched (e.g. the Docker-backed http://localhost:8540 vs. a local Vite dev
// server on http://127.0.0.1:5400). localStorage is scoped per-origin, so settings
// saved under one origin are invisible under another and appear to "reset" even
// though nothing was lost. The API's /settings endpoint is reachable through both
// origins' proxy config, so it's the durable, origin-independent source of truth;
// this pulls it in once at startup and reconciles it into the live store.
async function hydrateSettingsFromApi() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const remote = await fetchAppSettings();

    if (!isRecord(remote) || Object.keys(remote).length === 0) {
      return;
    }

    const sanitized = sanitizeSettings(remote);
    useAppSettingsStore.setState(sanitized);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    applyTheme(sanitized.appearance.themeMode);
  } catch {
    // Offline or API unreachable - keep whatever loadSettings() already produced.
  }
}

function toPersistedSettings(state: AppSettingsStore): AppSettings {
  return {
    appearance: state.appearance,
    alerts: state.alerts,
    dashboard: state.dashboard,
    desktop: state.desktop,
  };
}

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark' as const;
  }

  return 'light' as const;
}

export function getEffectiveTheme(themeMode: ThemePreference) {
  return themeMode === 'system' ? getSystemTheme() : themeMode;
}

function applyTheme(themeMode: ThemePreference) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('data-theme', getEffectiveTheme(themeMode));
}

const initialSettings = loadSettings();

export const useAppSettingsStore = create<AppSettingsStore>((set) => ({
  ...initialSettings,
  hydrated: true,

  setThemeMode(themeMode) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        appearance: {
          ...state.appearance,
          themeMode,
        },
      };
      persistSettings(toPersistedSettings(nextState));
      applyTheme(themeMode);
      return nextState;
    });
  },

  setBatteryFullBrowser(enabled) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          batteryFullBrowser: enabled,
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setBatteryFullDesktop(enabled) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          batteryFullDesktop: enabled,
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setLowBatteryBrowser(enabled) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          lowBatteryBrowser: enabled,
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setLowBatteryDesktop(enabled) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          lowBatteryDesktop: enabled,
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setLowBatteryDurationSeconds(seconds) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          lowBatteryDurationSeconds: sanitizeOptionValue(
            seconds,
            LOW_BATTERY_DURATION_SECONDS_OPTIONS,
            state.alerts.lowBatteryDurationSeconds,
          ),
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setLowBatteryEnabled(enabled) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          lowBatteryEnabled: enabled,
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setLowBatteryRepeatMinutes(minutes) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          lowBatteryRepeatMinutes: sanitizeOptionValue(
            minutes,
            LOW_BATTERY_REPEAT_MINUTES_OPTIONS,
            state.alerts.lowBatteryRepeatMinutes,
          ),
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setLowBatteryThresholdPercent(percent) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          lowBatteryThresholdPercent: sanitizeNumber(
            percent,
            LOW_BATTERY_THRESHOLD_MIN_PERCENT,
            LOW_BATTERY_THRESHOLD_MAX_PERCENT,
            state.alerts.lowBatteryThresholdPercent,
          ),
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setLowBatteryVolume(volume) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          lowBatteryVolume: sanitizeNumber(volume, 0, 100, state.alerts.lowBatteryVolume),
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setNtfyEnabled(enabled) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          ntfyEnabled: enabled,
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setNtfyIntervalMinutes(minutes) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          ntfyIntervalMinutes: sanitizeNtfyIntervalMinutes(minutes, state.alerts.ntfyIntervalMinutes),
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setNtfyServer(server) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          ntfyServer: sanitizeNtfyServer(server, state.alerts.ntfyServer),
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setNtfyTopic(topic) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        alerts: {
          ...state.alerts,
          ntfyTopic: sanitizeString(topic),
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setDefaultAnalyticsWindow(window) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        dashboard: {
          ...state.dashboard,
          defaultAnalyticsWindow: window,
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setDesktopLogCaptureEnabled(enabled) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        desktop: {
          ...state.desktop,
          logCaptureEnabled: enabled,
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setDesktopLogRetainBytes(bytes) {
    set((state) => {
      const sanitized = Math.min(
        sanitizeOptionValue(bytes, LOG_RETAIN_BYTES_OPTIONS, state.desktop.logRetainBytes),
        state.desktop.logTruncateAtBytes,
      );
      const nextState: AppSettingsStore = {
        ...state,
        desktop: {
          ...state.desktop,
          logRetainBytes: sanitized,
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setDesktopLogTruncateAtBytes(bytes) {
    set((state) => {
      const sanitized = sanitizeOptionValue(bytes, LOG_TRUNCATE_BYTES_OPTIONS, state.desktop.logTruncateAtBytes);
      const nextState: AppSettingsStore = {
        ...state,
        desktop: {
          ...state.desktop,
          logTruncateAtBytes: sanitized,
          logRetainBytes: Math.min(state.desktop.logRetainBytes, sanitized),
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setShowFreshness(enabled) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        dashboard: {
          ...state.dashboard,
          showFreshness: enabled,
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },

  setBatteryCapacityWh(wh) {
    set((state) => {
      const nextState: AppSettingsStore = {
        ...state,
        dashboard: {
          ...state.dashboard,
          batteryCapacityWh: sanitizeNumber(wh, 500, 50000, state.dashboard.batteryCapacityWh),
        },
      };
      persistSettings(toPersistedSettings(nextState));
      return nextState;
    });
  },
}));

if (typeof window !== 'undefined') {
  applyTheme(initialSettings.appearance.themeMode);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { appearance } = useAppSettingsStore.getState();
    if (appearance.themeMode === 'system') {
      applyTheme('system');
    }
  });

  void hydrateSettingsFromApi();
}
