<template>
  <StationLine
    v-if="gui.stations.length == 0"
    :x1="gui.layout.left"
    :x2="gui.layout.right"
    :y="gui.layout.top + gui.layout.headerHeight"
    stroke="dimgrey">
  </StationLine>
  <StationLine
    v-for="station in gui.stations"
    appearance="normal"
    :x1="gui.layout.left"
    :x2="gui.layout.right"
    :y="gui.y(station.accumulatedTime)">
  </StationLine>
  <StationLine
    v-for="station in gui.resolvedHoveredStations"
    appearance="hovered"
    :x1="gui.layout.left"
    :x2="gui.layout.right"
    :y="gui.y(station.accumulatedTime)">
  </StationLine>
  <StationLine
    v-for="station in gui.resolvedSelectedStations"
    appearance="selected"
    :x1="gui.layout.left"
    :x2="gui.layout.right"
    :y="gui.y(station.accumulatedTime)">
  </StationLine>
</template>

<script setup lang="ts">
import StationLine from "../components/StationLine.vue"
import { useGuiStore } from "../stores/gui"

const gui = useGuiStore()
</script>

<style scoped></style>