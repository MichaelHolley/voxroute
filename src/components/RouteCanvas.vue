<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import ControlBar from "./ControlBar.vue";
import { useThreeScene } from "../composables/useThreeScene.ts";
import { useOrbitControls } from "../composables/useOrbitControls.ts";
import { SLOPE_STOPS } from "../utils/gradientColor.ts";

type CameraMode = "free" | "top" | "side";

interface GpxPoint {
  lat: number;
  lon: number;
  ele: number;
}

const props = defineProps<{
  points: GpxPoint[];
}>();

const emit = defineEmits<{
  "load-new": [];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const exaggeration = ref(5);
const cameraMode = ref<CameraMode>("free");
const isFlying = ref(false);

const pointsRef = computed(() => props.points);

const { orbitState, flyProgress, resetView, setTopView, setSideView, startFlyMode, stopFlyMode } =
  useThreeScene(canvasRef, pointsRef, exaggeration);

const orbitControls = useOrbitControls(orbitState);

onMounted(() => {
  orbitControls.attachTo(canvasRef);
});

function setMode(mode: CameraMode) {
  cameraMode.value = mode;
  stopFlyMode();
  isFlying.value = false;
  if (mode === "free") resetView();
  else if (mode === "top") setTopView();
  else if (mode === "side") setSideView();
}

function toggleFly() {
  if (isFlying.value) {
    stopFlyMode();
    isFlying.value = false;
    orbitControls.setEnabled(true);
  } else {
    cameraMode.value = "free";
    startFlyMode();
    isFlying.value = true;
    orbitControls.setEnabled(false);
  }
}

// Stop fly mode when it finishes
watch(flyProgress, (v) => {
  if (v >= 1 && isFlying.value) {
    isFlying.value = false;
    orbitControls.setEnabled(true);
  }
});
</script>

<template>
  <div class="canvas-wrapper">
    <canvas ref="canvasRef" class="route-canvas"></canvas>

    <!-- Color legend -->
    <div class="legend">
      <div v-for="stop in SLOPE_STOPS" :key="stop.label" class="legend-row">
        <span class="legend-swatch" :style="{ background: stop.color }"></span>
        <span class="legend-text">{{ stop.label }}</span>
      </div>
    </div>

    <!-- Top-right controls overlay -->
    <div class="overlay-controls">
      <ControlBar
        :active-mode="cameraMode"
        :is-flying="isFlying"
        :fly-progress="flyProgress"
        @set-mode="setMode"
        @toggle-fly="toggleFly"
      />
    </div>

    <!-- Reset + Load new buttons -->
    <div class="overlay-actions">
      <button class="action-btn" @click="setMode('free')" title="Reset camera">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 10 A7 7 0 1 1 10 17"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <path
            d="M3 6 L3 10 L7 10"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Reset
      </button>
      <button class="action-btn accent" @click="emit('load-new')">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 4 L10 16 M4 10 L16 10"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
        Load new
      </button>
    </div>

    <!-- Exaggeration slider -->
    <div class="exaggeration-panel">
      <label class="exag-label">Elev. ×{{ exaggeration }}</label>
      <input
        v-model.number="exaggeration"
        type="range"
        min="1"
        max="20"
        step="0.5"
        class="exag-slider"
        title="Elevation exaggeration"
      />
    </div>

    <!-- Fly progress bar -->
    <div class="fly-bar" :class="{ visible: isFlying }">
      <div class="fly-bar-fill" :style="{ width: `${flyProgress * 100}%` }"></div>
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0f;
  overflow: hidden;
}

.route-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* Color legend — bottom left */
.legend {
  position: absolute;
  bottom: 52px;
  left: 16px;
  background: rgba(15, 15, 20, 0.85);
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-text {
  font-size: 0.7rem;
  color: #8090b0;
  white-space: nowrap;
}

/* Camera controls — top right */
.overlay-controls {
  position: absolute;
  top: 16px;
  right: 16px;
}

/* Reset + Load new — top left */
.overlay-actions {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border-radius: 7px;
  border: 1px solid #2a2a3a;
  background: rgba(15, 15, 20, 0.85);
  color: #8090b0;
  font-size: 0.78rem;
  font-family: inherit;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(30, 32, 48, 0.9);
  color: #a0aec0;
  border-color: #3a3a5a;
}

.action-btn.accent {
  color: #378add;
  border-color: rgba(55, 138, 221, 0.3);
}

.action-btn.accent:hover {
  background: rgba(55, 138, 221, 0.12);
  border-color: rgba(55, 138, 221, 0.5);
}

/* Elevation exaggeration slider — bottom left */
.exaggeration-panel {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: rgba(15, 15, 20, 0.85);
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  backdrop-filter: blur(8px);
}

.exag-label {
  font-size: 0.72rem;
  color: #6b7a99;
  white-space: nowrap;
  min-width: 52px;
  font-variant-numeric: tabular-nums;
}

.exag-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 90px;
  height: 4px;
  border-radius: 2px;
  background: #2a2a3a;
  outline: none;
  cursor: pointer;
}

.exag-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #378add;
  cursor: pointer;
  transition: transform 0.1s;
}

.exag-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

/* Fly progress bar — bottom edge */
.fly-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(55, 138, 221, 0.15);
  opacity: 0;
  transition: opacity 0.3s;
}

.fly-bar.visible {
  opacity: 1;
}

.fly-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #378add, #7c3aed);
  transition: width 0.1s linear;
}
</style>
