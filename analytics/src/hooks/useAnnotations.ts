import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Annotation } from '../lib/annotations';
import { getAnnotations, saveAnnotation, deleteAnnotation, createAnnotationId } from '../lib/annotations';

export function useAnnotations(device: string) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === `analytics-annotations-${device}`) {
        setVersion((v) => v + 1);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [device]);

  const annotations = useMemo(() => getAnnotations(device), [device, version]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const addAnnotation = useCallback((ts: number, text: string, color?: string) => {
    saveAnnotation(device, {
      ts,
      text,
      color,
      id: createAnnotationId(),
      created: Date.now(),
    });
    bump();
  }, [device, bump]);

  const updateAnnotation = useCallback((id: string, updates: Partial<Pick<Annotation, 'text' | 'color' | 'ts'>>) => {
    const existing = annotations.find((a) => a.id === id);
    if (existing) {
      saveAnnotation(device, { ...existing, ...updates });
      bump();
    }
  }, [device, annotations, bump]);

  const removeAnnotation = useCallback((id: string) => {
    deleteAnnotation(device, id);
    bump();
  }, [device, bump]);

  const annotationsInRange = useCallback((startMs: number, endMs: number) => {
    return annotations.filter((a) => a.ts >= startMs && a.ts <= endMs).sort((a, b) => a.ts - b.ts);
  }, [annotations]);

  return { annotations, addAnnotation, updateAnnotation, removeAnnotation, annotationsInRange };
}
