import { useEffect } from 'react';
import { X } from 'lucide-react';

export function CustomDateRange({
  endIso,
  startIso,
  onApply,
  onClose,
  onEndChange,
  onStartChange,
}: {
  endIso: string;
  startIso: string;
  onApply: () => void;
  onClose: () => void;
  onEndChange: (iso: string) => void;
  onStartChange: (iso: string) => void;
}) {
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
    <>
      <div className="date-picker-flyout-backdrop" role="presentation" onClick={onClose} />
      <section
        aria-modal="true"
        aria-labelledby="date-picker-title"
        className="date-picker-flyout"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="date-picker-flyout-header">
          <h2 id="date-picker-title">Custom Date Range</h2>
          <button className="icon-button" type="button" aria-label="Close date picker" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="date-picker-flyout-body">
          <label className="date-picker-flyout-field">
            <span>From</span>
            <input
              type="datetime-local"
              value={startIso}
              onChange={(e) => onStartChange(e.target.value)}
              aria-label="Custom range start"
            />
          </label>
          <label className="date-picker-flyout-field">
            <span>To</span>
            <input
              type="datetime-local"
              value={endIso}
              onChange={(e) => onEndChange(e.target.value)}
              aria-label="Custom range end"
            />
          </label>
          <button
            type="button"
            className="date-picker-flyout-apply"
            onClick={() => onApply()}
          >
            Apply
          </button>
        </div>
      </section>
    </>
  );
}
