export interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
}

/**
 * EmptyState — centered empty-state display with title and optional description.
 * Replaces .empty-state-card + .empty-state-title + .empty-state-copy.
 */
export function EmptyState({ title, description, className = '' }: EmptyStateProps) {
  return (
    <div className={`empty-state-card ${className}`}>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-copy">{description}</div>}
    </div>
  );
}
