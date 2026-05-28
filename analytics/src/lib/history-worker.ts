import { buildComparisonTimeline, buildTimeline, type ResolvedFields } from './analytics';
import type { FetchHistoryOptions, HistoryPoint } from './api';

type HistoryWorkerRequest =
  | {
      apiBase: string;
      bucketMs: number;
      device: string;
      fields: string[];
      kind: 'core';
      options: FetchHistoryOptions;
      requestId: number;
      resolved: ResolvedFields;
    }
  | {
      apiBase: string;
      bucketMs: number;
      device: string;
      fields: string[];
      kind: 'comparison';
      options: FetchHistoryOptions;
      requestId: number;
    };

self.onmessage = async (event: MessageEvent<HistoryWorkerRequest>) => {
  const request = event.data;

  try {
    const history = await fetchHistoryBundleInWorker(request.apiBase, request.device, request.fields, request.options);
    const timeline = request.kind === 'core'
      ? buildTimeline(request.resolved, history, request.bucketMs)
      : buildComparisonTimeline(request.fields, history, request.bucketMs);

    self.postMessage({ requestId: request.requestId, timeline });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
      requestId: request.requestId,
    });
  }
};

async function fetchHistoryBundleInWorker(
  apiBase: string,
  device: string,
  fields: string[],
  options: FetchHistoryOptions,
) {
  const url = new URL(`${apiBase.replace(/\/$/, '')}/history/${encodeURIComponent(device)}`, self.location.origin);
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  url.searchParams.set('fields', fields.join(','));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`History request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json() as Record<string, HistoryPoint[]>;
}
