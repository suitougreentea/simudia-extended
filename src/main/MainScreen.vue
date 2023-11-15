<template>  
  <v-app @dragover="dragover" @drop="drop">
    <v-navigation-drawer permanent rail color="primary">
      <v-list density="compact" nav>
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-list-item prepend-icon="mdi-menu" :active="false" v-bind="props"></v-list-item>
          </template>
          <v-list>
            <v-list-item @click="openFile">Open...</v-list-item>
            <v-list-item @click="saveFile">Save</v-list-item>
            <v-list-item @click="saveFileAs">Save As...</v-list-item>
            <v-list-item @click="importLegacyFile">Import SimuDia data...</v-list-item>
            <!--
            <v-divider></v-divider>
            <v-list-item @click="">About</v-list-item>
            -->
          </v-list>
        </v-menu>
      </v-list>
      <v-divider></v-divider>
      <v-list density="compact">
        <v-list-item prepend-icon="mdi-cursor-default-outline" :active="gui.mode == 'edit'" @click.prevent.stop="toggleInputMode()"></v-list-item>
        <v-list-item prepend-icon="mdi-pencil" :active="gui.mode == 'input'" @click.prevent.stop="toggleInputMode()"></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main><!-- TODO: @contextmenu.prevent after replacing contenteditable elements -->
      <div style="position: absolute; left: var(--v-layout-left); right: var(--v-layout-right); top: var(--v-layout-top); bottom: var(--v-layout-bottom);">
        <Workspace style="position: absolute; width: 100%; height: 100%;" ref="workspace"></Workspace>
        <div :style="horizontalZoomStyle">
          <v-btn-group density="comfortable" class="ma-2">
            <v-btn color="grey-lighten-4" icon="mdi-plus" @click.prevent.stop="zoomInHorizontal"></v-btn>
            <v-btn color="grey-lighten-4" icon="mdi-minus" @click.prevent.stop="zoomOutHorizontal"></v-btn>
          </v-btn-group>
        </div>
        <div :style="verticalZoomStyle">
          <v-btn-group density="comfortable" class="ma-2" style="writing-mode: vertical-lr; height: 80px;">
            <v-btn color="grey-lighten-4" icon="mdi-plus" style="height: 50%;" @click.prevent.stop="zoomInVertical"></v-btn>
            <v-btn color="grey-lighten-4" icon="mdi-minus" style="height: 50%;" @click.prevent.stop="zoomOutVertical"></v-btn>
          </v-btn-group>
        </div>
      </div>
    </v-main>

    <v-navigation-drawer permanent location="right" :width="sidebarWidth">
      <Sidebar ref="sideBar"></Sidebar>
    </v-navigation-drawer>

    <StationContextMenu ref="stationContextMenu"></StationContextMenu>
    <LineContextMenu ref="lineContextMenu"></LineContextMenu>
    <LineSegmentContextMenu ref="lineSegmentContextMenu"></LineSegmentContextMenu>
  </v-app>
</template>

<script setup lang="ts">
import { StyleValue, computed, ref, watch, provide } from "vue"
import { useMainStore } from "../stores/main"
import { VERSION } from "../version"
import { allAvailableApis as availableFileApis } from "../file"
import Workspace from "./Workspace.vue"
import Sidebar from "./Sidebar.vue"
import { useGuiStore } from "../stores/gui"
import { useGuiMessageStore } from "../stores/gui-message"
import StationContextMenu from "../context-menus/StationContextMenu.vue"
import LineContextMenu from "../context-menus/LineContextMenu.vue"
import LineSegmentContextMenu from "../context-menus/LineSegmentContextMenu.vue"
import { stationContextMenuInjection, lineContextMenuInjection, lineSegmentContextMenuInjection } from "./injection"

const store = useMainStore()
const gui = useGuiStore()
const message = useGuiMessageStore()

const workspace = ref<InstanceType<typeof Workspace>>(null)
const horizontalZoomStyle = computed(() => ({
  position: "absolute",
  right: `${(workspace.value?.scrollBarSize?.width ?? 0) + 48}px`,
  bottom: `${(workspace.value?.scrollBarSize?.height ?? 0)}px`,
}) satisfies StyleValue)
const verticalZoomStyle = computed(() => ({
  position: "absolute",
  right: `${(workspace.value?.scrollBarSize?.width ?? 0)}px`,
  bottom: `${(workspace.value?.scrollBarSize?.height ?? 0) + 48}px`,
}) satisfies StyleValue)

const stationContextMenu = ref<InstanceType<typeof StationContextMenu>>(null)
provide(stationContextMenuInjection, stationContextMenu)
const lineContextMenu = ref<InstanceType<typeof LineContextMenu>>(null)
provide(lineContextMenuInjection, lineContextMenu)
const lineSegmentContextMenu = ref<InstanceType<typeof LineSegmentContextMenu>>(null)
provide(lineSegmentContextMenuInjection, lineSegmentContextMenu)

const title = computed(() => {
  return (gui.modified ? "*" : "") + gui.currentFileHandle.filename + " - SimuDia-Extended " + VERSION
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

const openFile = async () => {
  if (gui.modified) {
    const result = window.confirm("Save modified data?")
    if (!result) return
    else {
      await saveFile()
    }
  }

  const api = availableFileApis[0]
  const fileHandle = await api.open({ legacy: false })
  gui.loadFromFileHandle(fileHandle)
  gui.unselectAll()
}

const importLegacyFile = async () => {
  if (gui.modified) {
    const result = window.confirm("Save modified data?")
    if (!result) return
    else {
      await saveFile()
    }
  }

  const api = availableFileApis[0]
  const fileHandle = await api.open({ legacy: true })
  gui.importFromFileHandle(fileHandle)
  gui.unselectAll()
}


const saveFile = async () => {
  if (!gui.currentFileHandle.hasOpenedFile || !gui.currentFileHandle.saveAvailable) {
    await saveFileAs()
  } else {
    await gui.currentFileHandle.save(store.jsonString)
    gui.modified = false
  }
}

const saveFileAs = async () => {
  const api = availableFileApis[0]
  const fileHandle = await api.saveAs(store.jsonString, gui.currentFileHandle.filename)
  gui.setFileHandle(fileHandle)
}

const dragover = (e) => {
  e.preventDefault()
}

const drop = async (e) => {
  e.preventDefault()

  const api = availableFileApis[0]
  const fileHandle = await api.onFileDrop(e)

  if (gui.modified) {
    const result = window.confirm("Save modified data?")
    if (!result) return
    else {
      saveFile()
    }
  }

  gui.loadFromFileHandle(fileHandle)
  gui.unselectAll()
}

const beforeUnload = (e) => {
  if (gui.modified) {
    e.returnValue = ""
    e.preventDefault()
  }
}

document.title = title.value
watch(title, (value) => {
  document.title = value
})

const sidebarWidth = ref(300)
const updateSidebarWidth = () => {
  sidebarWidth.value = Math.max(window.innerWidth * 0.2, 300)
}
window.addEventListener("resize", event => {
  updateSidebarWidth()
})
updateSidebarWidth()

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
</style>
