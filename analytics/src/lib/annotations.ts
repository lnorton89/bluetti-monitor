export interface Annotation {
  ts: number;
  text: string;
  color?: string;
  id: string;
  created: number;
}

export interface StoredAnnotations {
  annotations: Annotation[];
}

const ANNOTATIONS_KEY_PREFIX = 'analytics-annotations';

function storageKey(device: string) {
  return `${ANNOTATIONS_KEY_PREFIX}-${device}`;
}

export function getAnnotations(device: string): Annotation[] {
  try {
    const raw = localStorage.getItem(storageKey(device));
    if (!raw) return [];
    const parsed: StoredAnnotations = JSON.parse(raw);
    return parsed.annotations ?? [];
  } catch {
    return [];
  }
}

export function saveAnnotation(device: string, annotation: Annotation): void {
  const annotations = getAnnotations(device);
  const existingIndex = annotations.findIndex((a) => a.id === annotation.id);
  if (existingIndex >= 0) {
    annotations[existingIndex] = annotation;
  } else {
    annotations.push(annotation);
  }
  localStorage.setItem(storageKey(device), JSON.stringify({ annotations }));
}

export function deleteAnnotation(device: string, id: string): void {
  const annotations = getAnnotations(device).filter((a) => a.id !== id);
  localStorage.setItem(storageKey(device), JSON.stringify({ annotations }));
}

export function createAnnotationId(): string {
  return crypto.randomUUID();
}
