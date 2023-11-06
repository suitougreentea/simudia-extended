<!-- NOTE: This component's data may be changed by the other components in the same folder for performances -->

<template lang="pug">
div(style="position: relative" @dragover="dragover" @drop="drop")
  div.diagram(@click="clickBackground")
    div.toolbar
      div.toolbar-button(@click.prevent.stop="openFile") Open
      div.toolbar-button(@click.prevent.stop="saveFile") Save
      div.toolbar-button(@click.prevent.stop="saveFileAs") Save As
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

<script setup lang="ts">
import { computed, defineComponent, ref, watch } from "vue"
import { useMainStore } from "../stores/main"
import { VERSION } from "../version"
import * as TimeUtil from "../time-util"
import { allAvailableApis as availableFileApis } from "../file"
import Sidebar from "./Sidebar.vue"
import LineDefs from "./LineDefs.vue"
import StationDefs from "./StationDefs.vue"
import LineInputDefs from "./LineInputDefs.vue"
import TimeInput from "./TimeInput.vue"

const MARGIN = 20
const HEADER_HEIGHT = 20

const store = useMainStore()

const mode = ref("edit")
const inputtingTime = ref(false)
const lineSelection = ref({
  hoveredLine: -1,
  hoveredSet: -1,
  hoveredHalt: -1,
  hoveredType: -1,
  selectedLine: -1,
  selectedSet: -1,
  selectedHalt: -1,
  selectedType: -1
})
const stationSelection = ref({
  hovered: -1,
  selected: -1
})
const hoveredTime = ref(-1)
const modifierStates = ref({
  control: false,
  shift: false
})
const lineInsertOrigin = ref({
  line: -1,
  halt: -1
})
const zoom = ref({
  horizontal: 0,
  vertical: 0
})

const newStation = ref(null)
const existingStation = ref(null)
const stationForMeasure = ref(null)
const svg = ref(null)
const timeInput = ref(null)
const lineInputDefs = ref(null)

const layout = computed(() => {
  const stationsWidth = Math.max(100, ...stations.value.map(e => e.width)) + 10

  const monthLength = store.monthLength
  const width = MARGIN + stationsWidth + monthLength / (7200 * Math.pow(2, -zoom.value.horizontal / 2)) + MARGIN

  const ys = accumulatedStationY.value
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
})

const newStationY = computed(() => {
  const stations = store.stations
  if (stations.length === 0) {
    return 20
  } else {
    return layout.value.height - 20
  }
})

const verticalGrids = computed(() => {
  const result = []
  const monthLength = store.monthLength
  for (let i = 0; i <= monthLength; i += TimeUtil.SECOND_DIVISOR * 60 * 3) {
    const x_ = x(i)
    let color
    let y
    if (i % (TimeUtil.SECOND_DIVISOR * 60 * 60) === 0) {
      color = "black"
      y = layout.value.top
    } else if (i % (TimeUtil.SECOND_DIVISOR * 60 * 15) === 0) {
      color = "gray"
      y = layout.value.top + layout.value.headerHeight
    } else {
      color = "lightgray"
      y = layout.value.top + layout.value.headerHeight
    }
    result.push({ x: x_, y: y, color: color })
  }
  return result
})

const verticalTexts = computed(() => {
  const result = []
  const monthLength = store.monthLength
  for (let i = 0; i <= monthLength / (TimeUtil.SECOND_DIVISOR * 60 * 60); i++) {
    const tick = i * TimeUtil.SECOND_DIVISOR * 60 * 60
    result.push({ x: x(tick) + 5, y: layout.value.top + layout.value.headerHeight - 5, text: `${i}:00:00` })
  }
  return result
})

const stations = computed(() => { return store.stations })

const accumulatedStationY = computed(() => { return store.accumulatedStationTimes.map(e => (MARGIN + 20 + e / (3600 * Math.pow(2, -zoom.value.vertical / 2)))) })

const title = computed(() => {
  return (store.modified ? "*" : "") + store.baseName + " - SimuDia-Extended " + VERSION
})

const x = (tick) => {
  return layout.value.left + layout.value.stationsWidth + tick / (7200 * Math.pow(2, -zoom.value.horizontal / 2))
}

const xi = (x) => {
  return (x - layout.value.left - layout.value.stationsWidth) * (7200 * Math.pow(2, -zoom.value.horizontal / 2))
}

