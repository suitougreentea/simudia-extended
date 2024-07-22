<template>
  <g>
    <StationLine
      v-for="(station, i) in gui.stations"
      appearance="clickable"
      :x1="gui.layout.left"
      :x2="gui.layout.right"
      :y="gui.y(station.accumulatedTime)"
      @mousemove="hoverStationLine($event, i)"
      @mouseout="unhoverStationLine($event, i)"
      @click.prevent.stop="clickStationLine($event, i)"
      @contextmenu.prevent.stop="contextStationLine($event, i)">
    </StationLine>
  </g>
</template>

<script setup lang="ts">
import { inject } from "vue"
import StationLine from "../components/StationLine.vue"
import { useGuiStore } from "../stores/gui"
import { useGuiMessageStore } from "../stores/gui-message"
import { stationContextMenuInjection } from "./injection"

const gui = useGuiStore()
const message = useGuiMessageStore()

const contextMenu = inject(stationContextMenuInjection)!

const hoverStationLine = (ev: MouseEvent, stationIndex: number) => {
  const station = gui.stations[stationIndex]
  gui.hoverStation(station.id)
  const root = (ev.target as HTMLElement).closest("svg")!
  const x = ev.clientX - root.getBoundingClientRect().left
  const hoveredTime = gui.xi(x)
  gui.hoveredTime = hoveredTime
}

const unhoverStationLine = (_ev: MouseEvent, stationIndex: number) => {
  const station = gui.stations[stationIndex]
  gui.unhoverStation(station.id)
}

const clickStationLine = (ev: MouseEvent, stationIndex: number) => {
  const station = gui.stations[stationIndex]
  if (gui.mode === "input" && !gui.inputtingTime) {
    const root = (ev.target as HTMLElement).closest("svg")!
    const x = ev.clientX - root.getBoundingClientRect().left
    const cursorTime = gui.xi(x)
    if (cursorTime >= 0) {
      const stationIndex = gui.stations.findIndex((e) => e.id == station.id)
      if (stationIndex >= 0) {
        message.addLineInputPoint({ stationIndex, time: cursorTime, skip: !gui.modifierStates.shift })
      }
    }
  } else if (gui.mode === "edit") {
    gui.unselectLine()
    if (gui.modifierStates.control) {
      gui.toggleAppendStationSelection(station.id)
    } else {
      gui.selectStation(station.id)
    }
  }
}

const contextStationLine = (ev: MouseEvent, stationIndex: number) => {
  const station = gui.stations[stationIndex]
  if (gui.mode === "edit") {
    if (gui.selectedStationIds.length > 1 && gui.selectedStationIds.findIndex((e) => e == station.id) >= 0) {
      contextMenu.value.open(ev, gui.selectedStationIds)
    } else {
      contextMenu.value.open(ev, [station.id])
    }
  }
}
</script>

<style scoped></style>