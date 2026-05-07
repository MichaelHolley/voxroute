import { ref, watch, onMounted, onUnmounted, type Ref, type ComputedRef } from "vue";
import * as THREE from "three";

type DisposableObj = {
  geometry?: { dispose(): void };
  material?: THREE.Material | THREE.Material[];
};
import { haversineDistance } from "../utils/haversine.ts";
import { slopeColor } from "../utils/gradientColor.ts";
import type { GpxPoint } from "./useGpxParser.ts";

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

function projectToScene(points: GpxPoint[], exaggeration: number): THREE.Vector3[] {
  if (points.length === 0) return [];
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
  return raw.map((p) => new THREE.Vector3(p.x * scale, p.y * scale * exaggeration, p.z * scale));
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

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let routeGroup: THREE.Group | null = null;
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

  function buildGeometry(): void {
    if (!scene) return;
    if (routeGroup) {
      scene.remove(routeGroup);
      routeGroup.traverse((obj) => {
        const d = obj as unknown as DisposableObj;
        d.geometry?.dispose();
        if (d.material) {
          if (Array.isArray(d.material)) d.material.forEach((m) => m.dispose());
          else d.material.dispose();
        }
      });
      routeGroup = null;
    }
    const pts = points.value;
    if (pts.length < 2) return;

    scenePositions = projectToScene(pts, exaggeration.value);
    const pos = scenePositions;

    // Update orbit target to route centroid
    const centroid = pos
      .reduce((acc, p) => acc.add(p), new THREE.Vector3())
      .divideScalar(pos.length);
    orbitTarget.value.copy(centroid);
    updateCameraFromOrbit();

    routeGroup = new THREE.Group();
    const tubeR = 0.22;
    const radSeg = 6;

    // One smooth curve — no segment joints/rings, arc-length parameterized for fly
    flyCurve = new THREE.CatmullRomCurve3(pos);
    flyCurve.getLength(); // pre-compute arc-length LUT

    const tubularSegments = Math.min(Math.max(pos.length * 3, 300), 3000);
    const geo = new THREE.TubeGeometry(flyCurve, tubularSegments, tubeR, radSeg, false);

    // Vertex colors by slope, mapped back to original GPX segments
    const colors: number[] = [];
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const origIdx = Math.min(Math.floor(t * (pts.length - 1)), pts.length - 2);
      const grade = computeGrade(pts[origIdx], pts[origIdx + 1]);
      const color = new THREE.Color(slopeColor(grade));
      for (let j = 0; j <= radSeg; j++) {
        colors.push(color.r, color.g, color.b);
      }
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
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
    routeGroup.add(new THREE.Line(shadowGeo, shadowMat));

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
      routeGroup.add(new THREE.Line(dropGeo, dropMat));
    }

    // Start sphere
    const startGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const startMat = new THREE.MeshPhongMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.4,
    });
    const startSphere = new THREE.Mesh(startGeo, startMat);
    startSphere.position.copy(pos[0]);
    routeGroup.add(startSphere);

    // End sphere
    const endGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const endMat = new THREE.MeshPhongMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.4,
    });
    const endSphere = new THREE.Mesh(endGeo, endMat);
    endSphere.position.copy(pos[pos.length - 1]);
    routeGroup.add(endSphere);

    scene.add(routeGroup);
  }

  function initScene(canvas: HTMLCanvasElement): void {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x0a0a0f);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.0025);

    camera.value = new THREE.PerspectiveCamera(
      55,
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

    buildGeometry();
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
  }

  function startRenderLoop(): void {
    function loop() {
      animId = requestAnimationFrame(loop);
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
    orbitRadius.value = 160;
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
      targetPos.y += 3;

      const lookT = Math.min(t + 0.03, 1);
      const targetLook = flyCurve.getPointAt(lookT);
      targetLook.y += 3;

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
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener("resize", handleResize);
    if (scene) {
      scene.traverse((obj) => {
        const d = obj as unknown as DisposableObj;
        d.geometry?.dispose();
        if (d.material) {
          if (Array.isArray(d.material)) d.material.forEach((m) => m.dispose());
          else d.material.dispose();
        }
      });
    }
    renderer?.dispose();
    renderer = null;
  });

  watch([points, exaggeration], buildGeometry, { deep: true });

  return {
    camera,
    orbitState,
    flyProgress,
    resetView,
    setTopView,
    setSideView,
    startFlyMode,
    stopFlyMode,
  };
}
