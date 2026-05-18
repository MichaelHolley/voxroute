import * as THREE from "three";
import { projectX, projectZ, projectHeight, type Projection } from "../utils/projection.ts";

export interface TerrainBbox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

const TERRARIUM_BASE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
const TILE_SIZE = 256;
const TARGET_CONTOURS = 22;
const INDEX_INTERVAL = 5;
const PAD_FRAC = 0.35;
const MAX_TILES = 12;
const MAX_TOTAL_TILES = 64;

function getTilePad(): number {
  const raw = import.meta.env.VITE_TERRAIN_TILE_PAD;
  if (raw === undefined || raw === "") return 1;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 1;
  return Math.min(n, 6);
}

function lonToTileX(lon: number, z: number): number {
  return ((lon + 180) / 360) * 2 ** z;
}

function latToTileY(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}

function tileXToLon(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180;
}

function tileYToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function pickZoom(latSpan: number, lonSpan: number, lat: number): number {
  for (let z = 13; z >= 8; z--) {
    const tilesX = Math.ceil((lonSpan / 360) * 2 ** z) + 1;
    const cosLat = Math.cos((lat * Math.PI) / 180) || 1;
    const tilesY = Math.ceil(((latSpan / 360) * 2 ** z) / cosLat) + 1;
    if (tilesX * tilesY <= MAX_TILES) return z;
  }
  return 8;
}

async function fetchTile(
  z: number,
  x: number,
  y: number,
  signal?: AbortSignal,
): Promise<Float32Array> {
  const url = `${TERRARIUM_BASE}/${z}/${x}/${y}.png`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`tile ${z}/${x}/${y} HTTP ${res.status}`);
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bmp.close();
    throw new Error("2d context unavailable");
  }
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const d = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
  const out = new Float32Array(TILE_SIZE * TILE_SIZE);
  for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) {
    out[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
  }
  return out;
}

function niceStep(rawStep: number): number {
  const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  for (const n of nice) if (n >= rawStep) return n;
  return rawStep;
}

