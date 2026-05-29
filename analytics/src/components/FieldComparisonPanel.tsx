import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Search, X } from 'lucide-react';
import {
  EMPTY_TIMELINE,
  MAX_COMPARISON_FIELDS,
  areSameFields,
  getChartColors,
  normalizeComparisonFields,
  type AnalyticsSkin,
  type AnalyticsTheme,
} from '../lib/constants';
import { getFieldMeta } from '../lib/fields';
import { fetchComparisonTimelineInWorker } from '../lib/history-worker-client';
import { DenseTimeSeries, type DenseSeries } from './DenseTimeSeries';
import { FieldChipList } from './FieldChipList';

export const FieldComparisonPanel = memo(function FieldComparisonPanel({
  availableFields,
  bucketMs,
  defaultFields,
  device,
  limit,
  onSaveDefaultFields,
  sinceIso,
  skin,
  themeMode,
}: {
  availableFields: string[];
  bucketMs: number;
  defaultFields: string[];
  device: string;
  limit: number;
  onSaveDefaultFields: (fields: string[]) => void;
  sinceIso: string;
  skin: AnalyticsSkin;
  themeMode: AnalyticsTheme;
}) {
  const [comparisonFields, setComparisonFields] = useState<string[]>(() => normalizeComparisonFields(defaultFields, availableFields));
  const [fieldSearch, setFieldSearch] = useState('');
  const [fieldSearchOpen, setFieldSearchOpen] = useState(false);
  const fieldSearchInputRef = useRef<HTMLInputElement>(null);
  const fieldSearchContainerRef = useRef<HTMLDivElement>(null);
  const chartColors = useMemo(() => getChartColors(skin, themeMode), [skin, themeMode]);
  const defaultFieldsKey = defaultFields.join('|');
  const previousDefaultFieldsKey = useRef(defaultFieldsKey);

  useEffect(() => {
    const defaults = normalizeComparisonFields(defaultFields, availableFields);
    if (previousDefaultFieldsKey.current !== defaultFieldsKey) {
      previousDefaultFieldsKey.current = defaultFieldsKey;
      setComparisonFields(defaults);
      return;
    }

    setComparisonFields((current) => {
      if (current.length === 0) {
        return defaults;
      }

      const valid = normalizeComparisonFields(current, availableFields);
      if (valid.length === current.length && valid.every((field, index) => field === current[index])) {
        return current;
      }
      if (valid.length > 0) {
        return valid;
      }

      if (defaults.length === current.length && defaults.every((field, index) => field === current[index])) {
        return current;
      }

      return defaults;
    });
  }, [availableFields, defaultFields, defaultFieldsKey]);

  useEffect(() => {
    if (fieldSearchOpen) {
      fieldSearchInputRef.current?.focus();
    }
  }, [fieldSearchOpen]);

  useEffect(() => {
    if (!fieldSearchOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (fieldSearchContainerRef.current && !fieldSearchContainerRef.current.contains(event.target as Node)) {
        setFieldSearch('');
        setFieldSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fieldSearchOpen]);

  const filteredNumericFields = useMemo(() => {
    const query = fieldSearch.trim().toLowerCase();
    return availableFields.filter((field) => {
      const meta = getFieldMeta(field);
      return !query || meta.label.toLowerCase().includes(query) || field.toLowerCase().includes(query);
    });
  }, [availableFields, fieldSearch]);

  const comparisonHistoryQuery = useQuery({
    queryKey: ['comparison-timeline', device, bucketMs, limit, sinceIso, comparisonFields.join('|')],
    queryFn: () => fetchComparisonTimelineInWorker(device, comparisonFields, { limit, since: sinceIso }, bucketMs),
    enabled: Boolean(device) && comparisonFields.length > 0,
  });

  const comparisonTimeline = comparisonHistoryQuery.data ?? EMPTY_TIMELINE;
  const comparisonTimestamps = useMemo(() => comparisonTimeline.map((row) => row.ts), [comparisonTimeline]);
  const comparisonSeries = useMemo<DenseSeries[]>(() => (
    comparisonFields.map((field, index) => {
      const meta = getFieldMeta(field);
      return {
        label: meta.label,
        color: chartColors[index % chartColors.length],
        values: comparisonTimeline.map((row) => row[field]),
        unit: meta.unit,
        digits: meta.unit === 'kWh' ? 2 : meta.unit ? 1 : 0,
      };
    })
  ), [chartColors, comparisonFields, comparisonTimeline]);
  const normalizedDefaults = useMemo(
    () => normalizeComparisonFields(defaultFields, availableFields),
    [availableFields, defaultFields],
  );
  const defaultSelectionSaved = areSameFields(comparisonFields, normalizedDefaults);

  return (
    <section className="panel field-comparison-panel">
      <header className="panel-header field-comparison-header">
        <div className="field-comparison-title">
          <div ref={fieldSearchContainerRef} className={`field-search-trigger${fieldSearchOpen || fieldSearch ? ' is-open' : ''}`}>
            <button
              type="button"
              className="field-search-icon"
              aria-controls="field-comparison-search"
              aria-expanded={fieldSearchOpen}
              aria-label={fieldSearchOpen ? 'Hide field search' : 'Show field search'}
              title={fieldSearchOpen ? 'Hide field search' : 'Search comparison fields'}
              onClick={() => setFieldSearchOpen((current) => !current)}
            >
              <Search size={17} />
            </button>
            <input
              id="field-comparison-search"
              ref={fieldSearchInputRef}
              aria-label="Search comparison fields"
              value={fieldSearch}
              onChange={(event) => setFieldSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setFieldSearch('');
                  setFieldSearchOpen(false);
                }
              }}
              placeholder="Search fields"
              tabIndex={fieldSearchOpen ? 0 : -1}
            />
          </div>
          <h2>Field Comparison</h2>
        </div>
        <div className="panel-header-side">
          <p>{comparisonHistoryQuery.isFetching ? 'Refreshing...' : 'Dense uPlot view for selected numeric fields'}</p>
          <div className="comparison-actions">
            <button
              type="button"
              className="icon-button clear-selection-button"
              aria-label="Clear current field selection"
              title="Clear current field selection"
              disabled={comparisonFields.length === 0}
              onClick={() => setComparisonFields([])}
            >
              <X size={17} />
            </button>
            <button
              type="button"
              className={`icon-button save-default-button${defaultSelectionSaved ? ' is-saved' : ''}`}
              aria-label="Save current field selection as default"
              title="Save current field selection as default"
              disabled={comparisonFields.length === 0 || defaultSelectionSaved}
              onClick={() => onSaveDefaultFields(comparisonFields)}
            >
              <Save size={17} />
            </button>
          </div>
        </div>
      </header>
      <div className="field-picker">
        <FieldChipList
          fields={filteredNumericFields}
          selectedFields={comparisonFields}
          onSelectedFieldsChange={setComparisonFields}
        />
      </div>
      <DenseTimeSeries
        deferMs={270}
        themeMode={themeMode}
        timestamps={comparisonTimestamps}
        series={comparisonSeries}
      />
      <div className="legend-strip">
        {comparisonFields.map((field, index) => (
          <span key={field}>
            <i style={{ background: chartColors[index % chartColors.length] }} />
            {getFieldMeta(field).label}
          </span>
        ))}
      </div>
    </section>
  );
});
