import { ref, watch, onMounted, onUnmounted, type Ref, type ComputedRef } from "vue";
import * as THREE from "three";

import { haversineDistance } from "../utils/haversine.ts";
import { slopeColor } from "../utils/gradientColor.ts";
import { disposeObject3D } from "../utils/disposeObject3D.ts";
import { createBillboardLabel, updateBillboardScale } from "../utils/billboardLabel.ts";
import {
  pickElevationExtremes,
  formatElevationLabel,
  EXTREME_COLORS,
} from "../utils/elevationLabels.ts";
import { projectPoints } from "../utils/projection.ts";
import { buildTerrainContours } from "./useTerrain.ts";
import type { GpxPoint } from "./useGpxParser.ts";

const CAMERA_FOV = 55;

export interface OrbitState {
  theta: Ref<number>;
  phi: Ref<number>;
  radius: Ref<number>;
  target: Ref<THREE.Vector3>;
  update: () => void;
}

function computeGrade(p1: GpxPoint, p2: GpxPoint): number {
  const dist = haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
  if (dist < 0.001) return 0;
  return ((p2.ele - p1.ele) / dist) * 100;
}

function smoothPositions(pts: THREE.Vector3[], passes: number): THREE.Vector3[] {
  let out = pts.map((p) => p.clone());
  for (let pass = 0; pass < passes; pass++) {
    const next = out.map((p) => p.clone());
    for (let i = 1; i < out.length - 1; i++) {
      next[i].lerpVectors(out[i - 1], out[i + 1], 0.5).lerp(out[i], 0.5);
    }
    out = next;
  }
  return out;
}

