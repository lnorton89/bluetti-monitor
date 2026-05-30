import { memo, useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { Annotation } from '../lib/annotations';

export interface DenseSeries {
  label: string;
  color: string;
  values: Array<number | null>;
  unit?: string;
  digits?: number;
  dashed?: boolean;
}

export interface ComparisonSeriesGroup {
  label: string;
  color: string;
  timestamps: number[];
  values: Array<number | null>;
  unit?: string;
  digits?: number;
  isComparison?: boolean;
}

interface DenseTimeSeriesProps {
  deferMs?: number;
  timestamps: number[];
  series: DenseSeries[];
  comparisonSeries?: ComparisonSeriesGroup[];
  themeMode?: 'dark' | 'light';
  loading?: boolean;
  annotations?: Annotation[];
  onClickPoint?: (ts: number, rect: DOMRect) => void;
}

function getChartTheme() {
  const style = getComputedStyle(document.documentElement);
  return {
    axis: style.getPropertyValue('--chart-axis').trim() || '#9aa0a6',
    grid: style.getPropertyValue('--chart-grid').trim() || 'rgba(231, 228, 238, 0.16)',
    tick: style.getPropertyValue('--chart-grid').trim() || 'rgba(231, 228, 238, 0.28)',
  };
}

function DenseTimeSeriesComponent({ deferMs = 0, timestamps, series, comparisonSeries, themeMode = 'dark', loading = false, annotations, onClickPoint }: DenseTimeSeriesProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dataRef = useRef<uPlot.AlignedData | null>(null);
  const plottedDataRef = useRef<uPlot.AlignedData | null>(null);
  const timestampsRef = useRef(timestamps);
  const seriesRef = useRef(series);
  const comparisonSeriesRef = useRef(comparisonSeries);
  const seriesMetaRef = useRef<Array<{ unit: string; digits: number }>>([]);
  const annotationsRef = useRef(annotations);
  const onClickPointRef = useRef(onClickPoint);
  const hasData = timestamps.length > 0 && series.length > 0;
  const ANNOTATION_DOT_RADIUS = 5;
  const ANNOTATION_DOT_Y_OFFSET = 10;

  const mergedTimestamps = useMemo(() => {
    if (!comparisonSeries) return timestamps;
    const allTss = new Set(timestamps);
    for (const cs of comparisonSeries) {
      for (const ts of cs.timestamps) {
        allTss.add(ts);
      }
    }
    return Array.from(allTss).sort((a, b) => a - b);
  }, [timestamps, comparisonSeries]);

  const allSeries = useMemo(() => {
    const primary = series.map((s) => ({ ...s, dashed: false }));
    if (!comparisonSeries) return primary;
    const comp = comparisonSeries.map((cs) => ({
      label: cs.label,
      color: cs.color,
      values: cs.values,
      unit: cs.unit,
      digits: cs.digits,
      dashed: true,
    }));
    return [...primary, ...comp];
  }, [series, comparisonSeries]);

  const seriesMeta = useMemo(
    () => allSeries.map((s) => ({ unit: s.unit ?? '', digits: s.digits ?? 1 })),
    [allSeries],
  );

  const data = useMemo(() => {
    const x = mergedTimestamps.map((ts) => ts / 1000);
    const tsMap = new Map(timestamps.map((ts, i) => [ts, i]));
    const primaryRows = series.map((s) =>
      mergedTimestamps.map((ts) => {
        const idx = tsMap.get(ts);
        return idx !== undefined ? (s.values[idx] ?? null) : null;
      }),
    );
    const compRows = comparisonSeries
      ? comparisonSeries.map((cs) => {
          const csMap = new Map(cs.timestamps.map((ts, i) => [ts, i]));
          return mergedTimestamps.map((ts) => {
            const idx = csMap.get(ts);
            return idx !== undefined ? (cs.values[idx] ?? null) : null;
          });
        })
      : [];
    return [x, ...primaryRows, ...compRows] as uPlot.AlignedData;
  }, [mergedTimestamps, timestamps, series, comparisonSeries]);
  const seriesStructureKey = useMemo(
    () => allSeries.map((item) => `${item.label}:${item.unit ?? ''}:${item.digits ?? ''}:${item.dashed ?? false}`).join('|'),
    [allSeries],
  );
  const seriesColorsKey = useMemo(
    () => allSeries.map((item) => item.color).join('|'),
    [allSeries],
  );

  useEffect(() => {
    timestampsRef.current = timestamps;
    seriesRef.current = series;
    comparisonSeriesRef.current = comparisonSeries;
    seriesMetaRef.current = seriesMeta;
    dataRef.current = data;
    annotationsRef.current = annotations;
    onClickPointRef.current = onClickPoint;
  }, [data, series, timestamps, comparisonSeries, seriesMeta, annotations, onClickPoint]);

  useEffect(() => {
    if (!hasData) {
      plotRef.current?.destroy();
      plotRef.current = null;
      plottedDataRef.current = null;
      return undefined;
    }

    let cancelled = false;
    let mountTimer: number | null = window.setTimeout(() => {
      mountTimer = null;
      if (cancelled) {
        return;
      }

      const host = hostRef.current;
      const tooltip = tooltipRef.current;
      if (!host || !tooltip) {
        return;
      }

      plotRef.current?.destroy();

      const theme = getChartTheme();
      const width = Math.max(260, host.clientWidth);
      const currentData = dataRef.current ?? data;
      const plot = new uPlot(
        {
          width,
          height: 260,
          cursor: { drag: { x: true, y: false } },
          legend: { show: false },
          scales: { x: { time: true } },
          axes: [
            { stroke: theme.axis, grid: { stroke: theme.grid, width: 1 }, ticks: { stroke: theme.tick, width: 1, size: 7 } },
            { stroke: theme.axis, grid: { stroke: theme.grid, width: 1 }, ticks: { stroke: theme.tick, width: 1, size: 6 } },
          ],
          hooks: {
            setCursor: [
              (chart) => {
                const idx = chart.cursor.idx;
                if (idx === null || idx === undefined || idx < 0) {
                  tooltip.hidden = true;
                  return;
                }

                const xVal = chart.data[0]?.[idx];
                if (xVal === undefined) {
                  tooltip.hidden = true;
                  return;
                }

                const rows: string[] = [];
                const meta = seriesMetaRef.current;
                for (let si = 1; si < chart.data.length; si++) {
                  const s = chart.series[si];
                  const val = chart.data[si]?.[idx];
                  if (s.show === false) continue;
                  const label = typeof s.label === 'string' ? s.label : `Series ${si}`;
                  const stroke = typeof s.stroke === 'function' ? s.stroke() : (s.stroke ?? '#888');
                  const m = meta[si - 1];
                  const formatted = typeof val === 'number' && Number.isFinite(val)
                    ? formatTooltipValue(val, m?.unit, m?.digits)
                    : '--';
                  rows.push(`<div class="dense-tooltip-row"><span><i style="background:${stroke}"></i>${escapeHtml(label)}</span><strong>${formatted}</strong></div>`);
                }

                tooltip.hidden = false;
                tooltip.innerHTML = `<div class="dense-tooltip-time">${escapeHtml(formatTooltipTime(xVal * 1000))}</div>${rows.join('')}`;

                const cursorLeft = chart.cursor.left ?? 0;
                const cursorTop = chart.cursor.top ?? 0;
                const tooltipWidth = tooltip.offsetWidth;
                const tooltipHeight = tooltip.offsetHeight;
                const xOffset = cursorLeft > chart.bbox.width - tooltipWidth - 24 ? -tooltipWidth - 12 : 12;
                const yOffset = cursorTop > chart.bbox.height - tooltipHeight - 24 ? -tooltipHeight - 12 : 12;

                tooltip.style.transform = `translate(${Math.max(8, cursorLeft + xOffset)}px, ${Math.max(8, cursorTop + yOffset)}px)`;
              },
            ],
            draw: [
              (chart) => {
                const anns = annotationsRef.current;
                if (!anns || anns.length === 0) return;
                const ctx = chart.ctx;
                ctx.save();
                for (const ann of anns) {
                  const cx = chart.valToPos(ann.ts / 1000, 'x');
                  if (cx < chart.bbox.left || cx > chart.bbox.left + chart.bbox.width) continue;
                  const cy = chart.bbox.top + ANNOTATION_DOT_Y_OFFSET;
                  ctx.beginPath();
                  ctx.arc(cx, cy, ANNOTATION_DOT_RADIUS, 0, Math.PI * 2);
                  ctx.fillStyle = ann.color ?? '#fbbf24';
                  ctx.fill();
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 1.5;
                  ctx.stroke();
                }
                ctx.restore();
              },
            ],
          },
          series: [
            {},
            ...series.map((item) => ({
              label: item.label,
              stroke: item.color,
              width: 2,
              points: { show: false },
            })),
            ...(comparisonSeries ?? []).map((item) => ({
              label: item.label,
              stroke: item.color,
              width: 1.5,
              dash: [5, 5],
              points: { show: false },
            })),
          ],
        },
        currentData,
        host,
      );

      plotRef.current = plot;
      plottedDataRef.current = currentData;

      let mouseDownX = 0;
      let mouseDownY = 0;
      const onMouseDown = (e: MouseEvent) => {
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;
      };
      const onMouseUp = (e: MouseEvent) => {
        const dx = Math.abs(e.clientX - mouseDownX);
        const dy = Math.abs(e.clientY - mouseDownY);
        if (dx < 5 && dy < 5) {
          const cb = onClickPointRef.current;
          if (cb) {
            const ts = plot.posToVal(e.offsetX, 'x') * 1000;
            cb(ts, host.getBoundingClientRect());
          }
        }
      };
      host.addEventListener('mousedown', onMouseDown);
      host.addEventListener('mouseup', onMouseUp);

      const resizeObserver = new ResizeObserver(([entry]) => {
        plot.setSize({ width: Math.max(260, entry.contentRect.width), height: 260 });
      });
      resizeObserver.observe(host);
      resizeObserverRef.current = resizeObserver;
    }, deferMs);

    return () => {
      cancelled = true;
      if (mountTimer !== null) {
        window.clearTimeout(mountTimer);
      }
      const host = hostRef.current;
      if (host) {
        host.removeEventListener('mousedown', onMouseDown);
        host.removeEventListener('mouseup', onMouseUp);
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      plotRef.current?.destroy();
      plotRef.current = null;
      plottedDataRef.current = null;
    };
  }, [deferMs, hasData, seriesStructureKey]);

  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) {
      return;
    }

    const theme = getChartTheme();
    for (const axis of plot.axes ?? []) {
      axis.stroke = () => theme.axis;
      if (axis.grid) {
        axis.grid.stroke = () => theme.grid;
      }
      if (axis.ticks) {
        axis.ticks.stroke = () => theme.tick;
      }
    }

    for (let i = 0; i < series.length; i++) {
      const uSeries = plot.series[i + 1];
      if (uSeries) {
        const color = series[i].color;
        uSeries.stroke = () => color;
      }
    }

    plot.redraw();
  }, [themeMode, seriesColorsKey]);

  useEffect(() => {
    if (!plotRef.current || !hasData || plottedDataRef.current === data) {
      return undefined;
    }

    const updateTimer = window.setTimeout(() => {
      if (plotRef.current && plottedDataRef.current !== data) {
        plotRef.current.setData(data);
        plottedDataRef.current = data;
      }
    }, deferMs);

    return () => window.clearTimeout(updateTimer);
  }, [data, deferMs, hasData]);

  if (!hasData) {
    return <div className="empty-chart">Select numeric fields to render dense telemetry.</div>;
  }

  return (
    <div className="dense-chart-shell">
      <div className="dense-chart" ref={hostRef} />
      <div className="dense-tooltip" ref={tooltipRef} hidden />
      {loading ? <div className="chart-loading-overlay"><div className="chart-loading-spinner" /></div> : null}
    </div>
  );
}

export const DenseTimeSeries = memo(DenseTimeSeriesComponent);
DenseTimeSeries.displayName = 'DenseTimeSeries';

function buildTooltipHtml(timestamp: number, series: DenseSeries[], index: number) {
  const rows = series
    .map((item) => {
      const value = item.values[index];
      return `
        <div class="dense-tooltip-row">
          <span><i style="background:${item.color}"></i>${escapeHtml(item.label)}</span>
          <strong>${formatTooltipValue(value, item.unit, item.digits)}</strong>
        </div>
      `;
    })
    .join('');

  return `
    <div class="dense-tooltip-time">${escapeHtml(formatTooltipTime(timestamp))}</div>
    ${rows}
  `;
}

function formatTooltipTime(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTooltipValue(value: number | null, unit = '', digits = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  const formatted = value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

  return unit ? `${formatted} ${escapeHtml(unit)}` : formatted;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
