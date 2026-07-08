<script setup lang="ts">
defineProps<{
  isFlying: boolean;
  progress: number;
}>();
</script>

<template>
  <div
    class="absolute bottom-0 left-0 right-0 h-[3px] bg-vr-blue/15 transition-opacity duration-300"
    :class="isFlying ? 'opacity-100' : 'opacity-0'"
  >
    <div
      class="h-full bg-gradient-to-r from-vr-blue to-vr-purple transition-[width] duration-100"
      :style="{ width: `${progress * 100}%` }"
    ></div>
  </div>
</template>
