<script setup lang="ts">
import { ref, watch, onMounted } from "vue";

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
</script>

<template>
  <div class="stats-panel">
    <div class="stats-title">Route Statistics</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M2 10 Q6 4 10 10 Q14 16 18 10"
              stroke="#378ADD"
              stroke-width="1.8"
              fill="none"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <div class="stat-value">
          {{ fmt(displayed.distance / 1000, 2) }}<span class="unit">km</span>
        </div>
        <div class="stat-label">Distance</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 16 L10 4 L16 16"
              stroke="#22c55e"
              stroke-width="1.8"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="stat-value">{{ fmt(displayed.elevationGain) }}<span class="unit">m</span></div>
        <div class="stat-label">Elev. Gain</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M2 14 L8 6 L14 10 L18 4"
              stroke="#eab308"
              stroke-width="1.8"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="stat-value">{{ fmt(displayed.maxEle) }}<span class="unit">m</span></div>
        <div class="stat-label">Max Elev.</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M2 6 L8 14 L14 10 L18 16"
              stroke="#ef4444"
              stroke-width="1.8"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="stat-value">{{ fmt(displayed.minEle) }}<span class="unit">m</span></div>
        <div class="stat-label">Min Elev.</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="2" fill="#7c3aed" />
            <circle cx="4" cy="6" r="1.5" fill="#7c3aed" opacity="0.6" />
            <circle cx="16" cy="14" r="1.5" fill="#7c3aed" opacity="0.6" />
            <circle cx="4" cy="14" r="1.5" fill="#7c3aed" opacity="0.4" />
            <circle cx="16" cy="6" r="1.5" fill="#7c3aed" opacity="0.4" />
          </svg>
        </div>
        <div class="stat-value">{{ displayed.pointCount }}<span class="unit">pts</span></div>
        <div class="stat-label">Track Points</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-panel {
  background: #1a1a24;
  border: 1px solid #2a2a3a;
  border-radius: 12px;
  padding: 1rem;
}

.stats-title {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4a5570;
  margin-bottom: 0.75rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.stat-card {
  background: #0f0f14;
  border: 1px solid #1e1e2a;
  border-radius: 8px;
  padding: 0.75rem 0.5rem;
  text-align: center;
  transition: border-color 0.2s;
}

.stat-card:hover {
  border-color: #2a2a4a;
}

.stat-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 0.4rem;
}

.stat-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: #e2e8f0;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.unit {
  font-size: 0.65rem;
  font-weight: 400;
  color: #4a5570;
  margin-left: 2px;
}

.stat-label {
  font-size: 0.65rem;
  color: #4a5570;
  margin-top: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
