export function SideStat({ label, value, sub, tooltip }: { label: string; value: string; sub?: string; tooltip?: string }) {
  return (
    <div className="side-stat" title={tooltip}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <span className="side-stat-sub">{sub}</span> : null}
    </div>
  );
}
