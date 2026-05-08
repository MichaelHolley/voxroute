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
  <div class="flex items-center gap-2 bg-vr-surface border border-vr-line rounded-[10px] p-1.5">
    <div class="flex gap-1">
      <button
        v-for="m in modes"
        :key="m.id"
        class="flex items-center gap-1.5 px-3 py-[0.45rem] rounded-[7px] border border-transparent bg-transparent text-vr-muted text-[0.8rem] font-[inherit] cursor-pointer transition-all duration-150 whitespace-nowrap hover:bg-vr-hover hover:text-vr-soft"
        :class="
          activeMode === m.id && !isFlying ? 'bg-vr-blue/15 !border-vr-blue/40 text-vr-blue' : ''
        "
        :title="m.label"
        @click="emit('set-mode', m.id)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" v-html="m.icon"></svg>
        <span class="max-[480px]:hidden">{{ m.label }}</span>
      </button>
    </div>

    <div class="w-px h-6 bg-vr-line shrink-0"></div>

    <button
      class="flex items-center gap-1.5 px-3 py-[0.45rem] rounded-[7px] border border-transparent bg-transparent text-vr-muted text-[0.8rem] font-[inherit] cursor-pointer transition-all duration-150 whitespace-nowrap hover:bg-vr-hover hover:text-vr-soft"
      :class="isFlying ? 'bg-vr-red/15 !border-vr-red/40 text-vr-red' : ''"
      :title="isFlying ? 'Stop fly-through' : 'Start fly-through'"
      @click="emit('toggle-fly')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path v-if="!isFlying" d="M5 4 L19 12 L5 20 Z" fill="currentColor" />
        <g v-else>
          <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
          <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
        </g>
      </svg>
      <span class="max-[480px]:hidden">{{ isFlying ? "Stop" : "Fly-through" }}</span>
      <span v-if="isFlying" class="tabular-nums text-[0.7rem] opacity-80">
        {{ Math.round(flyProgress * 100) }}%
      </span>
    </button>
  </div>
</template>
