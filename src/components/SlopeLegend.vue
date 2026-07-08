<script setup lang="ts">
import { SLOPE_STOPS } from "../utils/gradientColor.ts";

function slopeRange(index: number): string {
  const stop = SLOPE_STOPS[index];
  const lower = index > 0 ? SLOPE_STOPS[index - 1].max : null;
  if (stop.max === Infinity) return `${stop.label} — grade > ${lower}%`;
  if (lower === null) return `${stop.label} — grade ≤ ${stop.max}%`;
  return `${stop.label} — grade > ${lower}% to ≤ ${stop.max}%`;
}
</script>

<template>
  <div
    v-for="(stop, i) in SLOPE_STOPS"
    :key="stop.label"
    :title="slopeRange(i)"
    class="flex items-center gap-[0.45rem]"
  >
    <span class="w-2.5 h-2.5 rounded-[2px] shrink-0" :style="{ background: stop.color }"></span>
    <span class="text-[0.7rem] text-vr-dim whitespace-nowrap">{{ stop.label }}</span>
  </div>
</template>
