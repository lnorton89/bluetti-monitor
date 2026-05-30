import { memo, useMemo } from 'react';
import { MAX_COMPARISON_FIELDS } from '../lib/constants';
import { getFieldMeta, type FieldCategory } from '../lib/fields';

const CATEGORY_ORDER: FieldCategory[] = ['Input', 'Output', 'Battery', 'System', 'Modes', 'Raw'];

export const FieldChipList = memo(function FieldChipList({
  fields,
  onSelectedFieldsChange,
  selectedFields,
}: {
  fields: string[];
  onSelectedFieldsChange: (updater: (current: string[]) => string[]) => void;
  selectedFields: string[];
}) {
  const selected = useMemo(() => new Set(selectedFields), [selectedFields]);

  const grouped = useMemo(() => {
    const map: Record<string, { label: string; fields: { field: string; meta: ReturnType<typeof getFieldMeta> }[] }> = {};
    for (const field of fields) {
      const meta = getFieldMeta(field);
      const cat = meta.category;
      if (!map[cat]) map[cat] = { label: cat, fields: [] };
      map[cat].fields.push({ field, meta });
    }
    return CATEGORY_ORDER.filter((c) => map[c]).map((c) => map[c]);
  }, [fields]);

  return (
    <div className="field-chips-grouped">
      {grouped.map((group) => (
        <div key={group.label} className="field-chip-group">
          <span className="field-chip-group-label">{group.label}</span>
          <div className="field-chips">
            {group.fields.map(({ field, meta }) => {
              const active = selected.has(field);
              return (
                <button
                  key={field}
                  type="button"
                  className={`chip chip-${meta.category.toLowerCase()}${active ? ' active' : ''}`}
                  onClick={() => {
                    onSelectedFieldsChange((current) => (
                      active ? current.filter((item) => item !== field) : [...current, field].slice(-MAX_COMPARISON_FIELDS)
                    ));
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});