const zoomInHorizontal = () => { zoom.value.horizontal++ }
const zoomOutHorizontal = () => { zoom.value.horizontal-- }
const zoomInVertical = () => { zoom.value.vertical++ }
const zoomOutVertical = () => { zoom.value.vertical-- }

const newStationFocus = () => {
  resetInput()
  const element = newStation.value
  element.innerText = ""
}

const newStationKeyProceed = () => {
  const element = newStation.value
  const text = element.innerText.trim()
  if (text !== "") {
    store.addStation({ name: text, width: measureStationWidth(text) })
    element.innerText = ""
  } else {
    element.blur()
  }
}

const newStationKeyCancel = () => {
  const element = newStation.value
  element.innerText = ""
  element.blur()
}

const newStationBlur = () => {
  const element = newStation.value
  const text = element.innerText.trim()
  if (text !== "") {
    store.addStation({ name: text, width: measureStationWidth(text) })
    element.innerText = ""
  }
}

const modifyStationKeyProceed = (i) => {
  const array = existingStation.value
  const element = array[i]
  const text = element.innerText.trim()
  if (text !== stations.value[i].name) {
    store.modifyStation({ pos: i, name: text, width: measureStationWidth(text) })
  }
  if (array.length === i + 1) {
    newStation.value.focus()
  } else {
    array[i + 1].focus()
  }
}

const modifyStationKeyCancel = (i) => {
  const array = existingStation.value
  const element = array[i]
  element.innerText = stations.value[i].name
  element.blur()
}

const modifyStationBlur = (i) => {
  const array = existingStation.value
  const element = array[i]
  const text = element.innerText.trim()
  if (text !== stations.value[i].name) {
    store.modifyStation({ pos: i, name: text, width: measureStationWidth(text) })
  }
}

const measureStationWidth = (name) => {
  const element = stationForMeasure.value
  element.innerText = name
  return element.clientWidth
}

const updateLineSelection = (selection) => {
  lineSelection.value = {...lineSelection.value, ...selection}
}

const updateStationSelection = (selection) => {
  stationSelection.value = {...stationSelection.value, ...selection}
}

const updateHoveredTime = (time) => {
  hoveredTime.value = time
}

const relativeX = (x) => {
  return x - svg.value.getBoundingClientRect().left
}

const relativeY = (y) => {
  return y - svg.value.getBoundingClientRect().top
}

const resetInput = () => {
  timeInput.value.reset()
  lineInputDefs.value.reset()
  lineInsertOrigin.value = {
    line: -1,
    halt: -1
  }
  inputtingTime.value = false
  mode.value = "edit"
}

const toggleInputMode = () => {
  if (mode.value === "input") {
    resetInput()
    mode.value = "edit"
  } else {
    unselectAll()
    mode.value = "input"
  }
}

const clickBackground = () => {
  unselectAll()
}

const unselectLine = () => {
  lineSelection.value = {
    hoveredLine: -1,
    hoveredSet: -1,
    hoveredHalt: -1,
    hoveredType: -1,
    selectedLine: -1,
    selectedSet: -1,
    selectedHalt: -1,
    selectedType: -1
  }
}

const unselectStation = () => {
  stationSelection.value = {
    hovered: -1,
    selected: -1
  }
}

const unselectAll = () => {
  unselectLine()
  unselectStation()
}

const insertStationAboveSelected = (stationIndex) => {
  store.addStation({
    pos: stationIndex,
    name: "New station",
    width: 100
  })
  stationSelection.value.selected = stationIndex
}

const insertStationBelowSelected = (stationIndex) => {
  store.addStation({
    pos: stationIndex + 1,
    name: "New station",
    width: 100
  })
  stationSelection.value.selected = stationIndex + 1
}

const deleteSelectedStation = (stationIndex) => {
  const prevSelectedLine = store.lines[lineSelection.value.selectedLine]
  store.deleteStation({
    pos: stationIndex,
  })
  if (stationSelection.value.selected == stationIndex) {
    stationSelection.value.selected = -1
  }
  const selectedLine = store.lines[lineSelection.value.selectedLine]
  if (prevSelectedLine !== selectedLine) {
    lineSelection.value.selectedLine = -1
    lineSelection.value.selectedSet = -1
    lineSelection.value.selectedHalt = -1
    lineSelection.value.selectedType = -1
  }
}

