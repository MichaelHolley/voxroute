<script setup lang="ts">
// Shared translucent "glass" container for all floating overlay panels
// (control bar, stats, legend, slider). Single source of truth for the
// surface treatment: background tint, border, radius and backdrop blur.
// Layout, padding and positioning are supplied by the consumer via the
// fallthrough `class` attribute, which Vue merges onto the root element.
</script>

<template>
  <div class="bg-[rgba(15,15,20,0.85)] border border-vr-line rounded-lg backdrop-blur-[8px]">
    <slot />
  </div>
</template>
