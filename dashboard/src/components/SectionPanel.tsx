import React from 'react';
import { Card } from './ui';

export interface SectionPanelProps {
  title: string;
  icon?: React.ElementType;
  kicker?: string;
  meta?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * SectionPanel — titled card panel with icon header for grouping related content.
 * Replaces .info-panel + .info-panel-header + .info-panel-title pattern.
 */
export function SectionPanel({ title, icon: Icon, kicker, meta, className = '', children }: SectionPanelProps) {
  return (
    <Card className={`surface-card ${className}`}>
      <div className="section-header">
        <div>
          {kicker && <div className="section-kicker">{kicker}</div>}
          <div className="section-title">
            {Icon && <Icon size={16} style={{ color: 'var(--text-dim)' }} />}
            {title}
          </div>
        </div>
        {meta}
      </div>
      {children}
    </Card>
  );
}
