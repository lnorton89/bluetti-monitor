import { create } from 'zustand';

export type ThemePreference = 'system' | 'dark' | 'light';

export interface AppSettings {
  appearance: {
    themeMode: ThemePreference;
  };
  alerts: {
    batteryFullBrowser: boolean;
    batteryFullDesktop: boolean;
  };
  dashboard: {
    defaultAnalyticsWindow: '1h' | '6h' | '24h' | '72h';
    showFreshness: boolean;
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
  setDefaultAnalyticsWindow: (window: AppSettings['dashboard']['defaultAnalyticsWindow']) => void;
  setDesktopLogCaptureEnabled: (enabled: boolean) => void;
  setDesktopLogRetainBytes: (bytes: number) => void;
  setDesktopLogTruncateAtBytes: (bytes: number) => void;
  setShowFreshness: (enabled: boolean) => void;
}

const STORAGE_KEY = 'bluetti-monitor:settings';
const LOG_TRUNCATE_BYTES_OPTIONS = [512 * 1024, 1024 * 1024, 5 * 1024 * 1024, 10 * 1024 * 1024] as const;
const LOG_RETAIN_BYTES_OPTIONS = [128 * 1024, 256 * 1024, 512 * 1024, 1024 * 1024] as const;

const DEFAULT_SETTINGS: AppSettings = {
  appearance: {
    themeMode: 'system',
  },
  alerts: {
    batteryFullBrowser: true,
    batteryFullDesktop: true,
  },
  dashboard: {
    defaultAnalyticsWindow: '24h',
    showFreshness: true,
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

function sanitizeAnalyticsWindow(value: unknown): AppSettings['dashboard']['defaultAnalyticsWindow'] {
  return value === '1h' || value === '6h' || value === '24h' || value === '72h'
    ? value
    : DEFAULT_SETTINGS.dashboard.defaultAnalyticsWindow;
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
    },
    dashboard: {
      defaultAnalyticsWindow: sanitizeAnalyticsWindow(dashboard.defaultAnalyticsWindow),
      showFreshness: sanitizeBoolean(
        dashboard.showFreshness,
        DEFAULT_SETTINGS.dashboard.showFreshness,
      ),
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
}));

if (typeof window !== 'undefined') {
  applyTheme(initialSettings.appearance.themeMode);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { appearance } = useAppSettingsStore.getState();
    if (appearance.themeMode === 'system') {
      applyTheme('system');
    }
  });
}
