import { useState } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import type { Annotation } from '../lib/annotations';

interface NotesPanelProps {
  annotations: Annotation[];
  onDelete: (id: string) => void;
  onJumpTo: (ts: number) => void;
}

export function NotesPanel({ annotations, onDelete, onJumpTo }: NotesPanelProps) {
  const [open, setOpen] = useState(false);
  const sorted = [...annotations].sort((a, b) => a.ts - b.ts);

  return (
    <div className="notes-panel">
      <button className="notes-panel-toggle" onClick={() => setOpen(!open)}>
        <StickyNote size={15} />
        <span>Notes {annotations.length > 0 ? `(${annotations.length})` : ''}</span>
      </button>
      {open ? (
        <div className="notes-panel-body">
          {sorted.length === 0 ? (
            <p className="notes-panel-empty">Click a chart point to add a note</p>
          ) : (
            sorted.map((note) => (
              <div key={note.id} className="notes-panel-item">
                <button className="notes-panel-jump" onClick={() => onJumpTo(note.ts)} title="Jump to time">
                  {new Date(note.ts).toLocaleString()}
                </button>
                <p className="notes-panel-text">{note.text}</p>
                <button className="notes-panel-delete" onClick={() => onDelete(note.id)} title="Delete note">
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
