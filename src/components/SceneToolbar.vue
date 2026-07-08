<script setup lang="ts">
defineProps<{
  terrainVisible: boolean;
  terrainLoading: boolean;
}>();

const emit = defineEmits<{
  reset: [];
  "update:terrainVisible": [value: boolean];
  "load-new": [];
}>();
</script>

<template>
  <div class="absolute top-4 left-4 flex gap-2">
    <button
      class="flex items-center gap-[0.35rem] px-3 py-[0.45rem] rounded-[7px] border border-vr-line bg-[rgba(15,15,20,0.85)] text-vr-dim text-[0.78rem] font-[inherit] cursor-pointer backdrop-blur-[8px] transition-all duration-150 hover:bg-[rgba(30,32,48,0.9)] hover:text-vr-soft hover:border-vr-line-hi"
      title="Reset camera"
      @click="emit('reset')"
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
      class="flex items-center gap-[0.35rem] px-3 py-[0.45rem] rounded-[7px] border bg-[rgba(15,15,20,0.85)] text-[0.78rem] font-[inherit] cursor-pointer backdrop-blur-[8px] transition-all duration-150"
      :class="
        terrainVisible
          ? 'border-vr-line-hi text-vr-soft hover:bg-[rgba(30,32,48,0.9)]'
          : 'border-vr-line text-vr-muted hover:text-vr-soft hover:border-vr-line-hi'
      "
      :title="terrainVisible ? 'Hide terrain contours' : 'Show terrain contours'"
      @click="emit('update:terrainVisible', !terrainVisible)"
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
        <path
          d="M2 14 Q5 9 8 11 T14 9 T18 12"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          fill="none"
        />
        <path
          d="M2 17 Q6 13 10 14 T18 15"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          opacity="0.6"
          fill="none"
        />
        <path
          d="M4 10 Q7 6 10 8 T16 7"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          opacity="0.4"
          fill="none"
        />
      </svg>
      <span class="tabular-nums">{{ terrainLoading ? "…" : "Topo" }}</span>
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
</template>