export async function buildTerrainContours(
  projection: Projection,
  bbox: TerrainBbox,
  opts: { signal?: AbortSignal } = {},
): Promise<THREE.Group | null> {
  const latC = (bbox.maxLat + bbox.minLat) / 2;
  const lonC = (bbox.maxLon + bbox.minLon) / 2;
  const latSpan = Math.max(bbox.maxLat - bbox.minLat, 0.005) * (1 + PAD_FRAC);
  const lonSpan = Math.max(bbox.maxLon - bbox.minLon, 0.005) * (1 + PAD_FRAC);
  const minLat = latC - latSpan / 2;
  const maxLat = latC + latSpan / 2;
  const minLon = lonC - lonSpan / 2;
  const maxLon = lonC + lonSpan / 2;

  const z = pickZoom(latSpan, lonSpan, latC);
  let x0 = Math.floor(lonToTileX(minLon, z));
  let x1 = Math.floor(lonToTileX(maxLon, z));
  let y0 = Math.floor(latToTileY(maxLat, z));
  let y1 = Math.floor(latToTileY(minLat, z));

  let pad = getTilePad();
  const maxTileIdx = 2 ** z - 1;
  while (pad > 0) {
    const w = x1 - x0 + 1 + 2 * pad;
    const h = y1 - y0 + 1 + 2 * pad;
    if (w * h <= MAX_TOTAL_TILES) break;
    pad--;
  }
  x0 = Math.max(0, x0 - pad);
  x1 = Math.min(maxTileIdx, x1 + pad);
  y0 = Math.max(0, y0 - pad);
  y1 = Math.min(maxTileIdx, y1 + pad);

  const tilesW = x1 - x0 + 1;
  const tilesH = y1 - y0 + 1;

  const fetches: Promise<Float32Array>[] = [];
  for (let ty = 0; ty < tilesH; ty++) {
    for (let tx = 0; tx < tilesW; tx++) {
      fetches.push(fetchTile(z, x0 + tx, y0 + ty, opts.signal));
    }
  }
  const tiles = await Promise.all(fetches);

  const gridW = tilesW * TILE_SIZE;
  const gridH = tilesH * TILE_SIZE;
  const grid = new Float32Array(gridW * gridH);
  for (let ty = 0; ty < tilesH; ty++) {
    for (let tx = 0; tx < tilesW; tx++) {
      const tile = tiles[ty * tilesW + tx];
      for (let py = 0; py < TILE_SIZE; py++) {
        const dstRow = (ty * TILE_SIZE + py) * gridW + tx * TILE_SIZE;
        const srcRow = py * TILE_SIZE;
        for (let px = 0; px < TILE_SIZE; px++) {
          grid[dstRow + px] = tile[srcRow + px];
        }
      }
    }
  }

  const worldX = new Float32Array(gridW);
  const worldZ = new Float32Array(gridH);
  for (let col = 0; col < gridW; col++) {
    const lon = tileXToLon(x0 + col / TILE_SIZE, z);
    worldX[col] = projectX(lon, projection);
  }
  for (let row = 0; row < gridH; row++) {
    const lat = tileYToLat(y0 + row / TILE_SIZE, z);
    worldZ[row] = projectZ(lat, projection);
  }

  const colStart = 0;
  const colEnd = gridW - 1;
  const rowStart = 0;
  const rowEnd = gridH - 1;

  let hMin = Infinity;
  let hMax = -Infinity;
  for (let r = rowStart; r <= rowEnd; r++) {
    const rowBase = r * gridW;
    for (let c = colStart; c <= colEnd; c++) {
      const h = grid[rowBase + c];
      if (h < hMin) hMin = h;
      if (h > hMax) hMax = h;
    }
  }
  if (!isFinite(hMin) || !isFinite(hMax) || hMax - hMin < 1) return null;

  const step = niceStep((hMax - hMin) / TARGET_CONTOURS);
  const firstLevel = Math.ceil(hMin / step) * step;
  const lastLevel = Math.floor(hMax / step) * step;

  const minorVerts: number[] = [];
  const majorVerts: number[] = [];

  for (let level = firstLevel; level <= lastLevel; level += step) {
    const y = projectHeight(level, projection);
    const isMajor = Math.round(level / step) % INDEX_INTERVAL === 0;
    const target = isMajor ? majorVerts : minorVerts;

    for (let r = rowStart; r < rowEnd; r++) {
      const rowTop = r * gridW;
      const rowBot = (r + 1) * gridW;
      const zT = worldZ[r];
      const zB = worldZ[r + 1];
      for (let c = colStart; c < colEnd; c++) {
        const tl = grid[rowTop + c];
        const tr = grid[rowTop + c + 1];
        const bl = grid[rowBot + c];
        const br = grid[rowBot + c + 1];

        let idx = 0;
        if (bl > level) idx |= 1;
        if (br > level) idx |= 2;
        if (tr > level) idx |= 4;
        if (tl > level) idx |= 8;
        if (idx === 0 || idx === 15) continue;

        const xL = worldX[c];
        const xR = worldX[c + 1];

        const e0x = xL + ((level - bl) / (br - bl)) * (xR - xL);
        const e1z = zB + ((level - br) / (tr - br)) * (zT - zB);
        const e2x = xL + ((level - tl) / (tr - tl)) * (xR - xL);
        const e3z = zB + ((level - bl) / (tl - bl)) * (zT - zB);

        const push = (ax: number, az: number, bx: number, bz: number) => {
          target.push(ax, y, az, bx, y, bz);
        };

        switch (idx) {
          case 1:
          case 14:
            push(xL, e3z, e0x, zB);
            break;
          case 2:
          case 13:
            push(e0x, zB, xR, e1z);
            break;
          case 3:
          case 12:
            push(xL, e3z, xR, e1z);
            break;
          case 4:
          case 11:
            push(xR, e1z, e2x, zT);
            break;
          case 6:
          case 9:
            push(e0x, zB, e2x, zT);
            break;
          case 7:
          case 8:
            push(xL, e3z, e2x, zT);
            break;
          case 5:
            push(xL, e3z, e0x, zB);
            push(xR, e1z, e2x, zT);
            break;
          case 10:
            push(xL, e3z, e2x, zT);
            push(xR, e1z, e0x, zB);
            break;
        }
      }
    }
  }

  const group = new THREE.Group();
  group.name = "terrain-contours";

  if (minorVerts.length > 0) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(minorVerts, 3));
    const m = new THREE.LineBasicMaterial({
      color: 0x4a5570,
      transparent: true,
      opacity: 0.55,
    });
    group.add(new THREE.LineSegments(g, m));
  }
  if (majorVerts.length > 0) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(majorVerts, 3));
    const m = new THREE.LineBasicMaterial({
      color: 0x6b7a99,
      transparent: true,
      opacity: 0.7,
    });
    group.add(new THREE.LineSegments(g, m));
  }
  return group;
}
