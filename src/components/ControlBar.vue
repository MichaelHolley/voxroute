<script setup lang="ts">
type CameraMode = "free" | "top" | "side";

const props = defineProps<{
  activeMode: CameraMode;
  isFlying: boolean;
  flyProgress: number;
}>();

const emit = defineEmits<{
  "set-mode": [mode: CameraMode];
  "toggle-fly": [];
}>();

const modes: { id: CameraMode; label: string; icon: string }[] = [
  {
    id: "free",
    label: "Free",
    icon: `<path d="M8 8 L16 8 M12 4 L12 16 M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
           <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  },
  {
    id: "top",
    label: "Top",
    icon: `<circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
           <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
           <path d="M12 5 L12 3 M12 21 L12 19 M5 12 L3 12 M21 12 L19 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  {
    id: "side",
    label: "Side",
    icon: `<rect x="4" y="8" width="16" height="8" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
           <path d="M4 12 L20 12" stroke="currentColor" stroke-width="1" opacity="0.4"/>`,
  },
];
</script>

<template>
  <div class="control-bar">
    <div class="mode-group">
      <button
        v-for="m in modes"
        :key="m.id"
        class="mode-btn"
        :class="{ active: activeMode === m.id && !isFlying }"
        @click="emit('set-mode', m.id)"
        :title="m.label"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" v-html="m.icon"></svg>
        <span>{{ m.label }}</span>
      </button>
    </div>

    <div class="divider"></div>

    <button
      class="fly-btn"
      :class="{ active: isFlying }"
      @click="emit('toggle-fly')"
      :title="isFlying ? 'Stop fly-through' : 'Start fly-through'"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path v-if="!isFlying" d="M5 4 L19 12 L5 20 Z" fill="currentColor" />
        <g v-else>
          <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
          <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
        </g>
      </svg>
      <span>{{ isFlying ? "Stop" : "Fly-through" }}</span>
      <span v-if="isFlying" class="fly-pct">{{ Math.round(flyProgress * 100) }}%</span>
    </button>
  </div>
</template>

<style scoped>
.control-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #1a1a24;
  border: 1px solid #2a2a3a;
  border-radius: 10px;
  padding: 0.4rem;
}

.mode-group {
  display: flex;
  gap: 0.25rem;
}

.mode-btn,
.fly-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: #6b7a99;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.mode-btn:hover,
.fly-btn:hover {
  background: #1e2030;
  color: #a0aec0;
}

.mode-btn.active {
  background: rgba(55, 138, 221, 0.15);
  border-color: rgba(55, 138, 221, 0.4);
  color: #378add;
}

.fly-btn.active {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
}

.fly-pct {
  font-variant-numeric: tabular-nums;
  font-size: 0.7rem;
  opacity: 0.8;
}

.divider {
  width: 1px;
  height: 24px;
  background: #2a2a3a;
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .mode-btn span,
  .fly-btn span:first-of-type {
    display: none;
  }
  .control-bar {
    gap: 0.25rem;
    padding: 0.3rem;
  }
}
</style>
