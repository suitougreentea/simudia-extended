<!-- NOTE: This component's data may be changed by the other components in the same folder for performances -->

<template>  
  <div style="position: relative" @dragover="dragover" @drop="drop">
    <div class="diagram" @click="clickBackground">
      <div class="toolbar">
        <div class="toolbar-button" @click.prevent.stop="openFile">Open</div>
        <div class="toolbar-button" @click.prevent.stop="saveFile">Save</div>
        <div class="toolbar-button" @click.prevent.stop="saveFileAs">Save As</div><br>
        <div class="toolbar-button" :class="{ pressed: (gui.mode == 'input') }" @click.prevent="toggleInputMode">Input</div>
        <div class="toolbar-button" @click.prevent.stop="zoomInHorizontal">↔+</div>
        <div class="toolbar-button" @click.prevent.stop="zoomOutHorizontal">↔-</div>
        <div class="toolbar-button" @click.prevent.stop="zoomInVertical">↕+</div>
        <div class="toolbar-button" @click.prevent.stop="zoomOutVertical">↕-</div>
      </div>
      <div class="workspace">
        <div style="position: absolute; top: 0; left: 0;"></div>
        <svg :width="gui.layout.width" :height="gui.layout.height" ref="svg">
          <filter id="selected-shadow" filterUnits="userSpaceOnUse" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="2"></feGaussianBlur>
            <feBlend in="SourceGraphic" in2="blur" mode="normal"></feBlend>
          </filter>
          <LineDefs ref="lineDefs"></LineDefs>
          <StationDefs ref="stationDefs"></StationDefs>
          <LineInputDefs ref="lineInputDefs"></LineInputDefs>
          <line v-for="l in verticalGrids" :x1="l.x" :x2="l.x" :y1="l.y" :y2="gui.layout.bottom" :stroke="l.color"></line>
          <text v-for="t in verticalTexts" style="user-select: none; cursor: default" :x="t.x" :y="t.y" font-size="14">{{ t.text }}</text>
          <use xlink:href="#stations"></use>
          <use v-if="gui.mode == 'input'" xlink:href="#line-input"></use>
          <use xlink:href="#lines"></use>
          <use xlink:href="#stations-hover"></use>
          <use xlink:href="#lines-hover"></use>
        </svg>
        <div style="position: absolute; top: 0; left: 0;">
          <div class="station-name" contenteditable v-for="(s, i) in gui.stations" :style="{ top: gui.accumulatedStationY[i] - 20 + 'px', left: '20px' }" @focus="gui.resetInput" @keydown.tab.prevent="modifyStationKeyProceed(i)" @keydown.enter.prevent="modifyStationKeyProceed(i)" @keydown.esc.prevent="modifyStationKeyCancel(i)" @blur="modifyStationBlur(i)" ref="existingStation">{{ s.name }}</div>
          <div class="station-name" contenteditable :style="{ top: newStationY + 'px', left: '20px' }" @focus="newStationFocus" @keydown.tab.prevent="newStationKeyProceed" @keydown.enter.prevent="newStationKeyProceed" @keydown.esc.prevent="newStationKeyCancel" @blur="newStationBlur" ref="newStation"></div>
          <div class="station-name" :style="{ top: '-100px', left: '-100px' }" ref="stationForMeasure"></div>
          <TimeInput ref="timeInput"></TimeInput>
        </div>
      </div>
    </div>
    <div class="property-side">
      <Sidebar ref="sideBar"></Sidebar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useMainStore } from "../stores/main"
import { VERSION } from "../version"
import * as TimeUtil from "../time-util"
import { allAvailableApis as availableFileApis } from "../file"
import Sidebar from "./Sidebar.vue"
import LineDefs from "./LineDefs.vue"
import StationDefs from "./StationDefs.vue"
import LineInputDefs from "./LineInputDefs.vue"
import TimeInput from "./TimeInput.vue"
import { useGuiStore } from "../stores/gui"

const store = useMainStore()
const gui = useGuiStore()

const newStation = ref(null)
const existingStation = ref(null)
const stationForMeasure = ref(null)
const svg = ref(null)
const timeInput = ref(null)
const lineInputDefs = ref(null)

const newStationY = computed(() => {
  const stations = store.stations
  if (stations.length === 0) {
    return 20
  } else {
    return gui.layout.height - 20
  }
})

