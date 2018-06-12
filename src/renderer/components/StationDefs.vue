<template lang="pug">
defs
  symbol#stations
    line(v-for="(s, i) in stations" :x1="layout.left" :x2="layout.right" :y1="accumulatedStationY[i]" :y2="accumulatedStationY[i]" stroke="black" :stroke-width="stationSelection.hovered == i ? 2.5 : 1")
    line(v-if="stations.length == 0" :x1="layout.left" :x2="layout.right" :y1="layout.top + layout.headerHeight" :y2="layout.top + layout.headerHeight" stroke="black")
    //- TODO: 20 = TOP_SIZE
  symbol#stations-hover
    line(v-for="(s, i) in stations" :x1="layout.left" :x2="layout.right" :y1="accumulatedStationY[i]" :y2="accumulatedStationY[i]" stroke="transparent" stroke-width=10
        @mousemove="hoverStation(i, $event)" @mouseout="unhoverStation(i)" @click.prevent="clickStationLine(i, $event)" @contextmenu.prevent="contextStationLine(i, $event)")
  
</template>
<script lang="ts">
import Vue from 'vue'
import * as Electron from "electron"
const { Menu, MenuItem } = Electron.remote

export default Vue.extend({
  props: ["mode", "stations", "xi", "accumulatedStationY", "layout", "stationSelection", "relativeX"],
  methods: {
    hoverStation(i: number, e: MouseEvent) {
      this.$emit("update-station-selection", {
        hovered: i
      })
      const x = this.relativeX(e.clientX)
      const hoveredTime = this.xi(x)
      this.$emit("update-hovered-time", hoveredTime)
    },
    unhoverStation(i: number) {
      if (this.stationSelection.hovered == i) {
        this.$emit("update-station-selection", {
          hovered: -1
        })
      }
    },
    clickStationLine(i: number, e: MouseEvent) {
      if (this.mode == "input") {
        const x = this.relativeX(e.clientX)
        const cursorTime = this.xi(x)
        if (cursorTime >= 0) {
          this.$emit("click-station-line-input", {
            station: i,
            time: cursorTime,
            skip: e.getModifierState("Shift")
          })
        }
      } else if (this.mode == "edit") {
        this.$emit("update-station-selection", {
          hovered: i,
          selected: i,
        })
      }
    },
    contextStationLine(i: number, e: MouseEvent) {
      if (this.mode == "edit") {
        this.$emit("update-station-selection", {
          hovered: i,
          selected: i,
        })
        const menu = new Menu()
        menu.append(new MenuItem({
          label: "Insert station above",
          click: () => {
            this.$store.commit("addStation", {
              pos: i,
              name: "New station",
              width: 100
            })
            // TODO: focus
          }
        }))
        menu.append(new MenuItem({
          label: "Insert station below",
          click: () => {
            this.$store.commit("addStation", {
              pos: i + 1,
              name: "New station",
              width: 100
            })
            // TODO: focus
          }
        }))
        menu.append(new MenuItem({
          label: "Delete station",
          click: () => {
            this.$store.commit("deleteStation", {
              pos: i + 1,
            })
          }
        }))
        menu.popup()
      }
    },
  }
})
</script>
<style lang="stylus">

</style>
