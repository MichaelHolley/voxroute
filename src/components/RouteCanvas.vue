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

watch(flyProgress, (v) => {
  if (v >= 1 && isFlying.value) {
    isFlying.value = false;
    orbitControls.setEnabled(true);
  }
});
</script>

<template>
  <div class="relative w-full h-full bg-vr-deep overflow-hidden">
    <canvas ref="canvasRef" class="block w-full h-full"></canvas>

    <!-- Color legend — bottom left above slider -->
    <div
      class="absolute bottom-[52px] left-4 bg-[rgba(15,15,20,0.85)] border border-vr-line rounded-lg px-3 py-2.5 backdrop-blur-[8px] flex flex-col gap-[0.35rem]"
    >
      <div v-for="stop in SLOPE_STOPS" :key="stop.label" class="flex items-center gap-[0.45rem]">
        <span class="w-2.5 h-2.5 rounded-[2px] shrink-0" :style="{ background: stop.color }"></span>
        <span class="text-[0.7rem] text-vr-dim whitespace-nowrap">{{ stop.label }}</span>
      </div>
    </div>

    <!-- Camera controls — top right -->
    <div class="absolute top-4 right-4">
      <ControlBar
        :active-mode="cameraMode"
        :is-flying="isFlying"
        :fly-progress="flyProgress"
        @set-mode="setMode"
        @toggle-fly="toggleFly"
      />
    </div>

    <!-- Reset + Load new — top left -->
    <div class="absolute top-4 left-4 flex gap-2">
      <button
        class="flex items-center gap-[0.35rem] px-3 py-[0.45rem] rounded-[7px] border border-vr-line bg-[rgba(15,15,20,0.85)] text-vr-dim text-[0.78rem] font-[inherit] cursor-pointer backdrop-blur-[8px] transition-all duration-150 hover:bg-[rgba(30,32,48,0.9)] hover:text-vr-soft hover:border-vr-line-hi"
        title="Reset camera"
        @click="setMode('free')"
      >
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
      <button
        class="flex items-center gap-[0.35rem] px-3 py-[0.45rem] rounded-[7px] border border-vr-blue/30 bg-[rgba(15,15,20,0.85)] text-vr-blue text-[0.78rem] font-[inherit] cursor-pointer backdrop-blur-[8px] transition-all duration-150 hover:bg-vr-blue/12 hover:border-vr-blue/50"
        @click="emit('load-new')"
      >
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

    <!-- Elevation exaggeration — bottom left -->
    <div
      class="absolute bottom-4 left-4 flex items-center gap-2.5 bg-[rgba(15,15,20,0.85)] border border-vr-line rounded-lg px-3 py-[0.45rem] backdrop-blur-[8px]"
    >
      <label class="text-[0.72rem] text-vr-muted whitespace-nowrap min-w-[52px] tabular-nums">
        Elev. ×{{ exaggeration }}
      </label>
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

    <!-- Fly progress bar — bottom edge -->
    <div
      class="absolute bottom-0 left-0 right-0 h-[3px] bg-vr-blue/15 transition-opacity duration-300"
      :class="isFlying ? 'opacity-100' : 'opacity-0'"
    >
      <div
        class="h-full bg-gradient-to-r from-vr-blue to-vr-purple transition-[width] duration-100"
        :style="{ width: `${flyProgress * 100}%` }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
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
</style>
