import React from 'react';

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      padding: '16px 20px',
    }} className={className}>
      {children}
    </div>
  );
}

// ── SectionLabel ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      fontFamily: 'var(--font-cond)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: color || 'var(--text-dim)',
      marginBottom: 14,
      display: 'flex',
      alignItems: 'center',
    }}>
      {children}
    </div>
  );
}

// ── StatusDot ────────────────────────────────────────────────────────────────
export function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: ok ? 'var(--green)' : 'var(--red)',
      boxShadow: ok ? '0 0 6px var(--green)' : '0 0 6px var(--red)',
      animation: ok ? 'pulse-amber 2s ease-in-out infinite' : 'none',
    }} />
  );
}

// ── MonoValue ────────────────────────────────────────────────────────────────
export function MonoValue({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 15,
      color: highlight ? 'var(--amber)' : 'var(--text)',
    }}>
      {children}
    </span>
  );
}

// ── BigMetric ─────────────────────────────────────────────────────────────────
export function BigMetric({ label, value, unit, color = 'var(--amber)', icon: Icon }: {
  label: string; value: string | number; unit?: string; color?: string; icon?: React.ElementType;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {Icon && <Icon size={14} style={{ color: 'var(--text-dim)' }} />}
        <span style={{ fontFamily: 'var(--font-cond)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 400, color, lineHeight: 1 }}>
          {value}
        </span>
        {unit && <span style={{ fontFamily: 'var(--font-cond)', fontSize: 16, color: 'var(--text-dim)' }}>{unit}</span>}
      </div>
    </div>
  );
}

// ── BoolBadge ─────────────────────────────────────────────────────────────────
export function BoolBadge({ value }: { value: string }) {
  const on = value === 'True' || value === 'true' || value === '1';
  return (
    <span style={{
      fontFamily: 'var(--font-cond)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '0.1em',
      padding: '4px 10px',
      borderRadius: 3,
      background: on ? 'var(--green-dim)' : 'var(--bg-3)',
      color: on ? 'var(--green)' : 'var(--text-dim)',
      border: `1px solid ${on ? 'var(--green-dim)' : 'var(--border)'}`,
    }}>
      {on ? 'ON' : 'OFF'}
    </span>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{
      width: 20, height: 20,
      border: '2px solid var(--border)',
      borderTopColor: 'var(--amber)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}
