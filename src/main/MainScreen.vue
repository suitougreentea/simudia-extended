<!-- NOTE: This component's data may be changed by the other components in the same folder for performances -->

<template lang="pug">
div(style="position: relative" @dragover="dragover" @drop="drop")
  div.diagram(@click="clickBackground")
    div.toolbar
      div.toolbar-button(@click.prevent.stop="openFile") Open
      div.toolbar-button(@click.prevent.stop="downloadFile") Download
      br
      //-button(v-if="$root.canUndo" @click="$root.undo") Undo
      //-button(v-else disabled) Undo
      //-button(v-if="$root.canRedo" @click="$root.redo") Redo
      //-button(v-else disabled) Redo
      div.toolbar-button(:class="{ pressed: (mode == 'input') }" @click.prevent="toggleInputMode") Input
      div.toolbar-button(@click.prevent.stop="zoomInHorizontal") ↔+
      div.toolbar-button(@click.prevent.stop="zoomOutHorizontal") ↔-
      div.toolbar-button(@click.prevent.stop="zoomInVertical") ↕+
      div.toolbar-button(@click.prevent.stop="zoomOutVertical") ↕-
    div.workspace
      div(style="position: absolute; top: 0; left: 0;")
      svg(:width="layout.width", :height="layout.height" ref="svg")
        filter(id="selected-shadow" filterUnits="userSpaceOnUse" width="200%" height="200%")
          feGaussianBlur(in="SourceGraphic" result="blur" stdDeviation=2)
          feBlend(in="SourceGraphic" in2="blur" mode="normal")
        LineDefs(ref="lineDefs")
        StationDefs(ref="stationDefs")
        LineInputDefs(ref="lineInputDefs")

        line(v-for="l in verticalGrids" :x1="l.x" :x2="l.x" :y1="l.y" :y2="layout.bottom" :stroke="l.color")
        text(v-for="t in verticalTexts" style="user-select: none; cursor: default" :x="t.x" :y="t.y" font-size="14") {{ t.text }}
        use(xlink:href="#stations")
        use(v-if="mode == 'input'" xlink:href="#line-input")
        use(xlink:href="#lines")

        use(xlink:href="#stations-hover")
        use(xlink:href="#lines-hover")
      div(style="position: absolute; top: 0; left: 0;")
        div.station-name(contenteditable v-for="(s, i) in stations" :style="{ top: accumulatedStationY[i] - 20 + 'px', left: '20px' }"
            @focus="resetInput" @keydown.tab.prevent="modifyStationKeyProceed(i)" @keydown.enter.prevent="modifyStationKeyProceed(i)" @keydown.esc.prevent="modifyStationKeyCancel(i)" @blur="modifyStationBlur(i)"
            ref="existingStation") {{ s.name }}
        div.station-name(contenteditable :style="{ top: newStationY + 'px', left: '20px' }"
            @focus="newStationFocus" @keydown.tab.prevent="newStationKeyProceed" @keydown.enter.prevent="newStationKeyProceed" @keydown.esc.prevent="newStationKeyCancel" @blur="newStationBlur"
            ref="newStation")
        div.station-name(:style="{ top: '-100px', left: '-100px' }"
            ref="stationForMeasure")
        TimeInput(ref="timeInput")
  div.property-side
    Sidebar(ref="sideBar")

</template>

<script>
import { defineComponent } from "vue"
import { useMainStore } from "../stores/main"
import { VERSION } from "../version"
import { SECOND_DIVISOR } from "../time-util"
import Sidebar from "./Sidebar.vue"
import LineDefs from "./LineDefs.vue"
import StationDefs from "./StationDefs.vue"
import LineInputDefs from "./LineInputDefs.vue"
import TimeInput from "./TimeInput.vue"

const MARGIN = 20
const HEADER_HEIGHT = 20

