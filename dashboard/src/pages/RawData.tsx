import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Search, Server, Clock, Tag, Code, Hash, Gauge, RefreshCw, Wifi } from 'lucide-react';
import { useShellStore } from '../store/shell';
import { useWsStore } from '../store/ws';
import { getFieldMeta, formatObjectValue, categoryColors, categoryIcons } from '../lib/fields';
import { Card, PageHeader, StatusChip, EmptyState } from '../components/ui';
import { SkeletonCard } from '../components/SkeletonCard';
import { useTelemetryState } from '../hooks/useTelemetryState';
import { formatTime } from '../lib/time';

export default function RawData() {
  const wsState = useWsStore((s) => s.state);
  const setRouteSignal = useShellStore((s) => s.setRouteSignal);
  const resetRouteSignal = useShellStore((s) => s.resetRouteSignal);

  // Telemetry state for loading/offline/stale detection
  const { isLoading, isOffline, isStale, staleSeverity, reconnect, devices } = useTelemetryState();

  const [search, setSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
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

  const fieldRows = useMemo(() => (
    filtered.map(([field, fieldValue], index) => {
      const meta = getFieldMeta(field);
      const isBool = fieldValue.value === 'True'
        || fieldValue.value === 'False'
        || fieldValue.value === 'true'
        || fieldValue.value === 'false';
      const isOn = fieldValue.value === 'True' || fieldValue.value === 'true';
      const formattedValue = formatObjectValue(fieldValue.value);
      const Icon = categoryIcons[meta.category] ?? Gauge;

      return {
        field,
        meta,
        isBool,
        isOn,
        formattedValue,
        icon: Icon,
        timestamp: formatTime(fieldValue.ts),
        rowClassName: `data-row${index % 2 === 1 ? ' alt' : ''}`,
      };
    })
  ), [filtered]);

  useEffect(() => {
    setRouteSignal('raw', `${filtered.length} visible`);

    return () => {
      resetRouteSignal('raw');
    };
  }, [filtered.length, resetRouteSignal, setRouteSignal]);

  // Show loading skeleton on initial load
  if (isLoading) {
    return (
      <div className="page-stack animate-fade-in">
        <SkeletonCard lines={8} />
        <SkeletonCard lines={5} />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="page-stack animate-fade-in">
        <EmptyState
          title="Waiting for raw fields"
          description="When the live telemetry stream appears, this explorer will show the exact field keys, labels, categories, values, and update times coming through the stack."
        />
      </div>
    );
  }

  return (
    <div className="page-stack animate-fade-in">
      {/* Offline banner when disconnected */}
      {isOffline && (
        <div className="offline-banner">
          <span>
            <Wifi size={16} />
            Connection lost. Reconnecting...
          </span>
          <button onClick={reconnect}>
            <RefreshCw size={14} style={{ marginRight: 6 }} />
            Retry now
          </button>
        </div>
      )}

      {/* Stale data indicator */}
      {isStale && staleSeverity && (
        <div className="stale-indicator" data-severity={staleSeverity}>
          <RefreshCw size={12} />
          <span>{staleSeverity === 'stale' ? 'Data stale' : 'Data aging'}</span>
        </div>
      )}

      <Card className="workspace-panel surface-card">
        <PageHeader
          kicker="Field inventory"
          title="Inspect the live payload shape"
          icon={Code}
          description="Search by raw key or display label, switch devices when more than one source is online, and use the table to validate exactly what the monitor is receiving."
          meta={
            <div className="workspace-panel-meta">
              <StatusChip label={`${devices.length} device${devices.length === 1 ? '' : 's'}`} variant="info" />
              <StatusChip label={`${filtered.length} visible field${filtered.length === 1 ? '' : 's'}`} variant="default" />
            </div>
          }
        />

        <div className="control-grid">
          {devices.length > 1 ? (
            <div className="device-pill-row">
              {devices.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setSelectedDevice(entry)}
                  className={`ui-pill-button${device === entry ? ' chip--active' : ''}`}
                >
                  <Server size={14} />
                  {entry}
                </button>
              ))}
            </div>
          ) : (
            <StatusChip label={device} variant="default" />
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
                {fieldRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <tr key={row.field} className={row.rowClassName}>
                      <td className="field-key-cell">{row.field}</td>
                      <td className="field-label-cell">{row.meta.label}</td>
                      <td>
                        <span
                          className="data-chip"
                          style={{
                            color: categoryColors[row.meta.category] || 'var(--text-muted)',
                            borderColor: categoryColors[row.meta.category] || 'var(--border)',
                          }}
                        >
                          <Icon size={12} />
                          {row.meta.category}
                        </span>
                      </td>
                      <td>
                        {row.isBool ? (
                          <span className={`bool-text${row.isOn ? ' on' : ''}`}>
                            {row.isOn ? 'ON' : 'OFF'}
                          </span>
                        ) : (
                          <span className="value-text">
                            {row.formattedValue}
                            {row.meta.unit ? ` ${row.meta.unit}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="timestamp-cell">{row.timestamp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="raw-field-list">
            {fieldRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={`${row.field}-mobile`} className="raw-field-card">
                  <div className="raw-field-card-top">
                    <div className="raw-field-card-copy">
                      <strong>{row.meta.label}</strong>
                      <span>{row.field}</span>
                    </div>
                    <span
                      className="data-chip"
                      style={{
                        color: categoryColors[row.meta.category] || 'var(--text-muted)',
                        borderColor: categoryColors[row.meta.category] || 'var(--border)',
                      }}
                    >
                      <Icon size={12} />
                      {row.meta.category}
                    </span>
                  </div>
                  <div className="raw-field-card-detail">
                    <span>Value</span>
                    {row.isBool ? (
                      <strong className={`bool-text${row.isOn ? ' on' : ''}`}>
                        {row.isOn ? 'ON' : 'OFF'}
                      </strong>
                    ) : (
                      <strong className="value-text">
                        {row.formattedValue}
                        {row.meta.unit ? ` ${row.meta.unit}` : ''}
                      </strong>
                    )}
                  </div>
                  <div className="raw-field-card-detail">
                    <span>Updated</span>
                    <strong className="timestamp-cell">{row.timestamp}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
