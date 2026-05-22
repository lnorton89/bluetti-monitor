import { useEffect, useMemo, useRef } from 'react';
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
  timestamps: number[];
  series: DenseSeries[];
}

export function DenseTimeSeries({ timestamps, series }: DenseTimeSeriesProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);

  const data = useMemo(() => {
    const x = timestamps.map((ts) => ts / 1000);
    return [x, ...series.map((item) => item.values.map((value) => value ?? null))] as uPlot.AlignedData;
  }, [series, timestamps]);

  useEffect(() => {
    const host = hostRef.current;
    const tooltip = tooltipRef.current;
    if (!host || !tooltip) {
      return undefined;
    }

    plotRef.current?.destroy();

    const width = Math.max(260, host.clientWidth);
    const plot = new uPlot(
      {
        width,
        height: 260,
        cursor: { drag: { x: true, y: false } },
        legend: { show: false },
        scales: { x: { time: true } },
        axes: [
          { stroke: '#6b7280', grid: { stroke: '#1f2937', width: 1 } },
          { stroke: '#6b7280', grid: { stroke: '#1f2937', width: 1 } },
        ],
        hooks: {
          setCursor: [
            (chart) => {
              const index = chart.cursor.idx;
              if (index === null || index === undefined || index < 0 || index >= timestamps.length) {
                tooltip.hidden = true;
                return;
              }

              tooltip.hidden = false;
              tooltip.innerHTML = buildTooltipHtml(timestamps[index], series, index);

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
      data,
      host,
    );

    plotRef.current = plot;

    const resizeObserver = new ResizeObserver(([entry]) => {
      plot.setSize({ width: Math.max(260, entry.contentRect.width), height: 260 });
    });
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
  }, [data, series]);

  if (timestamps.length === 0 || series.length === 0) {
    return <div className="empty-chart">Select numeric fields to render dense telemetry.</div>;
  }

  return (
    <div className="dense-chart-shell">
      <div className="dense-chart" ref={hostRef} />
      <div className="dense-tooltip" ref={tooltipRef} hidden />
    </div>
  );
}

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