export default defineComponent({
  setup() {
    const store = useMainStore()
    return {
      store
    }
  },
  components: {
    Sidebar,
    LineDefs,
    StationDefs,
    LineInputDefs,
    TimeInput
  },
  data: function() {
    return {
      mode: "edit",
      inputtingTime: false,
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
      },
      lineInsertOrigin: {
        line: -1,
        halt: -1
      },
      zoom: {
        horizontal: 0,
        vertical: 0
      }
    }
  },
  methods: {
    x(tick) {
      return this.layout.left + this.layout.stationsWidth + tick / (7200 * Math.pow(2, -this.zoom.horizontal / 2))
    },
    xi(x) {
      return (x - this.layout.left - this.layout.stationsWidth) * (7200 * Math.pow(2, -this.zoom.horizontal / 2))
    },
    zoomInHorizontal() { this.zoom.horizontal++ },
    zoomOutHorizontal() { this.zoom.horizontal-- },
    zoomInVertical() { this.zoom.vertical++ },
    zoomOutVertical() { this.zoom.vertical-- },
    newStationFocus() {
      this.resetInput()
      const element = this.$refs.newStation
      element.innerText = ""
    },
    newStationKeyProceed() {
      const element = this.$refs.newStation
      const text = element.innerText.trim()
      if (text !== "") {
        this.store.addStation({ name: text, width: this.measureStationWidth(text) })
        element.innerText = ""
      } else {
        element.blur()
      }
    },
    newStationKeyCancel() {
      const element = this.$refs.newStation
      element.innerText = ""
      element.blur()
    },
    newStationBlur() {
      const element = this.$refs.newStation
      const text = element.innerText.trim()
      if (text !== "") {
        this.store.addStation({ name: text, width: this.measureStationWidth(text) })
        element.innerText = ""
      }
    },
    modifyStationKeyProceed(i) {
      const array = this.$refs.existingStation
      const element = array[i]
      const text = element.innerText.trim()
      if (text !== this.stations[i].name) {
        this.store.modifyStation({ pos: i, name: text, width: this.measureStationWidth(text) })
      }
      if (array.length === i + 1) {
        this.$refs.newStation.focus()
      } else {
        array[i + 1].focus()
      }
    },
    modifyStationKeyCancel(i) {
      const array = this.$refs.existingStation
      const element = array[i]
      element.innerText = this.stations[i].name
      element.blur()
    },
    modifyStationBlur(i) {
      const array = this.$refs.existingStation
      const element = array[i]
      const text = element.innerText.trim()
      if (text !== this.stations[i].name) {
        this.store.modifyStation({ pos: i, name: text, width: this.measureStationWidth(text) })
      }
    },
    measureStationWidth(name) {
      const element = this.$refs.stationForMeasure
      element.innerText = name
      return element.clientWidth
    },
    updateLineSelection(selection) {
      Vue.set(this, "lineSelection", {...this.lineSelection, ...selection})
    },
    updateStationSelection(selection) {
      Vue.set(this, "stationSelection", {...this.stationSelection, ...selection})
    },
    updateHoveredTime(time) {
      this.hoveredTime = time
    },
    relativeX(x) {
      return x - this.$refs.svg.getBoundingClientRect().left
    },
    relativeY(y) {
      return y - this.$refs.svg.getBoundingClientRect().top
    },
    resetInput() {
      this.$refs.timeInput.reset()
      this.$refs.lineInputDefs.reset()
      this.lineInsertOrigin = {
        line: -1,
        halt: -1
      }
      this.inputtingTime = false
      this.mode = "edit"
    },
    toggleInputMode() {
      if (this.mode === "input") {
        this.resetInput()
        this.mode = "edit"
      } else {
        this.unselectAll()
        this.mode = "input"
      }
    },
    clickBackground() {
      this.unselectAll()
    },
    unselectLine() {
      this.lineSelection = {
        hoveredLine: -1,
        hoveredSet: -1,
        hoveredHalt: -1,
        hoveredType: -1,
        selectedLine: -1,
        selectedSet: -1,
        selectedHalt: -1,
        selectedType: -1
      }
    },
    unselectStation() {
      this.stationSelection = {
        hovered: -1,
        selected: -1
      }
    },
    unselectAll() {
      this.unselectLine()
      this.unselectStation()
    },
    insertStationAboveSelected(stationIndex) {
      this.store.addStation({
        pos: stationIndex,
        name: "New station",
        width: 100
      })
      this.stationSelection.selected = stationIndex
    },
    insertStationBelowSelected(stationIndex) {
      this.store.addStation({
        pos: stationIndex + 1,
        name: "New station",
        width: 100
      })
      this.stationSelection.selected = stationIndex + 1
    },
    deleteSelectedStation(stationIndex) {
      const prevSelectedLine = this.store.lines[this.lineSelection.selectedLine]
      this.store.deleteStation({
        pos: stationIndex,
      })
      if (this.stationSelection.selected == stationIndex) {
        this.stationSelection.selected = -1
      }
      const selectedLine = this.store.lines[this.lineSelection.selectedLine]
      if (prevSelectedLine !== selectedLine) {
        this.lineSelection.selectedLine = -1
        this.lineSelection.selectedSet = -1
        this.lineSelection.selectedHalt = -1
        this.lineSelection.selectedType = -1
      }
    },
    insertHaltToSelectedLine(haltIndex) {
      const lineIndex = this.lineSelection.selectedLine
      const setIndex = this.lineSelection.selectedSet
      const line = this.store.lines[lineIndex]

      const monthLength = this.store.monthLength
      const halts = this.store.lines[lineIndex].halts
      const halt = halts[haltIndex]
      const nextHalt = halts[(haltIndex + 1)%halts.length]
      const stationIndex = this.store.findStationIndex(halt.stationId)
      const nextStationIndex = this.store.findStationIndex(nextHalt.stationId)
      const time = (this.store.computedTimes[lineIndex][haltIndex].departure + monthLength / line.divisor * setIndex) % monthLength

      this.lineInsertOrigin = {
        line: lineIndex,
        halt: haltIndex,
      }
      this.mode = "input"
      this.$refs.lineInputDefs.setTerminal(nextStationIndex)
      this.$refs.lineInputDefs.addPoint({ station: stationIndex, time: time, skip: false })
    },
    deleteHaltFromSelectedLine(haltIndex) {
      const lineIndex = this.lineSelection.selectedLine

      this.lineSelection.selectedHalt = -1
      this.lineSelection.selectedType = -1
      this.store.deleteHalt({ lineIndex, haltIndex })
    },
    deleteSelectedLine(index) {
      this.lineSelection.selectedLine = -1
      this.store.deleteLine(index)
    },
    openFile() {
      if (this.store.modified) {
        const result = window.confirm("Save modified data?")
        if (!result) return
        else {
          this.downloadFile()
        }
      }

      const input = document.createElement("input")
      input.type = "file"
      input.onchange = async (ev) => {
        if (input.files == 0) return
        const file = input.files[0]
        const str = await file.text()
        this.store.loadFromJsonString(file.name, str)
        this.unselectAll()
      }
      input.click()
    },
    downloadFile() {
      const jsonString = this.store.jsonString
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      
      const filename = this.store.currentFile != "" ? this.store.currentFile : "New File.simudiax"
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()

      URL.revokeObjectURL(url)

      this.store.setSaved(filename)
    },
    dragover(e) {
      e.preventDefault()
    },
    async drop(e) {
      e.preventDefault()

      const item = e.dataTransfer.items?.[0]
      const file = e.dataTransfer.files?.[0]
      let fileToLoad
      if (item != null) {
        if (item.kind === "file") {
          fileToLoad = item.getAsFile()
        }
      } else if (file != null) {
        fileToLoad = file
      }

      const str = await fileToLoad.text()

      if (this.store.modified) {
        const result = window.confirm("Save modified data?")
        if (!result) return
        else {
          this.downloadFile()
        }
      }

      this.store.loadFromJsonString(file.name, str)
      this.unselectAll()
    },
    beforeUnload(e) {
      if (this.store.modified) {
        e.returnValue = ""
        e.preventDefault()
      }
    }
  },
  computed: {
    layout() {
      const stationsWidth = Math.max(100, ...this.stations.map(e => e.width)) + 10

      const monthLength = this.store.monthLength
      const width = MARGIN + stationsWidth + monthLength / (7200 * Math.pow(2, -this.zoom.horizontal / 2)) + MARGIN

      const ys = this.accumulatedStationY
      let height
      if (ys.length === 0) height = 60
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
    newStationY() {
      const stations = this.store.stations
      if (stations.length === 0) {
        return 20
      } else {
        return this.layout.height - 20
      }
    },
    verticalGrids() {
      const result = []
      const monthLength = this.store.monthLength
      for (let i = 0; i <= monthLength; i += SECOND_DIVISOR * 60 * 3) {
        const x = this.x(i)
        let color
        let y
        if (i % (SECOND_DIVISOR * 60 * 60) === 0) {
          color = "black"
          y = this.layout.top
        } else if (i % (SECOND_DIVISOR * 60 * 15) === 0) {
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
    verticalTexts() {
      const result = []
      const monthLength = this.store.monthLength
      for (let i = 0; i <= monthLength / (SECOND_DIVISOR * 60 * 60); i++) {
        const tick = i * SECOND_DIVISOR * 60 * 60
        result.push({ x: this.x(tick) + 5, y: this.layout.top + this.layout.headerHeight - 5, text: `${i}:00:00` })
      }
      return result
    },
    stations() { return this.store.stations },
    accumulatedStationY() { return this.store.accumulatedStationTimes.map(e => (MARGIN + 20 + e / (3600 * Math.pow(2, -this.zoom.vertical / 2)))) },
    title() {
      return (this.store.modified ? "*" : "") + this.store.baseName + " - SimuDia-Extended " + VERSION
    }
  },
  watch: {
    title() {
      document.title = this.title
    }
  },
  created: function() {
    document.title = this.title

    console.warn("TODO: implement menu")
    /*
    const menu = new Menu()
    const fileMenu = new Menu()
    fileMenu.append(new MenuItem({ label: "&Open...", click: () => this.openFile() }))
    fileMenu.append(new MenuItem({ label: "&Save", click: () => this.saveFile() }))
    fileMenu.append(new MenuItem({ label: "Save &As...", click: () => this.saveAs() }))
    menu.append(new MenuItem({ label: "&File", submenu: fileMenu }))
    if (remote.getGlobal("process").env.NODE_ENV === "development") {
      menu.append(new MenuItem({ label: "&Reload", role: "forcereload" }))
    }
    Menu.setApplicationMenu(menu)
    */

    window.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        const lineInputDefs = this.$refs.lineInputDefs
        if (this.mode === "input" && !this.inputtingTime && lineInputDefs.rubberbands.length > 0) {
          event.preventDefault()
          event.stopPropagation()
          lineInputDefs.finishInput()
        }
      }
      if (event.key === "Escape") {
        if (this.mode === "input") {
          this.resetInput()
        }
        if (this.mode === "edit") {
          this.unselectAll()
        }
      }
      if (event.key === "Shift") this.modifierStates = { ...this.modifierStates, shift: true }
      if (event.key === "Control") this.modifierStates = { ...this.modifierStates, control: true }
    })
    window.addEventListener("keyup", event => {
      if (event.key === "Shift") this.modifierStates = { ...this.modifierStates, shift: false }
      if (event.key === "Control") this.modifierStates = { ...this.modifierStates, control: false }
    })
    window.addEventListener("beforeunload", e => this.beforeUnload(e))
  },
})
</script>

<style lang="stylus">
body
  font-family: sans-serif

.station-name
  min-width: 100px
  line-height: 20px
  position: absolute
  white-space: nowrap
  font-size: 14px

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

.toolbar
  position: fixed
  top: 0
  left: 0
  width: 100%
  height: 60px
  background-color: #EEE
  z-index: 100
  font-size: 14px

.workspace
  position: absolute
  top: 60px

.toolbar-button
  display: inline-block
  border: 2px outset #EEE
  background-color: #DDD
  padding: 2px
  cursor: default
  user-select: none
  min-width: 22px
  height: 22px
  line-height: 22px
  text-align: center

  &.pressed
    border: 2px inset #BBB
    background-color: #AAA
  &:active
    border: 2px inset #BBB
    background-color: #AAA
</style>
