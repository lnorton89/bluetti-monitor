import { useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface DenseSeries {
  label: string;
  color: string;
  values: Array<number | null>;
}

interface DenseTimeSeriesProps {
  timestamps: number[];
  series: DenseSeries[];
}

export function DenseTimeSeries({ timestamps, series }: DenseTimeSeriesProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);

  const data = useMemo(() => {
    const x = timestamps.map((ts) => ts / 1000);
    return [x, ...series.map((item) => item.values.map((value) => value ?? null))] as uPlot.AlignedData;
  }, [series, timestamps]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    plotRef.current?.destroy();

    const width = Math.max(320, host.clientWidth);
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
      plot.setSize({ width: Math.max(320, entry.contentRect.width), height: 260 });
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

  return <div className="dense-chart" ref={hostRef} />;
}

