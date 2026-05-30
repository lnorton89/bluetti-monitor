export function SideStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="side-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <span className="side-stat-sub">{sub}</span> : null}
    </div>
  );
}
