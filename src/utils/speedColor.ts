function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

// Scale: blue (0 m/s) → green (avg) → red (2× avg)
export function speedColor(speedMs: number, avgSpeedMs: number): string {
  if (avgSpeedMs <= 0) return "#22c55e";
  const t = Math.max(0, Math.min(2, speedMs / avgSpeedMs));
  if (t <= 1) return lerpColor("#378add", "#22c55e", t);
  return lerpColor("#22c55e", "#ef4444", t - 1);
}
