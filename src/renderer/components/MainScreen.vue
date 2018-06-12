<template lang="pug">
div(style="position: relative")
  div.diagram
    div
      button(v-if="$root.canUndo" @click="$root.undo") Undo
      button(v-else disabled) Undo
      button(v-if="$root.canRedo" @click="$root.redo") Redo
      button(v-else disabled) Redo
      button(@click="mode = 'input'") Input mode
      button(@click="mode = 'edit'") Edit mode
      //-div {{ hoveredLine }}
      //-div {{ hoveredSet }}
      //-div {{ hoveredSegment }}
      //-div {{ selectedLine }}
      //-div {{ selectedSet }}
      //-div {{ selectedSegment }}
    div(style="position: relative")
      div(style="position: absolute; top: 0; left: 0;")
      svg(:width="layout.width", :height="layout.height" ref="svg")
        filter(id="selected-shadow" filterUnits="userSpaceOnUse" width="200%" height="200%")
          feGaussianBlur(in="SourceGraphic" result="blur" stdDeviation=2)
          feBlend(in="SourceGraphic" in2="blur" mode="normal")
        LineDefs(:mode="mode" :x="x" :accumulatedStationY="accumulatedStationY" :lineSelection="lineSelection"
                 @update-line-selection="updateLineSelection")
        StationDefs(:mode="mode" :stations="stations" :xi="xi" :accumulatedStationY="accumulatedStationY" :layout="layout" :stationSelection="stationSelection" :relativeX="relativeX"
                    @update-station-selection="updateStationSelection" @update-hovered-time="updateHoveredTime" @click-station-line-input="clickStationLineInput")
        LineInputDefs(ref="lineInputDefs" :mode="mode" :x="x" :accumulatedStationY="accumulatedStationY" :stationSelection="stationSelection" :hoveredTime="hoveredTime" :modifierStates="modifierStates"
                      @start-time-input="startTimeInput")

        line(v-for="l in vgrids" :x1="l.x" :x2="l.x" :y1="l.y" :y2="layout.bottom" :stroke="l.color")
        use(xlink:href="#stations")
        use(v-if="mode == 'input'" xlink:href="#line-input")
        use(xlink:href="#lines")

        use(xlink:href="#stations-hover")
        use(xlink:href="#lines-hover")
      div(style="position: absolute; top: 0; left: 0;")
        div.station-name(contenteditable v-for="(s, i) in stations" :style="{ top: accumulatedStationY[i] - 20 + 'px', left: '20px' }"
            @keydown.tab.prevent="modifyStationKeyProceed(i)" @keydown.enter.prevent="modifyStationKeyProceed(i)" @keydown.esc.prevent="modifyStationKeyCancel(i)" @blur="modifyStationBlur(i)"
            ref="existingStation") {{ s.name }}
        div.station-name(contenteditable :style="{ top: newStationY + 'px', left: '20px' }"
            @keydown.tab.prevent="newStationKeyProceed" @keydown.enter.prevent="newStationKeyProceed" @keydown.esc.prevent="newStationKeyCancel" @blur="newStationBlur"
            ref="newStation")
        div.station-name(:style="{ top: '-100px', left: '-100px' }"
            ref="stationForMeasure")
        TimeInput(ref="timeInput", :x="x" :accumulatedStationY="accumulatedStationY"
                  @end-line-input="endLineInput")
  div.property-side
    SidebarLine(:lineSelection="lineSelection")


</template>

<script lang="ts">
import Vue from "vue"
import { SECOND_DIVISOR } from "../../time"
import SidebarLine from "./SidebarLine.vue"
import LineDefs from "./LineDefs.vue"
import StationDefs from "./StationDefs.vue"
import LineInputDefs from "./LineInputDefs.vue"
import TimeInput from "./TimeInput.vue"

import { remote } from "electron"
const { Menu, MenuItem, dialog } = remote

const MARGIN = 20
const HEADER_HEIGHT = 20