export function useThreeScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  points: Ref<GpxPoint[]> | ComputedRef<GpxPoint[]>,
  exaggeration: Ref<number>,
) {
  const camera = ref<THREE.PerspectiveCamera | null>(null);
  const flyProgress = ref(0);
  const orbitTheta = ref(Math.PI / 4);
  const orbitPhi = ref((Math.PI * 5) / 12);
  const orbitRadius = ref(130);
  const orbitTarget = ref(new THREE.Vector3(0, 0, 0));
  const terrainVisible = ref(false);
  const terrainLoading = ref(false);
  const terrainError = ref<string | null>(null);

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let routeGroup: THREE.Group | null = null;
  let terrainGroup: THREE.Group | null = null;
  let terrainAbort: AbortController | null = null;
  let lastProjection: ReturnType<typeof projectPoints>["projection"] = null;
  let lastPts: GpxPoint[] = [];
  let animId: number | null = null;
  let flyRafId: number | null = null;
  let flyStartTime: number | null = null;
  let flyLastFrameTime: number | null = null;
  let flySmoothedPos = new THREE.Vector3();
  let flySmoothedLook = new THREE.Vector3();
  let flyInitialized = false;
  let scenePositions: THREE.Vector3[] = [];
  let flyCurve: THREE.CatmullRomCurve3 | null = null;
  const FLY_DURATION = 22000;
  let routeMeshGeo: THREE.BufferGeometry | null = null;
  let slopeColorsArr: Float32Array | null = null;

  // Draw-on reveal: animate the tube from start→finish so route direction reads instantly
  const REVEAL_DURATION = 1100;
  let revealStartTime: number | null = null;
  let revealTubeCount = 0;
  let revealShadow: THREE.Line | null = null;
  let revealShadowCount = 0;
  const revealDrops: { line: THREE.Line; t: number }[] = [];
  const revealLabels: { sprite: THREE.Sprite; t: number }[] = [];
  let revealEndSphere: THREE.Mesh | null = null;

  const orbitState: OrbitState = {
    theta: orbitTheta,
    phi: orbitPhi,
    radius: orbitRadius,
    target: orbitTarget,
    update: updateCameraFromOrbit,
  };

  function updateCameraFromOrbit(): void {
    if (!camera.value) return;
    const t = orbitTarget.value;
    const r = orbitRadius.value;
    const p = orbitPhi.value;
    const th = orbitTheta.value;
    camera.value.position.set(
      t.x + r * Math.sin(p) * Math.sin(th),
      t.y + r * Math.cos(p),
      t.z + r * Math.sin(p) * Math.cos(th),
    );
    camera.value.lookAt(t.x, t.y, t.z);
  }

  function buildGeometry(reveal = false): void {
    if (!scene) return;
    revealStartTime = null;
    revealShadow = null;
    revealEndSphere = null;
    revealDrops.length = 0;
    revealLabels.length = 0;
    if (routeGroup) {
      scene.remove(routeGroup);
      disposeObject3D(routeGroup);
      routeGroup = null;
    }
    const pts = points.value;
    if (pts.length < 2) return;

    const projected = projectPoints(pts, exaggeration.value);
    scenePositions = smoothPositions(projected.positions, 2);
    const pos = scenePositions;
    lastProjection = projected.projection;
    lastPts = pts;
    if (terrainVisible.value && projected.projection) {
      void loadTerrain(projected.projection, pts);
    } else {
      disposeTerrain();
    }

    // Update orbit target to route centroid
    const centroid = pos
      .reduce((acc, p) => acc.add(p), new THREE.Vector3())
      .divideScalar(pos.length);
    orbitTarget.value.copy(centroid);
    updateCameraFromOrbit();

    routeGroup = new THREE.Group();
    const tubeR = 0.12;
    const radSeg = 10;

    // centripetal avoids kinks/cusps at sharp geographic corners
    flyCurve = new THREE.CatmullRomCurve3(pos, false, "centripetal");
    flyCurve.getLength(); // pre-compute arc-length LUT

    const tubularSegments = Math.min(Math.max(pos.length * 8, 600), 6000);
    const geo = new THREE.TubeGeometry(flyCurve, tubularSegments, tubeR, radSeg, false);

    // Precompute slope color array
    const vertexCount = (tubularSegments + 1) * (radSeg + 1);
    slopeColorsArr = new Float32Array(vertexCount * 3);

    let vi = 0;
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const origIdx = Math.min(Math.floor(t * (pts.length - 1)), pts.length - 2);
      const grade = computeGrade(pts[origIdx], pts[origIdx + 1]);
      const sc = new THREE.Color(slopeColor(grade));
      for (let j = 0; j <= radSeg; j++) {
        slopeColorsArr[vi] = sc.r;
        slopeColorsArr[vi + 1] = sc.g;
        slopeColorsArr[vi + 2] = sc.b;
        vi += 3;
      }
    }

    geo.setAttribute("color", new THREE.Float32BufferAttribute(slopeColorsArr, 3));
    routeMeshGeo = geo;
    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 80 });
    routeGroup.add(new THREE.Mesh(geo, mat));

    // Ground shadow line
    const shadowPts = pos.map((p) => new THREE.Vector3(p.x, 0.02, p.z));
    const shadowGeo = new THREE.BufferGeometry().setFromPoints(shadowPts);
    const shadowMat = new THREE.LineBasicMaterial({
      color: 0x378add,
      transparent: true,
      opacity: 0.3,
    });
    revealShadow = new THREE.Line(shadowGeo, shadowMat);
    routeGroup.add(revealShadow);

    // Vertical drop lines for depth
    for (let i = 0; i < pos.length; i += 5) {
      const dropGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pos[i].x, 0, pos[i].z),
        pos[i],
      ]);
      const dropMat = new THREE.LineBasicMaterial({
        color: 0x2a2a3a,
        transparent: true,
        opacity: 0.6,
      });
      const dropLine = new THREE.Line(dropGeo, dropMat);
      routeGroup.add(dropLine);
      revealDrops.push({ line: dropLine, t: pos.length > 1 ? i / (pos.length - 1) : 0 });
    }

    // Start sphere
    const startGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const startMat = new THREE.MeshPhongMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.4,
    });
    const startSphere = new THREE.Mesh(startGeo, startMat);
    startSphere.position.copy(pos[0]);
    routeGroup.add(startSphere);

    // End sphere
    const endGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const endMat = new THREE.MeshPhongMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.4,
    });
    revealEndSphere = new THREE.Mesh(endGeo, endMat);
    revealEndSphere.position.copy(pos[pos.length - 1]);
    routeGroup.add(revealEndSphere);

    for (const extreme of pickElevationExtremes(pts)) {
      const anchorIdx = Math.min(extreme.index, pos.length - 1);
      const sprite = createBillboardLabel(
        formatElevationLabel(extreme.kind, extreme.ele),
        EXTREME_COLORS[extreme.kind],
      );
      sprite.position.set(pos[anchorIdx].x, pos[anchorIdx].y + 0.7, pos[anchorIdx].z);
      updateBillboardScale(sprite, CAMERA_FOV, canvasRef.value?.clientHeight ?? 0);
      routeGroup.add(sprite);
      revealLabels.push({
        sprite,
        t: pos.length > 1 ? anchorIdx / (pos.length - 1) : 0,
      });
    }

    scene.add(routeGroup);

    if (reveal) startReveal();
  }

  function startReveal(): void {
    if (!routeMeshGeo?.index) {
      revealStartTime = null;
      return;
    }
    revealTubeCount = routeMeshGeo.index.count;
    routeMeshGeo.setDrawRange(0, 0);
    if (revealShadow) {
      const posAttr = revealShadow.geometry.getAttribute("position");
      revealShadowCount = posAttr ? posAttr.count : 0;
      revealShadow.geometry.setDrawRange(0, 0);
    }
    for (const d of revealDrops) d.line.visible = false;
    for (const l of revealLabels) l.sprite.visible = false;
    if (revealEndSphere) revealEndSphere.visible = false;
    revealStartTime = performance.now();
  }

  function updateReveal(): void {
    if (revealStartTime === null) return;
    const raw = Math.min((performance.now() - revealStartTime) / REVEAL_DURATION, 1);
    // easeOutCubic: the head shoots out quickly, then settles at the finish
    const t = 1 - Math.pow(1 - raw, 3);

    if (routeMeshGeo) {
      // snap to whole triangles (6 indices) so no partial faces flicker at the head
      const count = Math.floor((revealTubeCount * t) / 6) * 6;
      routeMeshGeo.setDrawRange(0, count);
    }
    if (revealShadow) {
      revealShadow.geometry.setDrawRange(0, Math.max(2, Math.ceil(revealShadowCount * t)));
    }
    for (const d of revealDrops) {
      if (!d.line.visible && t >= d.t) d.line.visible = true;
    }
    for (const l of revealLabels) {
      if (!l.sprite.visible && t >= l.t) l.sprite.visible = true;
    }

    if (raw >= 1) {
      routeMeshGeo?.setDrawRange(0, Infinity);
      revealShadow?.geometry.setDrawRange(0, Infinity);
      for (const d of revealDrops) d.line.visible = true;
      for (const l of revealLabels) l.sprite.visible = true;
      if (revealEndSphere) revealEndSphere.visible = true;
      revealStartTime = null;
    }
  }

  function disposeTerrain(): void {
    if (!terrainGroup || !scene) return;
    scene.remove(terrainGroup);
    disposeObject3D(terrainGroup);
    terrainGroup = null;
  }

  async function loadTerrain(
    projection: ReturnType<typeof projectPoints>["projection"],
    pts: GpxPoint[],
  ): Promise<void> {
    if (!projection) return;
    if (terrainAbort) terrainAbort.abort();
    terrainAbort = new AbortController();
    const signal = terrainAbort.signal;
    const bbox = {
      minLat: Math.min(...pts.map((p) => p.lat)),
      maxLat: Math.max(...pts.map((p) => p.lat)),
      minLon: Math.min(...pts.map((p) => p.lon)),
      maxLon: Math.max(...pts.map((p) => p.lon)),
    };
    terrainError.value = null;
    terrainLoading.value = true;
    try {
      const g = await buildTerrainContours(projection, bbox, { signal });
      if (signal.aborted || !scene) return;
      disposeTerrain();
      if (g) {
        g.visible = terrainVisible.value;
        terrainGroup = g;
        scene.add(g);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.warn("terrain load failed", e);
        terrainError.value =
          e instanceof Error ? `Terrain unavailable: ${e.message}` : "Terrain unavailable";
        terrainVisible.value = false;
      }
    } finally {
      if (!signal.aborted) terrainLoading.value = false;
    }
  }

  function initScene(canvas: HTMLCanvasElement): void {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x0a0a0f);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.0025);

    camera.value = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      2000,
    );
    updateCameraFromOrbit();

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(60, 120, 80);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0x334466, 0x111122, 0.35));

    const grid = new THREE.GridHelper(240, 48, 0x1a2540, 0x111926);
    scene.add(grid);

    buildGeometry(true);
    startRenderLoop();
    window.addEventListener("resize", handleResize);
  }

  function handleResize(): void {
    const canvas = canvasRef.value;
    if (!canvas || !renderer || !camera.value) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h);
    camera.value.aspect = w / h;
    camera.value.updateProjectionMatrix();
    for (const l of revealLabels) updateBillboardScale(l.sprite, CAMERA_FOV, h);
  }

  function startRenderLoop(): void {
    function loop() {
      animId = requestAnimationFrame(loop);
      updateReveal();
      if (renderer && scene && camera.value) renderer.render(scene, camera.value);
    }
    loop();
  }

  function resetView(): void {
    stopFlyMode();
    orbitTheta.value = Math.PI / 4;
    orbitPhi.value = (Math.PI * 5) / 12;
    orbitRadius.value = 130;
    updateCameraFromOrbit();
  }

  function setTopView(): void {
    stopFlyMode();
    orbitTheta.value = 0;
    orbitPhi.value = 0.05;

    if (scenePositions.length > 0) {
      let minX = Infinity,
        maxX = -Infinity,
        minZ = Infinity,
        maxZ = -Infinity;
      for (const p of scenePositions) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z);
        maxZ = Math.max(maxZ, p.z);
      }
      const fovV = (CAMERA_FOV * Math.PI) / 180;
      const aspect = canvasRef.value
        ? canvasRef.value.clientWidth / canvasRef.value.clientHeight
        : 1.6;
      const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
      const rZ = ((maxZ - minZ) * 1.3) / (2 * Math.tan(fovV / 2));
      const rX = ((maxX - minX) * 1.3) / (2 * Math.tan(fovH / 2));
      orbitRadius.value = Math.max(rZ, rX);
    } else {
      orbitRadius.value = 160;
    }

    updateCameraFromOrbit();
  }

  function setSideView(): void {
    stopFlyMode();
    orbitTheta.value = 0;
    orbitPhi.value = Math.PI / 2;
    orbitRadius.value = 130;
    updateCameraFromOrbit();
  }

  function flyStep(): void {
    const now = performance.now();
    const elapsed = now - (flyStartTime ?? 0);
    const dt = flyLastFrameTime !== null ? (now - flyLastFrameTime) / 1000 : 0;
    flyLastFrameTime = now;

    const t = Math.min(elapsed / FLY_DURATION, 1);
    flyProgress.value = t;

    if (flyCurve && camera.value) {
      const targetPos = flyCurve.getPointAt(t);
      targetPos.y += 0.6;

      const lookT = Math.min(t + 0.03, 1);
      const targetLook = flyCurve.getPointAt(lookT);
      targetLook.y += 0.6;

      if (!flyInitialized) {
        flySmoothedPos.copy(targetPos);
        flySmoothedLook.copy(targetLook);
        flyInitialized = true;
      } else {
        // Frame-rate independent exponential smoothing (tau ≈ 0.2s)
        const alpha = 1 - Math.exp(-dt * 5);
        flySmoothedPos.lerp(targetPos, alpha);
        flySmoothedLook.lerp(targetLook, alpha);
      }

      camera.value.position.copy(flySmoothedPos);
      camera.value.lookAt(flySmoothedLook);
    }

    if (t < 1) {
      flyRafId = requestAnimationFrame(flyStep);
    } else {
      flyRafId = null;
      flyStartTime = null;
    }
  }

  function stopFlyMode(): void {
    if (flyRafId) {
      cancelAnimationFrame(flyRafId);
      flyRafId = null;
    }
    flyStartTime = null;
    flyLastFrameTime = null;
    flyProgress.value = 0;
  }

  function startFlyMode(): void {
    if (!flyCurve || scenePositions.length < 2) return;
    stopFlyMode();
    flyInitialized = false;
    flyProgress.value = 0;
    flyStartTime = performance.now();
    flyStep();
  }

  onMounted(() => {
    if (canvasRef.value) initScene(canvasRef.value);
  });

  onUnmounted(() => {
    stopFlyMode();
    if (terrainAbort) terrainAbort.abort();
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener("resize", handleResize);
    if (scene) disposeObject3D(scene);
    renderer?.dispose();
    renderer = null;
  });

  watch(points, () => buildGeometry(true), { deep: true });
  watch(exaggeration, () => buildGeometry(false));
  watch(terrainVisible, (v) => {
    if (v) {
      if (terrainGroup) {
        terrainGroup.visible = true;
      } else if (lastProjection && lastPts.length > 1) {
        void loadTerrain(lastProjection, lastPts);
      }
    } else if (terrainGroup) {
      terrainGroup.visible = false;
    }
  });

  return {
    camera,
    orbitState,
    flyProgress,
    terrainVisible,
    terrainLoading,
    terrainError,
    resetView,
    setTopView,
    setSideView,
    startFlyMode,
    stopFlyMode,
  };
}
