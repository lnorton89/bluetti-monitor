import { useCallback, useSyncExternalStore } from 'react';
import type { Annotation } from '../lib/annotations';
import { getAnnotations, saveAnnotation, deleteAnnotation, createAnnotationId } from '../lib/annotations';

function subscribe(device: string, onStoreChange: () => void) {
  const handler = (event: StorageEvent) => {
    if (event.key === `analytics-annotations-${device}`) {
      onStoreChange();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function getSnapshot(device: string) {
  return getAnnotations(device);
}

export function useAnnotations(device: string) {
  const annotations = useSyncExternalStore(
    (cb) => subscribe(device, cb),
    () => getSnapshot(device),
    () => getSnapshot(device),
  );

  const addAnnotation = useCallback((ts: number, text: string, color?: string) => {
    saveAnnotation(device, {
      ts,
      text,
      color,
      id: createAnnotationId(),
      created: Date.now(),
    });
    window.dispatchEvent(new StorageEvent('storage', { key: `analytics-annotations-${device}` }));
  }, [device]);

  const updateAnnotation = useCallback((id: string, updates: Partial<Pick<Annotation, 'text' | 'color' | 'ts'>>) => {
    const existing = annotations.find((a) => a.id === id);
    if (existing) {
      saveAnnotation(device, { ...existing, ...updates });
      window.dispatchEvent(new StorageEvent('storage', { key: `analytics-annotations-${device}` }));
    }
  }, [device, annotations]);

  const removeAnnotation = useCallback((id: string) => {
    deleteAnnotation(device, id);
    window.dispatchEvent(new StorageEvent('storage', { key: `analytics-annotations-${device}` }));
  }, [device]);

  const annotationsInRange = useCallback((startMs: number, endMs: number) => {
    return annotations.filter((a) => a.ts >= startMs && a.ts <= endMs).sort((a, b) => a.ts - b.ts);
  }, [annotations]);

  return { annotations, addAnnotation, updateAnnotation, removeAnnotation, annotationsInRange };
}