export default Vue.extend({
  components: {
    SidebarLine,
    LineDefs,
    StationDefs,
    LineInputDefs,
    TimeInput
  },
  data: function() {
    return {
      mode: "input",
      lineSelection: {
        hoveredLine: -1,
        hoveredSet: -1,
        hoveredHalt: -1,
        hoveredType: -1,
        selectedLine: -1,
        selectedSet: -1,
        selectedHalt: -1,
        selectedType: -1
      },
      stationSelection: {
        hovered: -1,
        selected: -1
      },
      hoveredTime: -1,
      modifierStates: {
        control: false,
        shift: false
      }
    }
  },
  methods: {
    a() {
      console.log("!")
    },
    x(tick: number): number {
      return this.layout.left + this.layout.stationsWidth + tick / 7200
    },
    xi(x: number): number {
      return (x - this.layout.left - this.layout.stationsWidth) * 7200
    },
    newStationKeyProceed() {
      const element = this.$refs.newStation as HTMLElement
      const text = element.innerText.trim()
      if (text != "") {
        this.$store.commit("addStation", { name: text, width: this.measureStationWidth(text) })
        element.innerText = ""
      } else {
        element.blur()
      }
    },
    newStationKeyCancel() {
      const element = this.$refs.newStation as HTMLElement
      element.innerText = ""
      element.blur()
    },
    newStationBlur() {
      const element = this.$refs.newStation as HTMLElement
      const text = element.innerText.trim()
      if (text != "") {
        this.$store.commit("addStation", { name: text, width: this.measureStationWidth(text) })
        element.innerText = ""
      }
    },
    modifyStationKeyProceed(i: number) {
      const array = (this.$refs.existingStation as Array<HTMLElement>)
      const element = array[i]
      const text = element.innerText.trim()
      if (text != this.stations[i].name) {
        this.$store.commit("modifyStation", { pos: i, name: text, width: this.measureStationWidth(text) })
      }
      if (array.length == i + 1) {
        (this.$refs.newStation as HTMLElement).focus()
      } else {
        array[i + 1].focus()
      }
    },
    modifyStationKeyCancel(i: number) {
      const array = (this.$refs.existingStation as Array<HTMLElement>)
      const element = array[i]
      element.innerText = this.stations[i].name
      element.blur()
    },
    modifyStationBlur(i: number) {
      const array = (this.$refs.existingStation as Array<HTMLElement>)
      const element = array[i]
      const text = element.innerText.trim()
      if (text != this.stations[i].name) {
        this.$store.commit("modifyStation", { pos: i, name: text, width: this.measureStationWidth(text) })
      }
    },
    measureStationWidth(name: string): number {
      const element = this.$refs.stationForMeasure as HTMLElement
      element.innerText = name
      return element.clientWidth
    },
    updateLineSelection(selection: any) {
      Vue.set(this, "lineSelection", {...this.lineSelection, ...selection})
    },
    updateStationSelection(selection: any) {
      Vue.set(this, "stationSelection", {...this.stationSelection, ...selection})
    },
    updateHoveredTime(time: number) {
      this.hoveredTime = time
    },
    relativeX(x: number) {
      return x - (this.$refs.svg as HTMLElement).getBoundingClientRect().left
    },
    relativeY(y: number) {
      return y - (this.$refs.svg as HTMLElement).getBoundingClientRect().top
    },
    clickStationLineInput(event: any) {
      (this.$refs.lineInputDefs as any).addPoint(event)
    },
    startTimeInput(rubberbands: Array<any>) {
      (this.$refs.timeInput as any).start(rubberbands)
    },
    endLineInput() {
      (this.$refs.lineInputDefs as any).end()
    },
    openFile() {
      const result = dialog.showOpenDialog(remote.getCurrentWindow(), {
        properties: ["openFile"],
        filters: [{name: "SimuDia-Extended file", extensions: ["simudiax"]}]
      })
      if (result != undefined) {

      }
    },
    saveFile() {

    },
    saveAs() {
      const result = dialog.showSaveDialog(remote.getCurrentWindow(), {
        filters: [{name: "SimuDia-Extended file", extensions: ["simudiax"]}]
      })
      if (result != undefined) {
        this.$store.commit("saveToFile", { path: result })
      }
    }
  },
  computed: {
    layout(): any {
      const stationsWidth = Math.max(100, ...this.stations.map(e => e.width)) + 10

      const monthLength = this.$store.state.month_length.getTick()
      const width = MARGIN + stationsWidth + monthLength / 7200 + MARGIN

      const ys = this.accumulatedStationY
      let height: number
      if (ys.length == 0) height = 60
      else height = ys[ys.length - 1] + MARGIN

      return {
        top: MARGIN,
        left: MARGIN,
        right: width - MARGIN,
        bottom: height - MARGIN,
        width,
        height,
        headerHeight: HEADER_HEIGHT,
        stationsWidth
      }
    },
    newStationY(): number {
      const stations = this.$store.state.stations
      if (stations.length == 0) {
        return 20
      } else {
        return this.layout.height - 20
      }
    },
    vgrids() {
      const result = []
      const monthLength = this.$store.state.month_length.getTick()
      for (let i = 0; i <= monthLength; i += SECOND_DIVISOR * 60 * 3) {
        const x: number = this.x(i)
        let color: string
        let y: number
        if (i % (SECOND_DIVISOR * 60 * 60) == 0) {
          color = "black"
          y = this.layout.top
        } else if (i % (SECOND_DIVISOR * 60 * 15) == 0) {
          color = "gray"
          y = this.layout.top + this.layout.headerHeight
        } else {
          color = "lightgray"
          y = this.layout.top + this.layout.headerHeight
        }
        result.push({ x: x, y: y, color: color })
      }
      return result
    },
    stations(): Array<any> { return this.$store.state.stations },
    accumulatedStationY(): Array<number> { return this.$store.getters.accumulatedStationTimes.map((e: number) => (MARGIN + 20 + e / 3600)) },
  },
  watch: {
  },
  created: function() {
    const menu = new Menu()
    const fileMenu = new Menu()
    fileMenu.append(new MenuItem({ label: "&Open...", click: () => this.openFile() }))
    fileMenu.append(new MenuItem({ label: "&Save", click: () => this.saveFile() }))
    fileMenu.append(new MenuItem({ label: "Save &As...", click: () => this.saveAs() }))
    menu.append(new MenuItem({ label: "&File", submenu: fileMenu }))
    if (remote.getGlobal("process").env.NODE_ENV == "development") {
      menu.append(new MenuItem({ label: "&Reload", role: "forcereload" }))
    }
    Menu.setApplicationMenu(menu)

    window.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key == "Shift") this.modifierStates = { ...this.modifierStates, shift: true }
      if (event.key == "Control") this.modifierStates = { ...this.modifierStates, control: true }
    })
    window.addEventListener("keyup", (event: KeyboardEvent) => {
      if (event.key == "Shift") this.modifierStates = { ...this.modifierStates, shift: false }
      if (event.key == "Control") this.modifierStates = { ...this.modifierStates, control: false }
    })
  },
})
</script>

<style lang="stylus">
.station-name
  min-width: 100px
  line-height: 20px
  position: absolute
  white-space: nowrap

.time-input-container
  min-width: 100px
  line-height: 20px
  position: absolute
  white-space: nowrap
  background-color: rgba(255, 255, 255, 0.7)
  box-shadow: 0px 0px 2px 1px black
  .error
    box-shadow: 0px 0px 2px 1px red

.selectedLine
  filter: url(#selected-shadow)

.diagram
  position: fixed
  top: 0
  left: 0
  width: 70%
  height: 100%
  background-color: white
  overflow-x: auto
  overflow-y: auto

.property-side
  position: fixed
  top: 0
  right: 0
  width: 30%
  height: 100%
  background-color: white
  border-left: 2px solid black
</style>
