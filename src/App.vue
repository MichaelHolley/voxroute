<script setup lang="ts">
import { ref, watch } from "vue";
import UploadZone from "./components/UploadZone.vue";
import RouteCanvas from "./components/RouteCanvas.vue";
import StatsPanel from "./components/StatsPanel.vue";
import Spinner from "./components/Spinner.vue";
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
  <div class="relative w-full min-h-screen bg-vr-bg text-vr-text">
    <Transition
      mode="out-in"
      enter-active-class="transition-[opacity,transform] duration-300 ease-in-out"
      leave-active-class="transition-[opacity,transform] duration-300 ease-in-out"
      enter-from-class="opacity-0 translate-y-3"
      leave-to-class="opacity-0 -translate-y-3"
    >
      <div v-if="currentView === 'upload'" key="upload" class="relative">
        <UploadZone ref="uploadZoneRef" @file-loaded="onFileLoaded" @load-demo="onLoadDemo" />
        <div
          v-if="loading"
          class="fixed inset-0 flex flex-col items-center justify-center gap-4 text-vr-muted text-sm backdrop-blur-sm z-[100] bg-[rgba(10,10,15,0.85)]"
        >
          <Spinner />
          <span>Parsing route…</span>
        </div>
      </div>

      <div v-else key="visualize" class="relative h-screen">
        <RouteCanvas :points="points" @load-new="onLoadNew" />
        <div class="absolute bottom-3 right-3 z-10">
          <StatsPanel :stats="stats" />
        </div>
      </div>
    </Transition>
  </div>
</template>
