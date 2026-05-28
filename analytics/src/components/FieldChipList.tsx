import { memo, useMemo } from 'react';
import { MAX_COMPARISON_FIELDS } from '../lib/constants';
import { getFieldMeta } from '../lib/fields';

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

  return (
    <div className="field-chips">
      {fields.map((field) => {
        const meta = getFieldMeta(field);
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
  );
});
