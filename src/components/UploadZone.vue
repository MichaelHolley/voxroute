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
  <div class="upload-page">
    <div class="upload-header">
      <div class="logo">
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
        <span class="logo-text">VoxRoute</span>
      </div>
      <p class="tagline">3D GPX Route Visualizer</p>
    </div>

    <div
      class="drop-zone"
      :class="{ dragover: isDragOver }"
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
        class="hidden-input"
        @change="onFileInput"
      />
      <div class="drop-icon">
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
      <p class="drop-title">Drop your GPX file here</p>
      <p class="drop-sub">or <span class="link-text">browse files</span></p>
      <p class="drop-hint">.gpx files only</p>
    </div>

    <div v-if="errorMsg" class="error-banner">
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

    <div class="demo-row">
      <span class="demo-label">No file? </span>
      <button class="demo-btn" @click.stop="loadDemo">Load Alpine demo route</button>
    </div>

    <div class="legend-preview">
      <span class="legend-item" v-for="item in legend" :key="item.label">
        <span class="legend-dot" :style="{ background: item.color }"></span>
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

<style scoped>
.upload-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  gap: 1.5rem;
}

.upload-header {
  text-align: center;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.logo-text {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #378add, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  color: #6b7a99;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.drop-zone {
  width: 100%;
  max-width: 440px;
  border: 2px dashed #2a2a3a;
  border-radius: 16px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #1a1a24;
  position: relative;
}

.drop-zone:hover,
.drop-zone:focus-visible {
  border-color: #378add;
  background: #1e2030;
  outline: none;
}

.drop-zone.dragover {
  border-color: #378add;
  background: #1a2040;
  transform: scale(1.01);
  box-shadow: 0 0 32px rgba(55, 138, 221, 0.2);
}

.hidden-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.drop-icon {
  margin-bottom: 1rem;
  opacity: 0.85;
}

.drop-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 0.25rem;
}

.drop-sub {
  color: #6b7a99;
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
}

.link-text {
  color: #378add;
  text-decoration: underline;
}

.drop-hint {
  font-size: 0.75rem;
  color: #3a4060;
  margin: 0;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  max-width: 440px;
  width: 100%;
}

.demo-row {
  color: #6b7a99;
  font-size: 0.875rem;
}

.demo-btn {
  background: none;
  border: none;
  color: #378add;
  cursor: pointer;
  font-size: 0.875rem;
  text-decoration: underline;
  padding: 0;
  font-family: inherit;
}

.demo-btn:hover {
  color: #5aa0e8;
}

.legend-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  justify-content: center;
  margin-top: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: #6b7a99;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
