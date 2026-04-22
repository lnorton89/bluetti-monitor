import { getEffectiveTheme, type ThemePreference, useAppSettingsStore } from './settings';

type EffectiveTheme = 'dark' | 'light';

interface ThemeStore {
  theme: EffectiveTheme;
  themePreference: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

export function useThemeStore<T>(selector: (state: ThemeStore) => T): T {
  return useAppSettingsStore((state) => {
    const effectiveTheme = getEffectiveTheme(state.appearance.themeMode);

    return selector({
      theme: effectiveTheme,
      themePreference: state.appearance.themeMode,
      setTheme: state.setThemeMode,
      toggleTheme: () => {
        state.setThemeMode(effectiveTheme === 'dark' ? 'light' : 'dark');
      },
    });
  });
}
