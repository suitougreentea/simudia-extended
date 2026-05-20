<template>
  <div ref="container" style="overflow: scroll" @click="clickBackground">
    <svg style="position: absolute; top: 0; left: 0" :width="gui.layout.width" :height="gui.layout.height">
      <filter id="selected-shadow" filterUnits="userSpaceOnUse" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="2"></feGaussianBlur>
        <feBlend in="SourceGraphic" in2="blur" mode="normal"></feBlend>
      </filter>
      <TimeGrid></TimeGrid>
      <VisibleStations></VisibleStations>
      <LineInput></LineInput>
      <VisibleLines></VisibleLines>
      <ClickableStations></ClickableStations>
      <ClickableLines></ClickableLines>
    </svg>
    <div style="position: absolute; top: 0; left: 0">
      <EditableStationNames></EditableStationNames>
      <TimeInput></TimeInput>
    </div>
  </div>
</template>

<script setup lang="ts">
import TimeGrid from "./TimeGrid.vue"
import VisibleStations from "./VisibleStations.vue"
import ClickableStations from "./ClickableStations.vue"
import VisibleLines from "./VisibleLines.vue"
import ClickableLines from "./ClickableLines.vue"
import LineInput from "./LineInput.vue"
import EditableStationNames from "./EditableStationNames.vue"
import TimeInput from "./TimeInput.vue"
import { ref, onBeforeUnmount } from "vue"
import { useGuiStore } from "../stores/gui"
import { observeMainWorkspaceSize } from "../gui-util"

const gui = useGuiStore()

const container = ref<HTMLDivElement>()
const { cancel: cancelContainerObservation } = observeMainWorkspaceSize(container, gui)
onBeforeUnmount(() => cancelContainerObservation())

const clickBackground = () => {
  gui.unselectAll()
}
</script>

<style scoped></style>
