#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../public/analytics-data.json');

const apiBase = (process.env.ANALYTICS_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
const days = Number.parseInt(process.env.ANALYTICS_EXPORT_DAYS ?? '7', 10);
const limit = Number.parseInt(process.env.ANALYTICS_EXPORT_LIMIT ?? '84000', 10);
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

async function getJson(path, description) {
  const url = `${apiBase}${path}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${description} failed: ${response.status} ${response.statusText} (${url})`);
  }

  return response.json();
}

async function main() {
  console.log(`[analytics:export] API: ${apiBase}`);
  console.log(`[analytics:export] Window: ${days}d since ${since}`);

  const [status, devices] = await Promise.all([
    getJson('/status', 'status export'),
    getJson('/devices', 'device export'),
  ]);

  const fieldsByDevice = {};
  const historyRows = [];

  for (const device of devices) {
    const fields = await getJson(`/fields/${encodeURIComponent(device)}`, `field export for ${device}`);
    fieldsByDevice[device] = fields;

    if (fields.length === 0) {
      continue;
    }

    const params = new URLSearchParams({
      fields: fields.join(','),
      since,
      limit: String(limit),
    });
    const history = await getJson(
      `/history/${encodeURIComponent(device)}?${params.toString()}`,
      `history export for ${device}`,
    );

    for (const [field, points] of Object.entries(history)) {
      for (const point of points) {
        historyRows.push({
          device,
          field,
          value: String(point.value),
          ts: String(point.ts),
        });
      }
    }
  }

  historyRows.sort((left, right) => (
    left.device.localeCompare(right.device)
    || left.field.localeCompare(right.field)
    || Date.parse(right.ts) - Date.parse(left.ts)
  ));

  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceApi: apiBase,
    range: { days, since, limit },
    status,
    devices,
    fieldsByDevice,
    historyRows,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload)}\n`, 'utf8');

  console.log(`[analytics:export] Wrote ${historyRows.length.toLocaleString()} rows to ${outputPath}`);
}

main().catch((error) => {
  console.error(`[analytics:export] ${error instanceof Error ? error.message : String(error)}`);
  console.error('[analytics:export] Start the local API or set ANALYTICS_API_URL before running this script.');
  process.exit(1);
});
