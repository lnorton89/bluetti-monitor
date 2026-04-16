import type { LucideIcon } from 'lucide-react';
import { Activity, LayoutDashboard, Table2, Zap } from 'lucide-react';

export type AppRouteId = 'overview' | 'charts' | 'solar' | 'raw';

export interface AppRouteMeta {
  id: AppRouteId;
  path: '/' | '/charts' | '/solar' | '/raw';
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
    heroTitle: 'AC500 power station monitor',
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
    summary: 'Build focused comparisons across the AC500 fields that matter, then zoom in on how load, charging, and system behavior change over time.',
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
    summary: 'Monitor both PV inputs, harvest history, and battery charge progress in a dedicated workspace shaped around the AC500 telemetry already available in this stack.',
    icon: Zap,
  },
  {
    id: 'raw',
    path: '/raw',
    label: 'Raw Data',
    shellTitle: 'Raw Data',
    mobileSignalLabel: 'Fields',
    kicker: 'Field inventory',
    heroTitle: 'Raw AC500 data explorer',
    summary: 'Inspect the live field footprint exactly as the stack receives it, with search and category grouping tuned for troubleshooting and trust.',
    icon: Table2,
  },
];

export function getRouteMeta(pathname: string): AppRouteMeta {
  return APP_ROUTES.find((route) => route.path === pathname) ?? APP_ROUTES[0];
}
