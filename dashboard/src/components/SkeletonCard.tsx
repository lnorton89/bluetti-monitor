/**
 * SkeletonCard - Loading placeholder component for content stability
 * 
 * Provides a shimmer animation placeholder that matches Card dimensions,
 * maintaining layout stability during initial data fetches.
 * 
 * Use during initial data fetch, not during re-fetch (use inline spinners for that).
 */

import React from 'react';
import { Card } from './ui';

interface SkeletonCardProps {
  /** Number of content placeholder lines (default: 3) */
  lines?: number;
  /** Fixed aspect ratio for special cases */
  aspectRatio?: string;
  /** Additional className for the card wrapper */
  className?: string;
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--bg-secondary, var(--bg-3)) 25%, var(--bg-tertiary, var(--border)) 50%, var(--bg-secondary, var(--bg-3)) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: 4,
};

function SkeletonLine({ width = '100%' }: { width?: string | number }) {
  return (
    <div
      style={{
        ...shimmerStyle,
        height: 14,
        width,
        marginBottom: 8,
      }}
    />
  );
}

export function SkeletonCard({ lines = 3, className = '' }: SkeletonCardProps) {
  return (
    <Card className={className}>
      {/* Header placeholder */}
      <div style={{ marginBottom: 16 }}>
        <SkeletonLine width="40%" />
      </div>

      {/* Content lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ marginBottom: i < lines - 1 ? 12 : 0 }}>
          <SkeletonLine width={i === lines - 1 ? '60%' : '100%'} />
        </div>
      ))}

      {/* Footer placeholder */}
      <div style={{ marginTop: 16 }}>
        <SkeletonLine width="30%" />
      </div>
    </Card>
  );
}
