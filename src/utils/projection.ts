import * as THREE from "three";
import type { GpxPoint } from "../composables/useGpxParser.ts";

export interface Projection {
  centerLat: number;
  centerLon: number;
  minEle: number;
  scale: number;
  mPerDegLat: number;
  mPerDegLon: number;
  exaggeration: number;
}

export function projectPoints(
  points: GpxPoint[],
  exaggeration: number,
): { positions: THREE.Vector3[]; projection: Projection | null } {
  if (points.length === 0) return { positions: [], projection: null };
  const centerLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const centerLon = points.reduce((s, p) => s + p.lon, 0) / points.length;
  const minEle = Math.min(...points.map((p) => p.ele));
  const mPerDegLat = 111000;
  const mPerDegLon = 111000 * Math.cos((centerLat * Math.PI) / 180);
  const raw = points.map((p) => ({
    x: (p.lon - centerLon) * mPerDegLon,
    z: -(p.lat - centerLat) * mPerDegLat,
    y: p.ele - minEle,
  }));
  const maxH = Math.max(...raw.map((p) => Math.sqrt(p.x ** 2 + p.z ** 2)));
  const scale = maxH > 0 ? 50 / maxH : 1;
  const positions = raw.map(
    (p) => new THREE.Vector3(p.x * scale, p.y * scale * exaggeration, p.z * scale),
  );
  const projection: Projection = {
    centerLat,
    centerLon,
    minEle,
    scale,
    mPerDegLat,
    mPerDegLon,
    exaggeration,
  };
  return { positions, projection };
}

export function projectX(lon: number, proj: Projection): number {
  return (lon - proj.centerLon) * proj.mPerDegLon * proj.scale;
}

export function projectZ(lat: number, proj: Projection): number {
  return -(lat - proj.centerLat) * proj.mPerDegLat * proj.scale;
}

export function projectHeight(h: number, proj: Projection): number {
  return (h - proj.minEle) * proj.scale * proj.exaggeration;
}
