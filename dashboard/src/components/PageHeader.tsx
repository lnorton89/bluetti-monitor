import React from 'react';

export interface PageHeaderProps {
  kicker?: string;
  title: string;
  icon?: React.ElementType;
  description?: string;
  meta?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader — page-level header with kicker, title, icon, description, and meta area.
 * Replaces .workspace-panel-header, .device-overview-header, .analytics-hero-top patterns.
 */
export function PageHeader({ kicker, title, icon: Icon, description, meta, className = '' }: PageHeaderProps) {
  return (
    <div className={`section-header ${className}`}>
      <div>
        {kicker && <div className="section-kicker">{kicker}</div>}
        <div className="section-title" style={{ fontSize: 22 }}>
          {Icon && <Icon size={20} style={{ color: 'var(--text-dim)' }} />}
          {title}
        </div>
        {description && (
          <div style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 15, maxWidth: '68ch', overflowWrap: 'anywhere' }}>
            {description}
          </div>
        )}
      </div>
      {meta}
    </div>
  );
}
