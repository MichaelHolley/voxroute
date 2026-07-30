import type { GpxPoint } from "../composables/useGpxParser.ts";

export type ElevationExtremeKind = "high" | "low";

export interface ElevationExtreme {
  kind: ElevationExtremeKind;
  index: number;
  ele: number;
}

export const EXTREME_COLORS: Record<ElevationExtremeKind, string> = {
  high: "#eab308",
  low: "#ef4444",
};

export function pickElevationExtremes(points: GpxPoint[]): ElevationExtreme[] {
  if (points.length < 2) return [];

  let highIdx = 0;
  let lowIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].ele > points[highIdx].ele) highIdx = i;
    if (points[i].ele < points[lowIdx].ele) lowIdx = i;
  }
  if (points[highIdx].ele === points[lowIdx].ele) return [];

  return [
    { kind: "high", index: highIdx, ele: points[highIdx].ele },
    { kind: "low", index: lowIdx, ele: points[lowIdx].ele },
  ];
}

export function formatElevationLabel(kind: ElevationExtremeKind, ele: number): string {
  return `${kind === "high" ? "Peak" : "Low"} ${Math.round(ele)} m`;
}
