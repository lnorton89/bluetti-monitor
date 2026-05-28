import { Wifi, WifiOff } from 'lucide-react';

export function StatusPill({ active, label }: { active: boolean; label: string }) {
  const Icon = active ? Wifi : WifiOff;
  return (
    <span className={active ? 'status-pill active' : 'status-pill'}>
      <Icon size={15} />
      {label}
    </span>
  );
}
