import type { LucideIcon } from 'lucide-react';
import { Activity, LayoutDashboard, Settings2, Table2, Zap } from 'lucide-react';

export type AppRouteId = 'overview' | 'charts' | 'solar' | 'raw' | 'settings';

export interface AppRouteMeta {
  id: AppRouteId;
  path: '/' | '/charts' | '/solar' | '/raw' | '/settings';
  label: string;
  shellTitle: string;
  mobileSignalLabel: string;
  kicker: string;
  heroTitle: string;
  summary: string;
  icon: LucideIcon;
}

export const APP_ROUTES: AppRouteMeta[] = [
  {
    id: 'overview',
    path: '/',
    label: 'Overview',
    shellTitle: 'Overview',
    mobileSignalLabel: 'Battery',
    kicker: 'Desktop monitor',
    heroTitle: 'Bluetti power station monitor',
    summary: 'Track live battery, input, output, and mode state in a single workspace shaped around the real telemetry this stack actually receives.',
    icon: LayoutDashboard,
  },
  {
    id: 'charts',
    path: '/charts',
    label: 'Charts',
    shellTitle: 'Charts',
    mobileSignalLabel: 'Window',
    kicker: 'Historical trends',
    heroTitle: 'Power and telemetry charts',
    summary: 'Build focused comparisons across the live device fields that matter, then zoom in on how load, charging, and system behavior change over time.',
    icon: Activity,
  },
  {
    id: 'solar',
    path: '/solar',
    label: 'Solar',
    shellTitle: 'Solar',
    mobileSignalLabel: 'Solar',
    kicker: 'Solar workspace',
    heroTitle: 'Solar generation and charge tracking',
    summary: 'Monitor both PV inputs, harvest history, and battery charge progress in a dedicated workspace shaped around the telemetry already available in this stack.',
    icon: Zap,
  },
  {
    id: 'raw',
    path: '/raw',
    label: 'Raw Data',
    shellTitle: 'Raw Data',
    mobileSignalLabel: 'Fields',
    kicker: 'Field inventory',
    heroTitle: 'Raw device data explorer',
    summary: 'Inspect the live field footprint exactly as the stack receives it, with search and category grouping tuned for troubleshooting and trust.',
    icon: Table2,
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Settings',
    shellTitle: 'Settings',
    mobileSignalLabel: 'Prefs',
    kicker: 'App preferences',
    heroTitle: 'Settings and preferences',
    summary: 'Manage app-owned preferences like theme, alerts, and dashboard behavior without confusing them with live device telemetry or unsupported device controls.',
    icon: Settings2,
  },
];

export function getRouteMeta(pathname: string): AppRouteMeta {
  return APP_ROUTES.find((route) => route.path === pathname) ?? APP_ROUTES[0];
}
