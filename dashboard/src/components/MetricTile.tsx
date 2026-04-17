import React from 'react';

export interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
  detail?: string;
  icon?: React.ElementType;
  className?: string;
}

/**
 * MetricTile — single stat tile for tile grids: label + value + optional accent/detail.
 * Replaces .stat-tile, .summary-card in metric context, analytics-score tiles.
 */
export function MetricTile({ label, value, unit, accent, detail, icon: Icon, className = '' }: MetricTileProps) {
  return (
    <div className={`metric-tile ${className}`}>
      <span className="metric-label">
        {Icon && <Icon size={12} style={{ marginRight: 6, color: 'var(--text-muted)' }} />}
        {label}
      </span>
      <span className="metric-value" style={accent ? { color: accent } : undefined}>
        {value}
        {unit && <span style={{ fontFamily: 'var(--font-cond)', fontSize: 14, color: 'var(--text-dim)', marginLeft: 4 }}>{unit}</span>}
      </span>
      {detail && <div className="metric-detail">{detail}</div>}
    </div>
  );
}
