import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, Moon, Palette, Search, Sun, X } from 'lucide-react';
import {
  MAX_COMPARISON_FIELDS,
  SKIN_OPTIONS,
  normalizeComparisonFields,
  type AnalyticsDensity,
  type AnalyticsSkin,
  type AnalyticsTheme,
} from '../lib/constants';
import { getFieldMeta } from '../lib/fields';

export function SettingsModal({
  accentOverride,
  availableComparisonFields,
  comparisonDefaultFields,
  densityMode,
  skin,
  themeMode,
  onAccentChange,
  onComparisonDefaultFieldsChange,
  onClose,
  onDensityChange,
  onSkinChange,
  onThemeChange,
}: {
  accentOverride: string | null;
  availableComparisonFields: string[];
  comparisonDefaultFields: string[];
  densityMode: AnalyticsDensity;
  skin: AnalyticsSkin;
  themeMode: AnalyticsTheme;
  onAccentChange: (color: string | null) => void;
  onComparisonDefaultFieldsChange: (fields: string[]) => void;
  onClose: () => void;
  onDensityChange: (density: AnalyticsDensity) => void;
  onSkinChange: (skin: AnalyticsSkin) => void;
  onThemeChange: (theme: AnalyticsTheme) => void;
}) {
  const accentColorInputRef = useRef<HTMLInputElement | null>(null);
  const [fieldSearch, setFieldSearch] = useState('');
  const selectedDefaultFields = useMemo(
    () => normalizeComparisonFields(comparisonDefaultFields, availableComparisonFields),
    [availableComparisonFields, comparisonDefaultFields],
  );
  const filteredComparisonFields = useMemo(() => {
    const query = fieldSearch.trim().toLowerCase();
    return availableComparisonFields.filter((field) => {
      const meta = getFieldMeta(field);
      return !query || meta.label.toLowerCase().includes(query) || field.toLowerCase().includes(query);
    });
  }, [availableComparisonFields, fieldSearch]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="settings-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-modal="true"
        aria-labelledby="analytics-settings-title"
        className="settings-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-modal-header">
          <div>
            <p className="eyebrow">Analytics</p>
            <h2 id="analytics-settings-title">Settings</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close settings" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="settings-row">
          <div className="settings-row-copy">
            <span>Skin</span>
            <p>Choose the visual style for the analytics workspace.</p>
          </div>
          <div className="theme-switch skin-switch" role="radiogroup" aria-label="Analytics skin">
            {SKIN_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={skin === option.id}
                className={skin === option.id ? 'active' : ''}
                onClick={() => onSkinChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <span>Theme</span>
            <p>Switch the analytics workspace between dark and light modes.</p>
          </div>
          <div className="theme-switch" role="radiogroup" aria-label="Analytics theme">
            <button
              type="button"
              role="radio"
              aria-checked={themeMode === 'dark'}
              className={themeMode === 'dark' ? 'active' : ''}
              onClick={() => onThemeChange('dark')}
            >
              <Moon size={15} />
              Dark
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={themeMode === 'light'}
              className={themeMode === 'light' ? 'active' : ''}
              onClick={() => onThemeChange('light')}
            >
              <Sun size={15} />
              Light
            </button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <span>Accent color</span>
            <p>Override the primary accent color for the current skin. Right-click the palette icon (or use this picker) to reset to default.</p>
          </div>
          <div className="settings-accent-row">
            <span className="color-picker-anchor">
              <button
                className="icon-button"
                type="button"
                aria-label="Pick accent color"
                title={accentOverride ? `Accent: ${accentOverride}` : 'Customize accent color'}
                onClick={() => accentColorInputRef.current?.click()}
              >
                <Palette size={18} />
              </button>
              <input
                ref={accentColorInputRef}
                type="color"
                value={accentOverride ?? '#7a8ba8'}
                onChange={(e) => onAccentChange(e.target.value)}
                className="color-picker-input"
              />
            </span>
            <span
              className="color-swatch"
              style={{ background: accentOverride ?? 'var(--accent)' }}
              onClick={() => accentColorInputRef.current?.click()}
            />
            {accentOverride ? (
              <button
                className="icon-button"
                type="button"
                aria-label="Reset accent to default"
                title="Reset to default"
                onClick={() => onAccentChange(null)}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <span>Layout density</span>
            <p>Controls spacing and sizing throughout the workspace.</p>
          </div>
          <div className="theme-switch" role="radiogroup" aria-label="Layout density">
            <button
              type="button"
              role="radio"
              aria-checked={densityMode === 'comfortable'}
              className={densityMode === 'comfortable' ? 'active' : ''}
              onClick={() => onDensityChange('comfortable')}
            >
              <Maximize2 size={15} />
              Comfortable
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={densityMode === 'compact'}
              className={densityMode === 'compact' ? 'active' : ''}
              onClick={() => onDensityChange('compact')}
            >
              <Minimize2 size={15} />
              Compact
            </button>
          </div>
        </div>
        <div className="settings-row settings-row-stacked">
          <div className="settings-row-copy">
            <span>Field comparison defaults</span>
            <p>Choose up to six fields that should be selected when the comparison panel starts.</p>
          </div>
          <div className="settings-field-defaults">
            <label className="search-box">
              <Search size={16} />
              <input
                value={fieldSearch}
                onChange={(event) => setFieldSearch(event.target.value)}
                placeholder="Search fields"
              />
            </label>
            <div className="field-chips settings-field-chips">
              {filteredComparisonFields.map((field) => {
                const meta = getFieldMeta(field);
                const active = selectedDefaultFields.includes(field);
                return (
                  <button
                    key={field}
                    type="button"
                    className={`chip chip-${meta.category.toLowerCase()}${active ? ' active' : ''}`}
                    onClick={() => {
                      onComparisonDefaultFieldsChange(
                        active
                          ? selectedDefaultFields.filter((item) => item !== field)
                          : [...selectedDefaultFields, field].slice(-MAX_COMPARISON_FIELDS),
                      );
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
