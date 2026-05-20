<template>
  <div ref="container" style="overflow: scroll">
    <svg id="export-preview-space" style="position: absolute; top: 0; left: 0" :width="gui.layout.width" :height="gui.layout.height">
      <TimeGrid id="time-grid"></TimeGrid>
      <g id="station-names">
        <StationNames></StationNames>
      </g>
      <VisibleStations id="station-lines"></VisibleStations>
      <VisibleLines id="lines"></VisibleLines>
    </svg>
  </div>
</template>

<script setup lang="ts">
import TimeGrid from "./TimeGrid.vue"
import VisibleStations from "./VisibleStations.vue"
import VisibleLines from "./VisibleLines.vue"
import StationNames from "./StationNames.vue"
import { onBeforeUnmount, ref } from "vue"
import { useGuiStore } from "../stores/gui"
import { observeMainWorkspaceSize } from "../gui-util"

const gui = useGuiStore()

const container = ref<HTMLDivElement>()
const { cancel: cancelContainerObservation } = observeMainWorkspaceSize(container, gui)
onBeforeUnmount(() => cancelContainerObservation())
</script>

<style scoped>
</style>