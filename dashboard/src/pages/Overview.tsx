import { Wifi, ArrowRight, Sun, Plug, Battery, Zap, Gauge } from 'lucide-react';
import { useWsStore } from '../store/ws';
import { Card, SectionLabel, BigMetric, BoolBadge } from '../components/ui';
import { getFieldMeta, CATEGORIES, formatObjectValue, categoryIcons, categoryColors } from '../lib/fields';
import { formatRelativeTime } from '../lib/time';

function PowerFlow({ state }: { state: Record<string, { value: string; ts: string }> }) {
  const dcIn  = parseFloat(state['dc_input_power']?.value  ?? '0');
  const acIn  = parseFloat(state['ac_input_power']?.value  ?? '0');
  const acOut = parseFloat(state['ac_output_power']?.value ?? '0');
  const dcOut = parseFloat(state['dc_output_power']?.value ?? '0');
  const batt  = parseFloat(state['total_battery_percent']?.value ?? '0');

  const totalIn  = dcIn + acIn;
  const totalOut = acOut + dcOut;
  const net      = totalIn - totalOut;

  return (
    <Card>
      <SectionLabel color="var(--cat-input)"><ArrowRight size={16} style={{ marginRight: 6, color: 'var(--cat-input)' }} />Power Flow</SectionLabel>
      <div className="power-flow-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: 12 }}>
        {/* Input */}
        <div style={{ textAlign: 'right' }}>
          {dcIn > 0 && <BigMetric label="Solar DC" value={dcIn} unit="W" color="var(--amber)" icon={Sun} />}
          {acIn > 0 && <div style={{ marginTop: 12 }}><BigMetric label="AC Grid" value={acIn} unit="W" color="var(--blue)" icon={Plug} /></div>}
          {totalIn === 0 && <BigMetric label="Input" value="0" unit="W" color="var(--text-dim)" />}
        </div>

        {/* Arrow in */}
        <div style={{ color: totalIn > 0 ? 'var(--amber)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <ArrowRight size={28} />
        </div>

        {/* Battery */}
        <div style={{ textAlign: 'center' }}>
          <BigMetric label="Battery" value={batt.toFixed(0)} unit="%" color={batt > 20 ? 'var(--green)' : 'var(--red)'} icon={Battery} />
          <div style={{ marginTop: 10, height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${batt}%`,
              background: batt > 20 ? 'var(--green)' : 'var(--red)',
              borderRadius: 4,
              transition: 'width 1s ease',
            }} />
          </div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {net >= 0 ? '+' : ''}{net.toFixed(0)} W net
          </div>
        </div>

        {/* Arrow out */}
        <div style={{ color: totalOut > 0 ? 'var(--text-dim)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <ArrowRight size={28} />
        </div>

        {/* Output */}
        <div>
          {acOut > 0 && <BigMetric label="AC Load" value={acOut} unit="W" color="var(--text)" icon={Plug} />}
          {dcOut > 0 && <div style={{ marginTop: 12 }}><BigMetric label="DC Load" value={dcOut} unit="W" color="var(--text)" icon={Zap} /></div>}
          {totalOut === 0 && <BigMetric label="Output" value="0" unit="W" color="var(--text-dim)" />}
        </div>
      </div>
    </Card>
  );
}

export default function Overview() {
  const wsState = useWsStore(s => s.state);
  const devices = Object.keys(wsState);

  if (devices.length === 0) {
    return (
      <div style={{ padding: 40, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 15 }}>
        Waiting for data... Make sure bluetti-mqtt is running and connected to the broker.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      {devices.map(device => {
        const fields = wsState[device];
        const byCategory: Record<string, [string, { value: string; ts: string }][]> = {};

        for (const [field, fv] of Object.entries(fields)) {
          const cat = getFieldMeta(field).category;
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push([field, fv]);
        }

        return (
          <div key={device}>
            {/* Device header */}
            <div style={{
              fontFamily: 'var(--font-cond)',
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: '0.08em',
              color: 'var(--amber)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}>
              <Wifi size={22} />
              {device}
            </div>

            <PowerFlow state={fields} />

            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {CATEGORIES.filter(c => byCategory[c]?.length).map(cat => {
                const Icon = categoryIcons[cat] ?? Gauge;
                const color = categoryColors[cat] ?? 'var(--text-dim)';
                const IconComponent = Icon;
                return (
                  <Card key={cat}>
                    <SectionLabel color={color}><div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color }}><IconComponent size={16} />{cat}</div></SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {byCategory[cat].map(([field, fv]) => {
                        const meta = getFieldMeta(field);
                        const isBool = fv.value === 'True' || fv.value === 'False' || fv.value === 'true' || fv.value === 'false';
                        const ago = formatRelativeTime(fv.ts);

                        const isLong = !isBool && fv.value.length > 20;
                        const formattedValue = formatObjectValue(fv.value);
                        return (
                          <div key={field} style={{
                            display: 'flex',
                            flexDirection: isLong ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: isLong ? 'flex-start' : 'center',
                            gap: isLong ? 6 : 0,
                            paddingBottom: 10,
                            borderBottom: '1px solid var(--border)',
                          }}>
                            <div>
                              <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 3, fontWeight: 500 }}>{meta.label}</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{ago}</div>
                            </div>
                            {isBool
                              ? <BoolBadge value={fv.value} />
                              : <div style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: isLong ? 12 : 16,
                                  color: 'var(--amber)',
                                  wordBreak: 'break-all',
                                  overflowWrap: 'anywhere',
                                  maxWidth: '100%',
                                }}>
                                  {formattedValue}{meta.unit ? ` ${meta.unit}` : ''}
                                </div>
                            }
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

