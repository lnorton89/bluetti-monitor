export interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}

/**
 * InfoRow — key-value row for info tables.
 * Replaces .info-row pattern with consistent layout.
 */
export function InfoRow({ label, value, mono = true, className = '' }: InfoRowProps) {
  return (
    <div className={`info-row ${className}`}>
      <span className="info-row-label">{label}</span>
      <span className="info-row-value" style={mono ? undefined : { fontFamily: 'var(--font-ui)' }}>
        {value}
      </span>
    </div>
  );
}
