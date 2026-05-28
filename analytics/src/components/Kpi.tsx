import type { Gauge } from 'lucide-react';
import type { CSSProperties } from 'react';

export function Kpi({
  accent,
  icon: Icon,
  label,
  value,
  detail,
  tone = 'default',
}: {
  accent?: string;
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'good' | 'warn' | 'sun' | 'battery';
}) {
  return (
    <article className={`kpi ${tone}`} style={accent ? { '--kpi-title-color': accent } as CSSProperties : undefined}>
      <div className="kpi-topline">
        <span>{label}</span>
        <div className="kpi-icon"><Icon size={16} /></div>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
