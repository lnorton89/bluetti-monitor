import { useState } from 'react';
import type { Annotation } from '../lib/annotations';

interface AnnotationPopoverProps {
  timestamp: number;
  existing?: Annotation;
  anchorRect: DOMRect;
  onSave: (text: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function AnnotationPopover({ timestamp, existing, anchorRect, onSave, onDelete, onClose }: AnnotationPopoverProps) {
  const [text, setText] = useState(existing?.text ?? '');
  const timeLabel = new Date(timestamp).toLocaleString();

  return (
    <div
      className="annotation-popover-backdrop"
      onClick={onClose}
    >
      <div
        className="annotation-popover"
        style={{
          position: 'fixed',
          left: Math.min(anchorRect.left + anchorRect.width / 2 - 140, window.innerWidth - 300),
          top: Math.min(anchorRect.bottom + 8, window.innerHeight - 220),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="annotation-popover-time">{timeLabel}</div>
        <textarea
          className="annotation-popover-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What happened here?"
          rows={3}
          autoFocus
        />
        <div className="annotation-popover-actions">
          <button className="annotation-popover-cancel" onClick={onClose}>Cancel</button>
          {existing && onDelete ? (
            <button className="annotation-popover-delete" onClick={onDelete}>Delete</button>
          ) : null}
          <button className="annotation-popover-save" onClick={() => { onSave(text); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}