const insertHaltToSelectedLine = (haltIndex) => {
  const lineIndex = lineSelection.value.selectedLine
  const setIndex = lineSelection.value.selectedSet
  const line = store.lines[lineIndex]

  const monthLength = store.monthLength
  const halts = store.lines[lineIndex].halts
  const halt = halts[haltIndex]
  const nextHalt = halts[(haltIndex + 1)%halts.length]
  const stationIndex = store.findStationIndex(halt.stationId)
  const nextStationIndex = store.findStationIndex(nextHalt.stationId)
  const time = (store.computedTimes[lineIndex][haltIndex].departure + monthLength / line.divisor * setIndex) % monthLength

  lineInsertOrigin.value = {
    line: lineIndex,
    halt: haltIndex,
  }
  mode.value = "input"
  lineInputDefs.value.setTerminal(nextStationIndex)
  lineInputDefs.value.addPoint({ station: stationIndex, time: time, skip: false })
}

const deleteHaltFromSelectedLine = (haltIndex) => {
  const lineIndex = lineSelection.value.selectedLine

  lineSelection.value.selectedHalt = -1
  lineSelection.value.selectedType = -1
  store.deleteHalt({ lineIndex, haltIndex })
}

const copySelectedLine = (index) => {
  store.copyLine(index)
  lineSelection.value.selectedLine = store.lines.length - 1
}

const deleteSelectedLine = (index) => {
  lineSelection.value.selectedLine = -1
  store.deleteLine(index)
}

const openFile = async () => {
  if (store.modified) {
    const result = window.confirm("Save modified data?")
    if (!result) return
    else {
      await saveFile()
    }
  }

  const api = availableFileApis[0]
  const fileHandle = await api.open()
  store.loadFromFileHandle(fileHandle)
  unselectAll()
}

const saveFile = async () => {
  if (store.currentFileHandle == null || !store.currentFileHandle.saveAvailable) {
    await saveFileAs()
  } else {
    await store.currentFileHandle.save(store.jsonString)
    store.setModified(false)
  }
}

const saveFileAs = async () => {
  const api = availableFileApis[0]
  const fileHandle = await api.saveAs(store.jsonString, store.currentFileHandle?.filename ?? "New File.simudiax")
  store.setFileHandle(fileHandle)
}

const dragover = (e) => {
  e.preventDefault()
}

const drop = async (e) => {
  e.preventDefault()

  const api = availableFileApis[0]
  const fileHandle = await api.onFileDrop(e)

  if (store.modified) {
    const result = window.confirm("Save modified data?")
    if (!result) return
    else {
      saveFile()
    }
  }

  store.loadFromFileHandle(fileHandle)
  unselectAll()
}

const beforeUnload = (e) => {
  if (store.modified) {
    e.returnValue = ""
    e.preventDefault()
  }
}

document.title = title.value
watch(title, (value) => {
  document.title = value
})

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
    const lineInputDefsElement = lineInputDefs.value
    if (mode.value === "input" && !inputtingTime.value && lineInputDefsElement.rubberbands.length > 0) {
      event.preventDefault()
      event.stopPropagation()
      lineInputDefsElement.finishInput()
    }
  }
  if (event.key === "Escape") {
    if (mode.value === "input") {
      resetInput()
    }
    if (mode.value === "edit") {
      unselectAll()
    }
  }
  if (event.key === "Shift") modifierStates.value = { ...modifierStates.value, shift: true }
  if (event.key === "Control") modifierStates.value = { ...modifierStates.value, control: true }
})
window.addEventListener("keyup", event => {
  if (event.key === "Shift") modifierStates.value = { ...modifierStates.value, shift: false }
  if (event.key === "Control") modifierStates.value = { ...modifierStates.value, control: false }
})
window.addEventListener("beforeunload", e => beforeUnload(e))

const exposed = {
  mode,
  inputtingTime,
  lineSelection,
  stationSelection,
  hoveredTime,
  modifierStates,
  lineInsertOrigin,
  layout,
  stations,
  accumulatedStationY,
  timeInput,
  lineInputDefs,
  x,
  xi,
  relativeX,
  relativeY,
  resetInput,
  unselectLine,
  unselectStation,
  insertStationAboveSelected,
  insertStationBelowSelected,
  deleteSelectedStation,
  insertHaltToSelectedLine,
  deleteHaltFromSelectedLine,
  copySelectedLine,
  deleteSelectedLine,
}
defineExpose(exposed)
export type ExposedType = typeof exposed;
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
