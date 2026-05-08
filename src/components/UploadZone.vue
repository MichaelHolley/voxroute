<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  "file-loaded": [file: File];
  "load-demo": [];
}>();

const isDragOver = ref(false);
const errorMsg = ref("");
const fileInputRef = ref<HTMLInputElement | null>(null);

function onDragOver(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = true;
}
function onDragLeave() {
  isDragOver.value = false;
}
function onDrop(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = false;
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  handleFile(file);
}
function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) handleFile(file);
}
function handleFile(file: File) {
  if (!file.name.endsWith(".gpx")) {
    errorMsg.value = "Please upload a .gpx file.";
    return;
  }
  errorMsg.value = "";
  emit("file-loaded", file);
}
function openPicker() {
  fileInputRef.value?.click();
}
function loadDemo() {
  errorMsg.value = "";
  emit("load-demo");
}

defineExpose({ setError: (msg: string) => (errorMsg.value = msg) });
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-8 gap-6">
    <!-- Header -->
    <div class="text-center">
      <div class="flex items-center justify-center gap-3 mb-2">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path
            d="M4 28 L12 14 L20 20 L28 8 L32 12"
            stroke="#378ADD"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
          <circle cx="4" cy="28" r="2.5" fill="#22c55e" />
          <circle cx="32" cy="12" r="2.5" fill="#ef4444" />
        </svg>
        <span
          class="text-[2rem] font-bold tracking-tight bg-gradient-to-br from-vr-blue to-vr-purple bg-clip-text text-transparent"
          >VoxRoute</span
        >
      </div>
      <p class="text-vr-muted text-sm tracking-[0.05em] uppercase m-0">3D GPX Route Visualizer</p>
    </div>

    <!-- Drop zone -->
    <div
      class="w-full max-w-[440px] border-2 border-dashed rounded-2xl py-12 px-8 text-center cursor-pointer transition-all duration-200 bg-vr-surface relative outline-none"
      :class="
        isDragOver
          ? 'border-vr-blue bg-[#1a2040] scale-[1.01] shadow-[0_0_32px_rgba(55,138,221,0.2)]'
          : 'border-vr-line hover:border-vr-blue hover:bg-vr-hover focus-visible:border-vr-blue focus-visible:bg-vr-hover'
      "
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="openPicker"
      role="button"
      tabindex="0"
      @keydown.enter="openPicker"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept=".gpx"
        class="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-none"
        @change="onFileInput"
      />
      <div class="mb-4 opacity-85 flex justify-center">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect
            x="8"
            y="12"
            width="32"
            height="28"
            rx="4"
            stroke="#378ADD"
            stroke-width="2"
            fill="none"
          />
          <path
            d="M24 20 L24 32 M19 27 L24 32 L29 27"
            stroke="#378ADD"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path d="M16 12 L16 8 L32 8 L32 12" stroke="#378ADD" stroke-width="1.5" opacity="0.5" />
        </svg>
      </div>
      <p class="text-lg font-semibold text-vr-text m-0 mb-1">Drop your GPX file here</p>
      <p class="text-vr-muted text-sm m-0 mb-3">
        or <span class="text-vr-blue underline">browse files</span>
      </p>
      <p class="text-xs text-[#3a4060] m-0">.gpx files only</p>
    </div>

    <!-- Error banner -->
    <div
      v-if="errorMsg"
      class="flex items-center gap-2 bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] text-[#f87171] px-4 py-[0.6rem] rounded-lg text-sm max-w-[440px] w-full"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="#ef4444" stroke-width="1.5" />
        <path
          d="M8 4 L8 8.5 M8 11 L8 11.5"
          stroke="#ef4444"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      {{ errorMsg }}
    </div>

    <!-- Demo link -->
    <div class="text-vr-muted text-sm">
      <span>No file? </span>
      <button
        class="bg-transparent border-0 text-vr-blue cursor-pointer text-sm underline p-0 font-[inherit] hover:text-[#5aa0e8] transition-colors"
        @click.stop="loadDemo"
      >
        Load Alpine demo route
      </button>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-x-5 gap-y-3 justify-center mt-2">
      <span
        v-for="item in legend"
        :key="item.label"
        class="flex items-center gap-[0.4rem] text-[0.78rem] text-vr-muted"
      >
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: item.color }"></span>
        {{ item.label }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
const legend = [
  { color: "#22c55e", label: "< 3% flat" },
  { color: "#eab308", label: "3–6% moderate" },
  { color: "#ef4444", label: "6–10% steep" },
  { color: "#7c3aed", label: "> 10% very steep" },
];
</script>
