import { useState, useMemo } from 'react';
import { useWsStore } from '../store/ws';
import { getFieldMeta, formatObjectValue, categoryColors, categoryIcons } from '../lib/fields';
import { Card } from '../components/ui';
import { formatTime } from '../lib/time';
import { Search, Server, Clock, Tag, Code, Hash, Gauge } from 'lucide-react';

export default function RawData() {
  const wsState = useWsStore(s => s.state);
  const [search, setSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const devices = Object.keys(wsState);
  const device  = selectedDevice ?? devices[0] ?? '';
  const fields  = wsState[device] ?? {};

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const entries = Object.entries(fields).filter(([field]) =>
      !q || field.toLowerCase().includes(q) || getFieldMeta(field).label.toLowerCase().includes(q)
    );
    // Sort by category order, then by field name
    const categoryOrder = ['Input', 'Output', 'Battery', 'Modes', 'System'];
    return entries.sort((a, b) => {
      const catA = getFieldMeta(a[0]).category;
      const catB = getFieldMeta(b[0]).category;
      const orderA = categoryOrder.indexOf(catA);
      const orderB = categoryOrder.indexOf(catB);
      if (orderA !== orderB) return orderA - orderB;
      return a[0].localeCompare(b[0]);
    });
  }, [fields, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      <Card>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          {devices.length > 1 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {devices.map(d => (
                <button key={d} onClick={() => setSelectedDevice(d)} style={{
                  padding: '8px 16px',
                  background: device === d ? 'var(--amber-glow)' : 'var(--bg-3)',
                  border: `1px solid ${device === d ? 'var(--amber-dim)' : 'var(--border)'}`,
                  color: device === d ? 'var(--amber)' : 'var(--text-dim)',
                  fontFamily: 'var(--font-cond)',
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '0.08em',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <Server size={14} />
                  {d}
                </button>
              ))}
            </div>
          )}
          <div style={{
            flex: 1,
            minWidth: 220,
            background: 'var(--bg-3)',
            border: '1px solid var(--border-hi)',
            borderRadius: 3,
            color: 'var(--text)',
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            padding: '8px 14px',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search fields..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
              }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Hash size={14} />
            {filtered.length} fields
          </span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search size={18} />
          No fields to display.
        </div>
      ) : (
        <Card>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Field Key', 'Label', 'Category', 'Value', 'Last Updated'].map(h => {
                  const Icon = h === 'Field Key' ? Code : h === 'Label' ? Tag : h === 'Category' ? Server : h === 'Value' ? Hash : Clock;
                  return (
                    <th key={h} style={{
                      textAlign: 'left',
                      padding: '0 12px 14px',
                      fontFamily: 'var(--font-cond)',
                      fontWeight: 600,
                      fontSize: 12,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-dim)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={14} />
                        {h}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map(([field, fv], i) => {
                const meta = getFieldMeta(field);
                const isBool = fv.value === 'True' || fv.value === 'False' || fv.value === 'true' || fv.value === 'false';
                const isOn = fv.value === 'True' || fv.value === 'true';
                const formattedValue = formatObjectValue(fv.value);

                return (
                  <tr key={field} style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}>
                    <td style={{ padding: '12px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                      {field}
                    </td>
                    <td style={{ padding: '12px 12px', fontSize: 14, color: 'var(--text-dim)', fontWeight: 500 }}>
                      {meta.label}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{
                        fontFamily: 'var(--font-cond)',
                        fontSize: 12,
                        letterSpacing: '0.08em',
                        padding: '5px 12px',
                        borderRadius: 4,
                        background: 'var(--bg-3)',
                        color: categoryColors[meta.category] || 'var(--text-muted)',
                        border: `1px solid ${categoryColors[meta.category] || 'var(--border)'}`,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        {(() => {
                          const Icon = categoryIcons[meta.category] ?? Gauge;
                          const IconComponent = Icon;
                          return <><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconComponent size={12} /></span>{meta.category}</>;
                        })()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      {isBool ? (
                        <span style={{
                          fontFamily: 'var(--font-cond)',
                          fontWeight: 600,
                          fontSize: 13,
                          color: isOn ? 'var(--green)' : 'var(--text-dim)',
                        }}>
                          {isOn ? 'ON' : 'OFF'}
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--amber)', fontWeight: 600 }}>
                          {formattedValue}{meta.unit ? ` ${meta.unit}` : ''}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatTime(fv.ts)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
