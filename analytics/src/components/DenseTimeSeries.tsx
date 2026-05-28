import { memo, useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface DenseSeries {
  label: string;
  color: string;
  values: Array<number | null>;
  unit?: string;
  digits?: number;
}

interface DenseTimeSeriesProps {
  deferMs?: number;
  timestamps: number[];
  series: DenseSeries[];
  themeMode?: 'dark' | 'light';
}

const CHART_THEME = {
  dark: {
    axis: '#9aa0a6',
    grid: 'rgba(231, 228, 238, 0.16)',
    tick: 'rgba(231, 228, 238, 0.28)',
  },
  light: {
    axis: '#6f6876',
    grid: 'rgba(61, 58, 66, 0.08)',
    tick: 'rgba(61, 58, 66, 0.22)',
  },
} satisfies Record<NonNullable<DenseTimeSeriesProps['themeMode']>, { axis: string; grid: string; tick: string }>;

function DenseTimeSeriesComponent({ deferMs = 0, timestamps, series, themeMode = 'dark' }: DenseTimeSeriesProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dataRef = useRef<uPlot.AlignedData | null>(null);
  const plottedDataRef = useRef<uPlot.AlignedData | null>(null);
  const timestampsRef = useRef(timestamps);
  const seriesRef = useRef(series);
  const hasData = timestamps.length > 0 && series.length > 0;

  const data = useMemo(() => {
    const x = timestamps.map((ts) => ts / 1000);
    return [x, ...series.map((item) => item.values.map((value) => value ?? null))] as uPlot.AlignedData;
  }, [series, timestamps]);
  const seriesStructureKey = useMemo(
    () => series.map((item) => `${item.label}:${item.unit ?? ''}:${item.digits ?? ''}`).join('|'),
    [series],
  );
  const seriesColorsKey = useMemo(
    () => series.map((item) => item.color).join('|'),
    [series],
  );

  useEffect(() => {
    timestampsRef.current = timestamps;
    seriesRef.current = series;
    dataRef.current = data;
  }, [data, series, timestamps]);

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

      const theme = CHART_THEME[themeMode];
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
                const index = chart.cursor.idx;
                const currentTimestamps = timestampsRef.current;
                const currentSeries = seriesRef.current;
                if (index === null || index === undefined || index < 0 || index >= currentTimestamps.length) {
                  tooltip.hidden = true;
                  return;
                }

                tooltip.hidden = false;
                tooltip.innerHTML = buildTooltipHtml(currentTimestamps[index], currentSeries, index);

                const cursorLeft = chart.cursor.left ?? 0;
                const cursorTop = chart.cursor.top ?? 0;
                const tooltipWidth = tooltip.offsetWidth;
                const tooltipHeight = tooltip.offsetHeight;
                const xOffset = cursorLeft > chart.bbox.width - tooltipWidth - 24 ? -tooltipWidth - 12 : 12;
                const yOffset = cursorTop > chart.bbox.height - tooltipHeight - 24 ? -tooltipHeight - 12 : 12;

                tooltip.style.transform = `translate(${Math.max(8, cursorLeft + xOffset)}px, ${Math.max(8, cursorTop + yOffset)}px)`;
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
          ],
        },
        currentData,
        host,
      );

      plotRef.current = plot;
      plottedDataRef.current = currentData;

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

    const theme = CHART_THEME[themeMode];
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
