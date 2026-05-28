import { Wifi } from 'lucide-react';
import { API_BASE, IS_STATIC_ANALYTICS, type FieldValue } from '../lib/api';
import { formatFieldValue, getFieldMeta } from '../lib/fields';
import { PanelHeader } from './PanelHeader';

export function SnapshotPanel({
  liveState,
}: {
  liveState: Record<string, FieldValue>;
}) {
  return (
    <section className="panel">
      <PanelHeader
        icon={Wifi}
        title={IS_STATIC_ANALYTICS ? 'Snapshot' : 'Live Snapshot'}
        subtitle={
          IS_STATIC_ANALYTICS
            ? `${Object.keys(liveState).length} fields from 7D export`
            : `${Object.keys(liveState).length} fields from ${API_BASE}`
        }
      />
      <div className="snapshot-grid">
        {Object.entries(liveState)
          .filter(([field]) => field !== '_raw')
          .slice(0, 18)
          .map(([field, reading]) => (
            <div className="snapshot-cell" key={field}>
              <span>{getFieldMeta(field).label}</span>
              <strong>{formatFieldValue(field, reading.value)}</strong>
            </div>
          ))}
      </div>
    </section>
  );
}