const verticalGrids = computed(() => {
  const result = []
  const monthLength = store.monthLength
  for (let i = 0; i <= monthLength; i += TimeUtil.SECOND_DIVISOR * 60 * 3) {
    const x_ = gui.x(i)
    let color
    let y
    if (i % (TimeUtil.SECOND_DIVISOR * 60 * 60) === 0) {
      color = "black"
      y = gui.layout.top
    } else if (i % (TimeUtil.SECOND_DIVISOR * 60 * 15) === 0) {
      color = "gray"
      y = gui.layout.top + gui.layout.headerHeight
    } else {
      color = "lightgray"
      y = gui.layout.top + gui.layout.headerHeight
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
    result.push({ x: gui.x(tick) + 5, y: gui.layout.top + gui.layout.headerHeight - 5, text: `${i}:00:00` })
  }
  return result
})

const title = computed(() => {
  return (store.modified ? "*" : "") + store.baseName + " - SimuDia-Extended " + VERSION
})

const zoomInHorizontal = () => { gui.zoom.horizontal++ }
const zoomOutHorizontal = () => { gui.zoom.horizontal-- }
const zoomInVertical = () => { gui.zoom.vertical++ }
const zoomOutVertical = () => { gui.zoom.vertical-- }

const newStationFocus = () => {
  gui.resetInput(timeInput.value, lineInputDefs.value)
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
  if (text !== gui.stations[i].name) {
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
  element.innerText = gui.stations[i].name
  element.blur()
}

const modifyStationBlur = (i) => {
  const array = existingStation.value
  const element = array[i]
  const text = element.innerText.trim()
  if (text !== gui.stations[i].name) {
    store.modifyStation({ pos: i, name: text, width: measureStationWidth(text) })
  }
}

const measureStationWidth = (name) => {
  const element = stationForMeasure.value
  element.innerText = name
  return element.clientWidth
}

const updateLineSelection = (selection) => {
  gui.lineSelection = {...gui.lineSelection, ...selection}
}

const updateStationSelection = (selection) => {
  gui.stationSelection = {...gui.stationSelection, ...selection}
}

const updateHoveredTime = (time) => {
  gui.hoveredTime = time
}

const relativeX = (x) => {
  return x - svg.value.getBoundingClientRect().left
}

const relativeY = (y) => {
  return y - svg.value.getBoundingClientRect().top
}

const toggleInputMode = () => {
  if (gui.mode === "input") {
    gui.resetInput(timeInput.value, lineInputDefs.value)
    gui.mode = "edit"
  } else {
    gui.unselectAll()
    gui.mode = "input"
  }
}

const clickBackground = () => {
  gui.unselectAll()
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
  gui.unselectAll()
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
  gui.unselectAll()
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
    if (gui.mode === "input" && !gui.inputtingTime && lineInputDefsElement.rubberbands.length > 0) {
      event.preventDefault()
      event.stopPropagation()
      lineInputDefsElement.finishInput()
    }
  }
  if (event.key === "Escape") {
    if (gui.mode === "input") {
      gui.resetInput(timeInput.value, lineInputDefs.value)
    }
    if (gui.mode === "edit") {
      gui.unselectAll()
    }
  }
  if (event.key === "Shift") gui.modifierStates.shift = true
  if (event.key === "Control") gui.modifierStates.control = true
})
window.addEventListener("keyup", event => {
  if (event.key === "Shift") gui.modifierStates.shift = false
  if (event.key === "Control") gui.modifierStates.control = false
})
window.addEventListener("beforeunload", e => beforeUnload(e))

const exposed = {
  timeInput,
  lineInputDefs,
  relativeX,
  relativeY,
}
defineExpose(exposed)
export type ExposedType = typeof exposed;
</script>

<style>
body {
  font-family: sans-serif;
}

.station-name {
  min-width: 100px;
  line-height: 20px;
  position: absolute;
  white-space: nowrap;
  font-size: 14px;
}

.time-input-container {
  min-width: 100px;
  line-height: 20px;
  position: absolute;
  white-space: nowrap;
  background-color: rgba(255, 255, 255, 0.7);
  box-shadow: 0px 0px 2px 1px black;

  .error {
    box-shadow: 0px 0px 2px 1px red;
  }
}

.selectedLine {
  filter: url(#selected-shadow);
}

.diagram {
  position: fixed;
  top: 0;
  left: 0;
  width: 70%;
  height: 100%;
  background-color: white;
  overflow-x: auto;
  overflow-y: auto;
}

.property-side {
  position: fixed;
  top: 0;
  right: 0;
  width: 30%;
  height: 100%;
  background-color: white;
  border-left: 2px solid black;
}

.toolbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
  background-color: #EEE;
  z-index: 100;
  font-size: 14px;
}

.workspace {
  position: absolute;
  top: 60px;
}

.toolbar-button {
  display: inline-block;
  border: 2px outset #EEE;
  background-color: #DDD;
  padding: 2px;
  cursor: default;
  user-select: none;
  min-width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;

  &.pressed {
    border: 2px inset #BBB;
    background-color: #AAA;
  }
  &:active {
    border: 2px inset #BBB;
    background-color: #AAA;
  }
}
</style>
