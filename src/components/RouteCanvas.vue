<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import ControlBar from "./ControlBar.vue";
import ColorLegend from "./ColorLegend.vue";
import SceneToolbar from "./SceneToolbar.vue";
import ElevationSlider from "./ElevationSlider.vue";
import FlyProgressBar from "./FlyProgressBar.vue";
import { useThreeScene } from "../composables/useThreeScene.ts";
import { useOrbitControls } from "../composables/useOrbitControls.ts";
import type { GpxPoint } from "../composables/useGpxParser.ts";

type CameraMode = "free" | "top" | "side";

const props = defineProps<{
  points: GpxPoint[];
}>();

const emit = defineEmits<{
  "load-new": [];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const exaggeration = ref(2);
const cameraMode = ref<CameraMode>("free");
const isFlying = ref(false);

const pointsRef = computed(() => props.points);

const {
  orbitState,
  flyProgress,
  terrainVisible,
  terrainLoading,
  resetView,
  setTopView,
  setSideView,
  startFlyMode,
  stopFlyMode,
} = useThreeScene(canvasRef, pointsRef, exaggeration);

const orbitControls = useOrbitControls(orbitState);

onMounted(() => {
  orbitControls.attachTo(canvasRef);
});

function setMode(mode: CameraMode) {
  cameraMode.value = mode;
  stopFlyMode();
  isFlying.value = false;
  orbitControls.setEnabled(true);
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
    <ColorLegend />

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

    <!-- Scene actions — top left -->
    <SceneToolbar
      v-model:terrain-visible="terrainVisible"
      :terrain-loading="terrainLoading"
      @reset="setMode('free')"
      @load-new="emit('load-new')"
    />

    <!-- Elevation exaggeration — bottom left -->
    <ElevationSlider v-model:exaggeration="exaggeration" />

    <!-- Fly progress bar — bottom edge -->
    <FlyProgressBar :is-flying="isFlying" :progress="flyProgress" />
  </div>
</template>
