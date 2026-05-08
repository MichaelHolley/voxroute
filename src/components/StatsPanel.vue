<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";

interface Stats {
  distance: number;
  elevationGain: number;
  maxEle: number;
  minEle: number;
  pointCount: number;
}

const props = defineProps<{ stats: Stats }>();

const displayed = ref({
  distance: 0,
  elevationGain: 0,
  maxEle: 0,
  minEle: 0,
  pointCount: 0,
});

function animateTo(target: Stats) {
  const steps = 40;
  const interval = 25;
  let step = 0;
  const start = { ...displayed.value };
  const id = setInterval(() => {
    step++;
    const t = step / steps;
    const ease = 1 - Math.pow(1 - t, 3);
    displayed.value = {
      distance: start.distance + (target.distance - start.distance) * ease,
      elevationGain: start.elevationGain + (target.elevationGain - start.elevationGain) * ease,
      maxEle: start.maxEle + (target.maxEle - start.maxEle) * ease,
      minEle: start.minEle + (target.minEle - start.minEle) * ease,
      pointCount: Math.round(start.pointCount + (target.pointCount - start.pointCount) * ease),
    };
    if (step >= steps) clearInterval(id);
  }, interval);
}

onMounted(() => animateTo(props.stats));
watch(
  () => props.stats,
  (s) => animateTo(s),
  { deep: true },
);

function fmt(n: number, decimals = 0) {
  return n.toFixed(decimals);
}

const statCards = computed(() => [
  {
    label: "Distance",
    value: fmt(displayed.value.distance / 1000, 2),
    unit: "km",
    icon: `<path d="M2 10 Q6 4 10 10 Q14 16 18 10" stroke="#378ADD" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Elev. Gain",
    value: fmt(displayed.value.elevationGain),
    unit: "m",
    icon: `<path d="M4 16 L10 4 L16 16" stroke="#22c55e" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    label: "Max Elev.",
    value: fmt(displayed.value.maxEle),
    unit: "m",
    icon: `<path d="M2 14 L8 6 L14 10 L18 4" stroke="#eab308" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    label: "Min Elev.",
    value: fmt(displayed.value.minEle),
    unit: "m",
    icon: `<path d="M2 6 L8 14 L14 10 L18 16" stroke="#ef4444" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    label: "Track Points",
    value: String(displayed.value.pointCount),
    unit: "pts",
    icon: `<circle cx="10" cy="10" r="2" fill="#7c3aed"/><circle cx="4" cy="6" r="1.5" fill="#7c3aed" opacity="0.6"/><circle cx="16" cy="14" r="1.5" fill="#7c3aed" opacity="0.6"/><circle cx="4" cy="14" r="1.5" fill="#7c3aed" opacity="0.4"/><circle cx="16" cy="6" r="1.5" fill="#7c3aed" opacity="0.4"/>`,
  },
]);
</script>

<template>
  <div class="bg-vr-surface border border-vr-line rounded-xl p-4">
    <div class="text-[0.7rem] font-semibold tracking-[0.08em] uppercase text-vr-faint mb-3">
      Route Statistics
    </div>
    <div class="grid grid-cols-5 gap-2 max-[600px]:grid-cols-3">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="bg-vr-deep border border-[#1e1e2a] rounded-lg py-3 px-2 text-center transition-colors hover:border-[#2a2a4a]"
      >
        <div class="flex justify-center mb-1.5">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" v-html="card.icon"></svg>
        </div>
        <div class="text-[1.15rem] font-bold text-vr-text leading-tight tabular-nums">
          {{ card.value
          }}<span class="text-[0.65rem] font-normal text-vr-faint ml-0.5">{{ card.unit }}</span>
        </div>
        <div class="text-[0.65rem] text-vr-faint mt-1 uppercase tracking-[0.05em]">
          {{ card.label }}
        </div>
      </div>
    </div>
  </div>
</template>
