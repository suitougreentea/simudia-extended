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
<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
  methods: {
    hoverStation(i, e) {
      this.$parent.stationSelection.hovered = i
      const x = this.$parent.relativeX(e.clientX)
      const hoveredTime = this.$parent.xi(x)
      this.$parent.hoveredTime = hoveredTime
    },
    unhoverStation(i) {
      if (this.$parent.stationSelection.hovered === i) {
        this.$parent.stationSelection.hovered = -1
      }
    },
    clickStationLine(i, e) {
      if (this.$parent.mode === "input" && !this.$parent.inputtingTime) {
        const x = this.$parent.relativeX(e.clientX)
        const cursorTime = this.$parent.xi(x)
        if (cursorTime >= 0) {
          this.$parent.$refs.lineInputDefs.addPoint({ station: i, time: cursorTime, skip: !e.getModifierState("Shift") })
        }
      } else if (this.$parent.mode === "edit") {
        this.$parent.unselectLine()
        this.$parent.stationSelection.hovered = i
        this.$parent.stationSelection.selected = i
      }
    },
    contextStationLine(i, e) {
      if (this.$parent.mode === "edit") {
        console.warn("TODO: implement menu")
        /*
        const menu = new Menu()
        menu.append(new MenuItem({
          label: "Insert station above",
          click: () => {
            this.$parent.insertStationAboveSelected(i)
          }
        }))
        menu.append(new MenuItem({
          label: "Insert station below",
          click: () => {
            this.$parent.insertStationBelowSelected(i)
          }
        }))
        menu.append(new MenuItem({
          label: "Delete station",
          click: () => {
            this.$parent.deleteSelectedStation(i)
          }
        }))
        menu.popup()
        */
      }
    },
  }
})
</script>
<style lang="stylus">

</style>
