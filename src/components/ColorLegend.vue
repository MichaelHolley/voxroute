<script setup lang="ts">
import SlopeLegend from "./SlopeLegend.vue";
import GlassPanel from "./GlassPanel.vue";
</script>

<template>
  <GlassPanel class="absolute bottom-[52px] left-4 flex flex-col gap-[0.45rem] px-3 py-2.5">
    <SlopeLegend />
  </GlassPanel>
</template>
