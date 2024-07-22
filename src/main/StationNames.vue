<template>
  <text
    v-for="s in gui.stations"
    ref="existingStation"
    type="text"
    class="station-name"
    x="20"
    :y="gui.y(s.accumulatedTime) - 6">
    {{ s.name }}
  </text>

</template>

<script setup lang="ts">
import { useGuiStore } from "../stores/gui"

const gui = useGuiStore()
</script>

<style scoped>
.station-name {
  font-size: 14px;
}
</style>