import { API_BASE, IS_MOCK_MODE, IS_STATIC_ANALYTICS, fetchHistoryBundle, type FetchHistoryOptions } from './api';
import {
  buildComparisonTimeline,
  buildTimeline,
  type ResolvedFields,
  type TimelinePoint,
} from './analytics';

type ComparisonTimelinePoint = { ts: number } & Record<string, number | null>;

type PendingRequest = {
  reject: (reason?: unknown) => void;
  resolve: (timeline: TimelinePoint[] | ComparisonTimelinePoint[]) => void;
};

type WorkerResponse = {
  error?: string;
  requestId: number;
  timeline?: TimelinePoint[] | ComparisonTimelinePoint[];
};

let worker: Worker | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<number, PendingRequest>();

export function fetchCoreTimelineInWorker(
  device: string,
  fields: string[],
  options: FetchHistoryOptions,
  resolved: ResolvedFields,
  bucketMs: number,
) {
  return requestTimelineWorker<TimelinePoint[]>({
    apiBase: API_BASE,
    bucketMs,
    device,
    fields,
    kind: 'core',
    options,
    resolved,
  }, async () => {
    const history = await fetchHistoryBundle(device, fields, options);
    return buildTimeline(resolved, history, bucketMs);
  });
}

export function fetchComparisonTimelineInWorker(
  device: string,
  fields: string[],
  options: FetchHistoryOptions,
  bucketMs: number,
) {
  return requestTimelineWorker<ComparisonTimelinePoint[]>({
    apiBase: API_BASE,
    bucketMs,
    device,
    fields,
    kind: 'comparison',
    options,
  }, async () => {
    const history = await fetchHistoryBundle(device, fields, options);
    return buildComparisonTimeline(fields, history, bucketMs);
  });
}

function requestTimelineWorker<T extends TimelinePoint[] | ComparisonTimelinePoint[]>(
  message: object,
  fallback: () => Promise<T>,
) {
  if (typeof Worker === 'undefined' || IS_MOCK_MODE || IS_STATIC_ANALYTICS) {
    return fallback();
  }

  const requestId = nextRequestId++;
  const timelineWorker = getHistoryWorker();

  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(requestId, {
      reject,
      resolve: (timeline) => resolve(timeline as T),
    });
    timelineWorker.postMessage({ ...message, requestId });
  });
}

function getHistoryWorker() {
  if (worker) {
    return worker;
  }

  worker = new Worker(new URL('./history-worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const request = pendingRequests.get(event.data.requestId);
    if (!request) {
      return;
    }

    pendingRequests.delete(event.data.requestId);
    if (event.data.error) {
      request.reject(new Error(event.data.error));
      return;
    }

    request.resolve(event.data.timeline ?? []);
  };
  worker.onerror = (event) => {
    for (const request of pendingRequests.values()) {
      request.reject(event.error ?? new Error(event.message));
    }
    pendingRequests.clear();
    worker?.terminate();
    worker = null;
  };

  return worker;
}
