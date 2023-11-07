<template>  
  <defs>
    <symbol id="stations">
      <line v-for="(s, i) in gui.stations" :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.accumulatedStationY[i]" :y2="gui.accumulatedStationY[i]" stroke="black" :stroke-width="1"></line>
      <g v-if="gui.stationSelection.hovered >= 0">
        <line :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.accumulatedStationY[gui.stationSelection.hovered]" :y2="gui.accumulatedStationY[gui.stationSelection.hovered]" stroke="black" :stroke-width="2.5"></line>
      </g>
      <g v-if="gui.stationSelection.selected >= 0">
        <line class="selectedLine" :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.accumulatedStationY[gui.stationSelection.selected]" :y2="gui.accumulatedStationY[gui.stationSelection.selected]" stroke="black" :stroke-width="1"></line>
      </g>
      <line v-if="gui.stations.length == 0" :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.layout.top + gui.layout.headerHeight" :y2="gui.layout.top + gui.layout.headerHeight" stroke="black"></line>
    </symbol>
    <symbol id="stations-hover">
      <line v-for="(s, i) in gui.stations" :x1="gui.layout.left" :x2="gui.layout.right" :y1="gui.accumulatedStationY[i]" :y2="gui.accumulatedStationY[i]" stroke="transparent" stroke-width="10" @mousemove="hoverStation(i, $event)" @mouseout="unhoverStation(i)" @click.prevent.stop="clickStationLine(i, $event)" @contextmenu.prevent.stop="contextStationLine(i, $event)"></line>
    </symbol>
  </defs>
</template>

<script setup lang="ts">
import { useGuiStore } from "../stores/gui";
import { useGuiMessageStore } from "../stores/gui-message";

const gui = useGuiStore()
const message = useGuiMessageStore()

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

const contextStationLine = (i, e) => {
  if (gui.mode === "edit") {
    console.warn("TODO: implement menu")
    /*
    const menu = new Menu()
    menu.append(new MenuItem({
      label: "Insert station above",
      click: () => {
        gui.insertStationAboveSelected(i)
      }
    }))
    menu.append(new MenuItem({
      label: "Insert station below",
      click: () => {
        gui.insertStationBelowSelected(i)
      }
    }))
    menu.append(new MenuItem({
      label: "Delete station",
      click: () => {
        gui.deleteSelectedStation(i)
      }
    }))
    menu.popup()
    */
  }
}
</script>

<style scoped>
</style>
