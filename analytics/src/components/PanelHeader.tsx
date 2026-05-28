import type { LineChart } from 'lucide-react';
import type { ReactNode } from 'react';

export function PanelHeader({
  actions,
  icon: Icon,
  title,
  subtitle,
  loading = false,
}: {
  actions?: ReactNode;
  icon: typeof LineChart;
  title: string;
  subtitle: string;
  loading?: boolean;
}) {
  return (
    <header className="panel-header">
      <div>
        <span className="panel-icon"><Icon size={17} /></span>
        <h2>{title}</h2>
      </div>
      <div className="panel-header-side">
        <p>{loading ? 'Refreshing...' : subtitle}</p>
        {actions}
      </div>
    </header>
  );
}
