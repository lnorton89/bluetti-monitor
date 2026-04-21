import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export type StatHelpContent = {
  summary?: string;
  dataPoints: string[];
  calculation: string[];
  note?: string;
};

interface StatHelpTooltipProps {
  label: string;
  content: StatHelpContent;
}

export function StatHelpTooltip({ label, content }: StatHelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const popoverId = useId();

  function clearCloseTimer() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 120);
  }

  function updatePosition() {
    const button = buttonRef.current;
    const popover = popoverRef.current;
    if (!button || !popover) {
      return;
    }

    const buttonRect = button.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const gutter = 16;
    const preferredWidth = Math.min(popoverRect.width || 320, window.innerWidth - gutter * 2);
    const openRight = buttonRect.left < 240;
    const left = openRight
      ? Math.min(buttonRect.left, window.innerWidth - preferredWidth - gutter)
      : Math.max(gutter, buttonRect.right - preferredWidth);
    const fitsBelow = buttonRect.bottom + 10 + popoverRect.height <= window.innerHeight - gutter;
    const top = fitsBelow
      ? buttonRect.bottom + 10
      : Math.max(gutter, buttonRect.top - popoverRect.height - 10);

    setPopoverStyle({
      left,
      top,
      width: preferredWidth,
    });
  }

  useEffect(() => {
    if (!open) {
      setPopoverStyle(undefined);
      return undefined;
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    function handlePointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKeydown);
      clearCloseTimer();
    };
  }, [open]);

  return (
    <>
      <span className="stat-help-anchor">
        <button
          ref={buttonRef}
          type="button"
          className={`stat-help-button${open ? ' is-open' : ''}`}
          aria-label={`Explain ${label}`}
          aria-expanded={open}
          aria-controls={popoverId}
          onMouseEnter={() => {
            clearCloseTimer();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
          onFocus={() => {
            clearCloseTimer();
            setOpen(true);
          }}
          onBlur={scheduleClose}
          onClick={() => {
            clearCloseTimer();
            setOpen((current) => !current);
          }}
        >
          <Info size={12} />
        </button>
      </span>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              id={popoverId}
              ref={popoverRef}
              role="tooltip"
              className="stat-help-popover is-open"
              style={popoverStyle}
              onMouseEnter={clearCloseTimer}
              onMouseLeave={scheduleClose}
            >
              <span className="stat-help-title">{label}</span>
              {content.summary ? <span className="stat-help-summary">{content.summary}</span> : null}

              <span className="stat-help-section-label">Uses</span>
              <span className="stat-help-list">
                {content.dataPoints.map((item) => (
                  <span key={item} className="stat-help-list-item">{item}</span>
                ))}
              </span>

              <span className="stat-help-section-label">Calculation</span>
              <span className="stat-help-list">
                {content.calculation.map((item) => (
                  <span key={item} className="stat-help-list-item">{item}</span>
                ))}
              </span>

              {content.note ? <span className="stat-help-note">{content.note}</span> : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
