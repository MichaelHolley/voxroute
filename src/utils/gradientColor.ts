export interface SlopeStop {
  max: number;
  color: string;
  label: string;
}

export const SLOPE_STOPS: SlopeStop[] = [
  { max: 3, color: "#22c55e", label: "Flat" },
  { max: 6, color: "#eab308", label: "Moderate" },
  { max: 10, color: "#ef4444", label: "Steep" },
  { max: Infinity, color: "#7c3aed", label: "Very Steep" },
];

export function slopeColor(grade: number): string {
  const abs = Math.abs(grade);
  for (const stop of SLOPE_STOPS) {
    if (abs < stop.max) return stop.color;
  }
  return SLOPE_STOPS[SLOPE_STOPS.length - 1].color;
}
