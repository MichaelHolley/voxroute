import { ref, computed } from "vue";
import { haversineDistance } from "../utils/haversine.ts";

export interface GpxPoint {
  lat: number;
  lon: number;
  ele: number;
}

export interface RouteStats {
  distance: number;
  elevationGain: number;
  maxEle: number;
  minEle: number;
  pointCount: number;
}

const DEMO_GPX_URL =
  "https://raw.githubusercontent.com/gps-touring/sample-gpx/refs/heads/master/BrittanyJura/JuraRoute72011.gpx";

function parseGpx(xmlString: string): GpxPoint[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid GPX XML");
  const trkpts = doc.querySelectorAll("trkpt");
  if (trkpts.length === 0) throw new Error("No track points found in file");
  return Array.from(trkpts).map((pt) => ({
    lat: parseFloat(pt.getAttribute("lat") ?? "0"),
    lon: parseFloat(pt.getAttribute("lon") ?? "0"),
    ele: parseFloat(pt.querySelector("ele")?.textContent ?? "0"),
  }));
}

export function useGpxParser() {
  const points = ref<GpxPoint[]>([]);
  const error = ref<string | null>(null);
  const loading = ref(false);

  const stats = computed<RouteStats>(() => {
    const pts = points.value;
    if (pts.length < 2) {
      return { distance: 0, elevationGain: 0, maxEle: 0, minEle: 0, pointCount: pts.length };
    }
    let distance = 0;
    let elevationGain = 0;
    for (let i = 1; i < pts.length; i++) {
      distance += haversineDistance(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
      const dEle = pts[i].ele - pts[i - 1].ele;
      if (dEle > 0) elevationGain += dEle;
    }
    const eles = pts.map((p) => p.ele);
    return {
      distance,
      elevationGain,
      maxEle: Math.max(...eles),
      minEle: Math.min(...eles),
      pointCount: pts.length,
    };
  });

  function loadXml(xmlString: string): void {
    error.value = null;
    try {
      points.value = parseGpx(xmlString);
    } catch (e) {
      error.value = (e as Error).message;
    }
  }

  async function loadFile(file: File): Promise<void> {
    error.value = null;
    loading.value = true;
    try {
      const text = await file.text();
      points.value = parseGpx(text);
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function loadDemo(): Promise<void> {
    error.value = null;
    loading.value = true;
    try {
      const res = await fetch(DEMO_GPX_URL);
      if (!res.ok) throw new Error(`Failed to fetch demo route (${res.status})`);
      loadXml(await res.text());
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load demo route";
      loading.value = false;
    }
  }

  function reset(): void {
    points.value = [];
    error.value = null;
    loading.value = false;
  }

  return { points, stats, error, loading, loadFile, loadXml, loadDemo, reset };
}
