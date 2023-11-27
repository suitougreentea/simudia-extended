<template>  
  <defs>
    <symbol id="stations">
      <line v-for="s in gui.stations" :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.y(s.accumulatedTime)" :y2="gui.y(s.accumulatedTime)" stroke="dimgrey" :stroke-width="1"></line>
      <g v-if="gui.stationSelection.hovered >= 0">
        <line :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.y(gui.stations[gui.stationSelection.hovered].accumulatedTime)" :y2="gui.y(gui.stations[gui.stationSelection.hovered].accumulatedTime)" stroke="dimgrey" :stroke-width="2.5"></line>
      </g>
      <g v-if="gui.stationSelection.selected >= 0">
        <line class="selected-line" :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.y(gui.stations[gui.stationSelection.selected].accumulatedTime)" :y2="gui.y(gui.stations[gui.stationSelection.selected].accumulatedTime)" stroke="dimgrey" :stroke-width="1"></line>
      </g>
      <line v-if="gui.stations.length == 0" :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.layout.top + gui.layout.headerHeight" :y2="gui.layout.top + gui.layout.headerHeight" stroke="dimgrey"></line>
    </symbol>
    <symbol id="stations-hover">
      <line v-for="(s, i) in gui.stations" :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.y(s.accumulatedTime)" :y2="gui.y(s.accumulatedTime)" stroke="transparent" stroke-width="10" @mousemove="hoverStation(i, $event)" @mouseout="unhoverStation(i)" @click.prevent.stop="clickStationLine(i, $event)" @contextmenu.prevent.stop="contextStationLine($event, i)"></line>
    </symbol>
  </defs>
</template>

<script setup lang="ts">
import { inject } from "vue";
import { useGuiStore } from "../stores/gui";
import { useGuiMessageStore } from "../stores/gui-message";
import { stationContextMenuInjection } from "./injection";

const gui = useGuiStore()
const message = useGuiMessageStore()

const contextMenu = inject(stationContextMenuInjection)

const hoverStation = (i, e) => {
  gui.stationSelection.hovered = i
  const root = (e.target as HTMLElement).getRootNode().firstChild as HTMLElement
  const x = e.clientX - root.getBoundingClientRect().left + 20 // TODO
  const hoveredTime = gui.xi(x)
  gui.hoveredTime = hoveredTime
}

const unhoverStation = (i) => {
  if (gui.stationSelection.hovered === i) {
    gui.stationSelection.hovered = -1
  }
}

const clickStationLine = (i, e) => {
  if (gui.mode === "input" && !gui.inputtingTime) {
    const root = (e.target as HTMLElement).getRootNode().firstChild as HTMLElement
    const x = e.clientX - root.getBoundingClientRect().left + 20 // TODO
    const cursorTime = gui.xi(x)
    if (cursorTime >= 0) {
      message.addLineInputPoint({ stationIndex: i, time: cursorTime, skip: !e.getModifierState("Shift") })
    }
  } else if (gui.mode === "edit") {
    gui.unselectLine()
    gui.stationSelection.hovered = i
    gui.stationSelection.selected = i
  }
}

const contextStationLine = (ev: MouseEvent, index: number) => {
  if (gui.mode === "edit") {
    contextMenu.value.open(ev, index)
  }
}
</script>

<style scoped>
.selected-line {
  filter: url(#selected-shadow);
}
</style>
