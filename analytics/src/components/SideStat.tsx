export function SideStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="side-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
