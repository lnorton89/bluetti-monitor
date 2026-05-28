import { useMemo } from 'react';
import { clampPercent, findPeak, getEnergyDelta, summarize, type TimelinePoint } from '../lib/analytics';

export interface TimelineSummary {
  batterySummary: ReturnType<typeof summarize>;
  chargeShare: number | null;
  coverage: number | null;
  dcInput1PowerSummary: ReturnType<typeof summarize>;
  dcInput1VoltageSummary: ReturnType<typeof summarize>;
  dcInput2PowerSummary: ReturnType<typeof summarize>;
  dcInput2VoltageSummary: ReturnType<typeof summarize>;
  energyDelta: number | null;
  inputSummary: ReturnType<typeof summarize>;
  netSummary: ReturnType<typeof summarize>;
  outputSummary: ReturnType<typeof summarize>;
  peakLoad: TimelinePoint | null;
  peakSolar: TimelinePoint | null;
  solarShare: number | null;
  solarSummary: ReturnType<typeof summarize>;
  solarVoltageSummary: ReturnType<typeof summarize>;
  voltageSummary: ReturnType<typeof summarize>;
}

export function useTimelineSummary(timeline: TimelinePoint[]): TimelineSummary {
  return useMemo(() => {
    const input = summarize(timeline, 'totalInput');
    const output = summarize(timeline, 'totalOutput');
    const net = summarize(timeline, 'netPower');
    const solar = summarize(timeline, 'solarInput');
    const chargeBuckets = timeline.filter((point) => typeof point.netPower === 'number' && point.netPower >= 0).length;
    const netBuckets = timeline.filter((point) => typeof point.netPower === 'number').length;

    return {
      inputSummary: input,
      outputSummary: output,
      netSummary: net,
      solarSummary: solar,
      solarVoltageSummary: summarize(timeline, 'solarVoltage'),
      dcInput1PowerSummary: summarize(timeline, 'dcInput1Power'),
      dcInput1VoltageSummary: summarize(timeline, 'dcInput1Voltage'),
      dcInput2PowerSummary: summarize(timeline, 'dcInput2Power'),
      dcInput2VoltageSummary: summarize(timeline, 'dcInput2Voltage'),
      batterySummary: summarize(timeline, 'batteryPercent'),
      voltageSummary: summarize(timeline, 'batteryVoltage'),
      energyDelta: getEnergyDelta(timeline),
      peakLoad: findPeak(timeline, 'totalOutput'),
      peakSolar: findPeak(timeline, 'solarInput'),
      solarShare: clampPercent(input && solar && input.avg > 0 ? (solar.avg / input.avg) * 100 : null),
      coverage: clampPercent(input && output && output.avg > 0 ? (input.avg / output.avg) * 100 : null),
      chargeShare: clampPercent(netBuckets > 0 ? (chargeBuckets / netBuckets) * 100 : null),
    };
  }, [timeline]);
}
