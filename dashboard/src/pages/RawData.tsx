import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Search, Server, Clock, Tag, Code, Hash, Gauge } from 'lucide-react';
import { useShellStore } from '../store/shell';
import { useWsStore } from '../store/ws';
import { getFieldMeta, formatObjectValue, categoryColors, categoryIcons } from '../lib/fields';
import { Card } from '../components/ui';
import { formatTime } from '../lib/time';

export default function RawData() {
  const wsState = useWsStore((s) => s.state);
  const setRouteSignal = useShellStore((s) => s.setRouteSignal);
  const resetRouteSignal = useShellStore((s) => s.resetRouteSignal);
  const [search, setSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const devices = Object.keys(wsState);
  const device = selectedDevice ?? devices[0] ?? '';
  const fields = wsState[device] ?? {};
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (devices.length === 0) {
      setSelectedDevice(null);
      return;
    }

    if (selectedDevice !== null && !devices.includes(selectedDevice)) {
      setSelectedDevice(devices[0]);
    }
  }, [devices, selectedDevice]);

  const filtered = useMemo(() => {
    const query = deferredSearch.toLowerCase();
    const entries = Object.entries(fields).filter(([field]) => (
      !query
      || field.toLowerCase().includes(query)
      || getFieldMeta(field).label.toLowerCase().includes(query)
    ));

    const categoryOrder = ['Input', 'Output', 'Battery', 'Modes', 'System'];

    return entries.sort((left, right) => {
      const categoryA = getFieldMeta(left[0]).category;
      const categoryB = getFieldMeta(right[0]).category;
      const orderA = categoryOrder.indexOf(categoryA);
      const orderB = categoryOrder.indexOf(categoryB);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return left[0].localeCompare(right[0]);
    });
  }, [deferredSearch, fields]);

  useEffect(() => {
    setRouteSignal('raw', `${filtered.length} visible`);

    return () => {
      resetRouteSignal('raw');
    };
  }, [filtered.length, resetRouteSignal, setRouteSignal]);

  if (devices.length === 0) {
    return (
      <div className="page-stack animate-fade-in">
        <div className="empty-state-card">
          <div className="empty-state-title">Waiting for raw fields</div>
          <div className="empty-state-copy">
            When the live telemetry stream appears, this explorer will show the exact field keys, labels, categories, values, and update times coming through the stack.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack animate-fade-in">
      <Card className="workspace-panel">
        <div className="workspace-panel-header">
          <div className="workspace-panel-copy">
            <div className="workspace-panel-kicker">Field inventory</div>
            <div className="workspace-panel-title">
              <Code size={16} />
              <span>Inspect the live payload shape</span>
            </div>
            <p className="workspace-panel-summary">
              Search by raw key or display label, switch devices when more than one source is online, and use the table to validate exactly what the monitor is receiving.
            </p>
          </div>
          <div className="workspace-panel-meta">
            <span>{devices.length} device{devices.length === 1 ? '' : 's'}</span>
            <span>{filtered.length} visible field{filtered.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="control-grid">
          {devices.length > 1 ? (
            <div className="device-pill-row">
              {devices.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setSelectedDevice(entry)}
                  className={`ui-pill-button workspace-pill${device === entry ? ' active' : ''}`}
                >
                  <Server size={14} />
                  {entry}
                </button>
              ))}
            </div>
          ) : (
            <div className="workspace-single-device">
              <Server size={14} />
              <span>{device}</span>
            </div>
          )}

          <label className="search-shell workspace-search">
            <Search size={16} className="workspace-search-icon" />
            <input
              type="text"
              placeholder="Search fields..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="workspace-search-input"
            />
          </label>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="workspace-empty-card">
          <div className="workspace-empty-copy">
            <Search size={18} />
            <span>No fields match the current search.</span>
          </div>
        </Card>
      ) : (
        <Card className="data-table-shell">
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {['Field Key', 'Label', 'Category', 'Value', 'Last Updated'].map((heading) => {
                    const Icon = heading === 'Field Key'
                      ? Code
                      : heading === 'Label'
                        ? Tag
                        : heading === 'Category'
                          ? Server
                          : heading === 'Value'
                            ? Hash
                            : Clock;

                    return (
                      <th key={heading}>
                        <div className="data-table-heading">
                          <Icon size={14} />
                          {heading}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map(([field, fieldValue], index) => {
                  const meta = getFieldMeta(field);
                  const isBool = fieldValue.value === 'True'
                    || fieldValue.value === 'False'
                    || fieldValue.value === 'true'
                    || fieldValue.value === 'false';
                  const isOn = fieldValue.value === 'True' || fieldValue.value === 'true';
                  const formattedValue = formatObjectValue(fieldValue.value);
                  const Icon = categoryIcons[meta.category] ?? Gauge;

                  return (
                    <tr key={field} className={`data-row${index % 2 === 1 ? ' alt' : ''}`}>
                      <td className="field-key-cell">{field}</td>
                      <td className="field-label-cell">{meta.label}</td>
                      <td>
                        <span
                          className="data-chip"
                          style={{
                            color: categoryColors[meta.category] || 'var(--text-muted)',
                            borderColor: categoryColors[meta.category] || 'var(--border)',
                          }}
                        >
                          <Icon size={12} />
                          {meta.category}
                        </span>
                      </td>
                      <td>
                        {isBool ? (
                          <span className={`bool-text${isOn ? ' on' : ''}`}>
                            {isOn ? 'ON' : 'OFF'}
                          </span>
                        ) : (
                          <span className="value-text">
                            {formattedValue}
                            {meta.unit ? ` ${meta.unit}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="timestamp-cell">{formatTime(fieldValue.ts)}</td>
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
