<script setup lang="ts">
import SlopeLegend from "./SlopeLegend.vue";
import SpeedLegend from "./SpeedLegend.vue";
import type { ColorMode } from "../composables/useThreeScene.ts";

defineProps<{
  effectiveColorMode: ColorMode;
  hasTimestamps: boolean;
}>();

const emit = defineEmits<{
  "update:colorMode": [mode: ColorMode];
}>();
</script>

<template>
  <div
    class="absolute bottom-[52px] left-4 bg-[rgba(15,15,20,0.85)] border border-vr-line rounded-lg px-3 py-2.5 backdrop-blur-[8px] flex flex-col gap-[0.45rem]"
  >
    <!-- Mode toggle -->
    <div class="flex gap-1 mb-[0.15rem]">
      <button
        class="flex-1 px-2 py-[0.2rem] rounded-[5px] text-[0.68rem] font-[inherit] cursor-pointer transition-all duration-150 border"
        :class="
          effectiveColorMode === 'slope'
            ? 'bg-vr-blue/15 border-vr-blue/40 text-vr-blue'
            : 'bg-transparent border-transparent text-vr-muted hover:text-vr-soft hover:bg-vr-hover'
        "
        @click="emit('update:colorMode', 'slope')"
      >
        Slope
      </button>
      <button
        class="flex-1 px-2 py-[0.2rem] rounded-[5px] text-[0.68rem] font-[inherit] transition-all duration-150 border"
        :class="[
          hasTimestamps ? 'cursor-pointer' : 'cursor-not-allowed opacity-40',
          effectiveColorMode === 'speed'
            ? 'bg-vr-blue/15 border-vr-blue/40 text-vr-blue'
            : 'bg-transparent border-transparent text-vr-muted hover:text-vr-soft hover:bg-vr-hover',
        ]"
        :disabled="!hasTimestamps"
        :title="hasTimestamps ? 'Color by speed' : 'No timestamps in GPX'"
        @click="hasTimestamps && emit('update:colorMode', 'speed')"
      >
        Speed
      </button>
    </div>

    <SlopeLegend v-if="effectiveColorMode === 'slope'" />
    <SpeedLegend v-else />
  </div>
</template>
