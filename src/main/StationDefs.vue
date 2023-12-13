<template>
  <defs>
    <symbol id="stations">
      <line v-for="s in gui.stations" :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.y(s.accumulatedTime)" :y2="gui.y(s.accumulatedTime)" stroke="dimgrey" :stroke-width="1"></line>
      <g v-for="station in gui.resolvedHoveredStations">
        <line :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.y(station.accumulatedTime)" :y2="gui.y(station.accumulatedTime)" stroke="dimgrey" :stroke-width="2.5"></line>
      </g>
      <g v-for="station in gui.resolvedSelectedStations">
        <line class="selected-line" :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.y(station.accumulatedTime)" :y2="gui.y(station.accumulatedTime)" stroke="dimgrey" :stroke-width="1"></line>
      </g>
      <line
        v-if="gui.stations.length == 0"
        :x1="gui.layout.left"
        :x2="gui.layout.right"
        :y1="gui.layout.top + gui.layout.headerHeight"
        :y2="gui.layout.top + gui.layout.headerHeight"
        stroke="dimgrey"
      ></line>
    </symbol>
    <symbol id="stations-hover">
      <line
        v-for="s in gui.stations"
        :x1="gui.layout.left"
        :x2="gui.layout.right"
        :y1="gui.y(s.accumulatedTime)"
        :y2="gui.y(s.accumulatedTime)"
        stroke="transparent"
        stroke-width="10"
        @mousemove="hoverStationLine(s, $event)"
        @mouseout="unhoverStationLine(s, $event)"
        @click.prevent.stop="clickStationLine(s, $event)"
        @contextmenu.prevent.stop="contextStationLine(s, $event)"
      ></line>
    </symbol>
  </defs>
</template>

<script setup lang="ts">
import { inject } from "vue"
import { useGuiStore } from "../stores/gui"
import { useGuiMessageStore } from "../stores/gui-message"
import { stationContextMenuInjection } from "./injection"
import { type Station } from "../stores/main"

const gui = useGuiStore()
const message = useGuiMessageStore()

const contextMenu = inject(stationContextMenuInjection)

const hoverStationLine = (station: Station, ev: MouseEvent) => {
  gui.hoverStation(station.id)
  const root = (ev.target as HTMLElement).getRootNode().firstChild as HTMLElement
  const x = ev.clientX - root.getBoundingClientRect().left + gui.layout.left
  const hoveredTime = gui.xi(x)
  gui.hoveredTime = hoveredTime
}

const unhoverStationLine = (station: Station, _ev: MouseEvent) => {
  gui.unhoverStation(station.id)
}

const clickStationLine = (station: Station, ev: MouseEvent) => {
  if (gui.mode === "input" && !gui.inputtingTime) {
    const root = (ev.target as HTMLElement).getRootNode().firstChild as HTMLElement
    const x = ev.clientX - root.getBoundingClientRect().left + gui.layout.left
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

const contextStationLine = (station: Station, ev: MouseEvent) => {
  if (gui.mode === "edit") {
    if (gui.selectedStationIds.length > 1 && gui.selectedStationIds.findIndex((e) => e == station.id) >= 0) {
      contextMenu.value.open(ev, gui.selectedStationIds)
    } else {
      contextMenu.value.open(ev, [station.id])
    }
  }
}
</script>

<style scoped>
.selected-line {
  filter: url(#selected-shadow);
}
</style>
