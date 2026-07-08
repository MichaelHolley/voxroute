<script setup lang="ts">
defineProps<{
  exaggeration: number;
}>();

const emit = defineEmits<{
  "update:exaggeration": [value: number];
}>();
</script>

<template>
  <div
    class="absolute bottom-4 left-4 flex items-center gap-2.5 bg-[rgba(15,15,20,0.85)] border border-vr-line rounded-lg px-3 py-[0.45rem] backdrop-blur-[8px]"
  >
    <label class="text-[0.72rem] text-vr-muted whitespace-nowrap w-[76px] tabular-nums">
      Elev. ×{{ Number(exaggeration).toFixed(1) }}
    </label>
    <input
      :value="exaggeration"
      type="range"
      min="1"
      max="20"
      step="0.5"
      class="exag-slider"
      title="Elevation exaggeration"
      @input="emit('update:exaggeration', Number(($event.target as HTMLInputElement).value))"
    />
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
