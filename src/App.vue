<script setup lang="ts">
import { ref, watch } from "vue";
import UploadZone from "./components/UploadZone.vue";
import RouteCanvas from "./components/RouteCanvas.vue";
import StatsPanel from "./components/StatsPanel.vue";
import { useGpxParser } from "./composables/useGpxParser.ts";

type View = "upload" | "visualize";

const currentView = ref<View>("upload");
const { points, stats, error, loading, loadFile, loadDemo, reset } = useGpxParser();

const uploadZoneRef = ref<InstanceType<typeof UploadZone> | null>(null);

watch(error, (msg) => {
  if (msg) uploadZoneRef.value?.setError(msg);
});

async function onFileLoaded(file: File) {
  await loadFile(file);
  if (!error.value && points.value.length > 0) currentView.value = "visualize";
}

function onLoadDemo() {
  loadDemo();
  if (!error.value) currentView.value = "visualize";
}

function onLoadNew() {
  reset();
  currentView.value = "upload";
}
</script>

<template>
  <div class="app">
    <Transition name="view" mode="out-in">
      <div v-if="currentView === 'upload'" key="upload" class="view-upload">
        <UploadZone ref="uploadZoneRef" @file-loaded="onFileLoaded" @load-demo="onLoadDemo" />
        <div v-if="loading" class="loading-overlay">
          <div class="spinner"></div>
          <span>Parsing route…</span>
        </div>
      </div>

      <div v-else key="visualize" class="view-visualize">
        <div class="canvas-area">
          <RouteCanvas :points="points" @load-new="onLoadNew" />
        </div>
        <div class="stats-area">
          <StatsPanel :stats="stats" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  min-height: 100vh;
  background: #0f0f14;
  color: #e2e8f0;
  position: relative;
}

.view-upload {
  position: relative;
}

.view-visualize {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.canvas-area {
  flex: 1;
  min-height: 0;
}

.stats-area {
  padding: 0.75rem;
  background: #0f0f14;
  border-top: 1px solid #1a1a24;
  flex-shrink: 0;
}

.view-enter-active,
.view-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.view-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.view-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 15, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #6b7a99;
  font-size: 0.9rem;
  backdrop-filter: blur(4px);
  z-index: 100;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #1a1a24;
  border-top-color: #378add;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
