export interface StatusChipProps {
  label: string;
  value?: string;
  variant?: 'default' | 'active' | 'inactive' | 'warning' | 'error' | 'info';
  className?: string;
}

const VARIANT_CLASS: Record<string, string> = {
  default: '',
  active: ' chip--active',
  inactive: ' chip--inactive',
  warning: ' chip--warning',
  error: ' chip--error',
  info: ' chip--info',
};

/**
 * StatusChip — pill-shaped indicator for status, connection, or toggle states.
 * Replaces .device-status-pill, .mode-chip[data-on], .workspace-pill.active, .stale-indicator.
 */
export function StatusChip({ label, value, variant = 'default', className = '' }: StatusChipProps) {
  return (
    <span className={`chip${VARIANT_CLASS[variant] || ''} ${className}`}>
      {label}
      {value && <strong>{value}</strong>}
    </span>
  );
}
