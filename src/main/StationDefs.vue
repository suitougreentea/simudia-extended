<!-- NOTE: This component must be a child of MainScreen -->

<template lang="pug">
defs
  symbol#stations
    line(v-for="(s, i) in $parent.stations"
      :x1="$parent.layout.left" :x2="$parent.layout.right" :y1="$parent.accumulatedStationY[i]" :y2="$parent.accumulatedStationY[i]"
      stroke="black" :stroke-width="1")
    g(v-if="$parent.stationSelection.hovered >= 0")
      line(
        :x1="$parent.layout.left" :x2="$parent.layout.right" :y1="$parent.accumulatedStationY[$parent.stationSelection.hovered]" :y2="$parent.accumulatedStationY[$parent.stationSelection.hovered]"
        stroke="black" :stroke-width="2.5")
    g(v-if="$parent.stationSelection.selected >= 0")
      line.selectedLine(
        :x1="$parent.layout.left" :x2="$parent.layout.right" :y1="$parent.accumulatedStationY[$parent.stationSelection.selected]" :y2="$parent.accumulatedStationY[$parent.stationSelection.selected]"
        stroke="black" :stroke-width="1")
    line(v-if="$parent.stations.length == 0"
      :x1="$parent.layout.left" :x2="$parent.layout.right" :y1="$parent.layout.top + $parent.layout.headerHeight" :y2="$parent.layout.top + $parent.layout.headerHeight"
      stroke="black")
  symbol#stations-hover
    line(v-for="(s, i) in $parent.stations"
      :x1="$parent.layout.left" :x2="$parent.layout.right" :y1="$parent.accumulatedStationY[i]" :y2="$parent.accumulatedStationY[i]" stroke="transparent" stroke-width=10
      @mousemove="hoverStation(i, $event)" @mouseout="unhoverStation(i)" @click.prevent.stop="clickStationLine(i, $event)" @contextmenu.prevent.stop="contextStationLine(i, $event)")
</template>

<script setup lang="ts">
import { getCurrentInstance } from "vue"
import { type ExposedType } from "./MainScreen.vue";

// TODO: remove
const instance: { parent: { exposed: ExposedType } } = getCurrentInstance()

const hoverStation = (i, e) => {
  instance.parent.exposed.stationSelection.value.hovered = i
  const x = instance.parent.exposed.relativeX(e.clientX)
  const hoveredTime = instance.parent.exposed.xi(x)
  instance.parent.exposed.hoveredTime.value = hoveredTime
}

const unhoverStation = (i) => {
  if (instance.parent.exposed.stationSelection.value.hovered === i) {
    instance.parent.exposed.stationSelection.value.hovered = -1
  }
}

const clickStationLine = (i, e) => {
  if (instance.parent.exposed.mode.value === "input" && !instance.parent.exposed.inputtingTime.value) {
    const x = instance.parent.exposed.relativeX(e.clientX)
    const cursorTime = instance.parent.exposed.xi(x)
    if (cursorTime >= 0) {
      instance.parent.exposed.lineInputDefs.value.addPoint({ station: i, time: cursorTime, skip: !e.getModifierState("Shift") })
    }
  } else if (instance.parent.exposed.mode.value === "edit") {
    instance.parent.exposed.unselectLine()
    instance.parent.exposed.stationSelection.value.hovered = i
    instance.parent.exposed.stationSelection.value.selected = i
  }
}

const contextStationLine = (i, e) => {
  if (instance.parent.exposed.mode.value === "edit") {
    console.warn("TODO: implement menu")
    /*
    const menu = new Menu()
    menu.append(new MenuItem({
      label: "Insert station above",
      click: () => {
        instance.parent.exposed.insertStationAboveSelected(i)
      }
    }))
    menu.append(new MenuItem({
      label: "Insert station below",
      click: () => {
        instance.parent.exposed.insertStationBelowSelected(i)
      }
    }))
    menu.append(new MenuItem({
      label: "Delete station",
      click: () => {
        instance.parent.exposed.deleteSelectedStation(i)
      }
    }))
    menu.popup()
    */
  }
}
</script>

<style lang="stylus">
</style>
