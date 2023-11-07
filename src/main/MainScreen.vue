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
        <Workspace></Workspace>
      </div>
    </div>
    <div class="property-side">
      <Sidebar ref="sideBar"></Sidebar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue"
import { useMainStore } from "../stores/main"
import { VERSION } from "../version"
import { allAvailableApis as availableFileApis } from "../file"
import Workspace from "./Workspace.vue"
import Sidebar from "./Sidebar.vue"
import { useGuiStore } from "../stores/gui"
import { useGuiMessageStore } from "../stores/gui-message"

const store = useMainStore()
const gui = useGuiStore()
const message = useGuiMessageStore()

const title = computed(() => {
  return (store.modified ? "*" : "") + store.baseName + " - SimuDia-Extended " + VERSION
})

const zoomInHorizontal = () => { gui.zoom.horizontal++ }
const zoomOutHorizontal = () => { gui.zoom.horizontal-- }
const zoomInVertical = () => { gui.zoom.vertical++ }
const zoomOutVertical = () => { gui.zoom.vertical-- }

const toggleInputMode = () => {
  if (gui.mode === "input") {
    gui.resetInput()
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
    message.enterKeyPressed({ event })
  }
  if (event.key === "Escape") {
    if (gui.mode === "input") {
      gui.resetInput()
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
</script>

<style scoped>
body {
  font-family: sans-serif;
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
