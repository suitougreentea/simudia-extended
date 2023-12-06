<template>  
  <v-app @dragover="dragover" @drop="drop">
    <v-navigation-drawer permanent touchless rail color="primary">
      <v-list density="compact" nav>
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-list-item prepend-icon="mdi-menu" :active="false" v-bind="props"></v-list-item>
          </template>
          <v-list>
            <v-list-item @click="newFile">New</v-list-item>
            <v-list-item @click="openFile">Open...</v-list-item>
            <v-list-item @click="saveFile">Save</v-list-item>
            <v-list-item @click="saveFileAs">Save As...</v-list-item>
            <v-list-item @click="importLegacyFile">Import SimuDia data...</v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="showAboutDialog">About</v-list-item>
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
          <v-btn-group density="comfortable" class="ma-2" elevation="4">
            <v-btn color="grey-lighten-4" icon="mdi-plus" @click.prevent.stop="zoomInHorizontal"></v-btn>
            <v-btn color="grey-lighten-4" icon="mdi-minus" @click.prevent.stop="zoomOutHorizontal"></v-btn>
          </v-btn-group>
        </div>
        <div :style="verticalZoomStyle">
          <v-btn-group density="comfortable" class="ma-2" style="flex-direction: column; height: 80px;" elevation="4">
            <v-btn color="grey-lighten-4" icon="mdi-plus" style="border-end-start-radius: revert; height: 50%;" @click.prevent.stop="zoomInVertical"></v-btn>
            <v-btn color="grey-lighten-4" icon="mdi-minus" style="border-start-end-radius: revert; height: 50%;" @click.prevent.stop="zoomOutVertical"></v-btn>
          </v-btn-group>
        </div>
        <div :style="toggleSidebarStyle">
          <v-btn-group density="comfortable" class="ma-2" elevation="4">
            <v-btn color="grey-lighten-4" :icon="showSidebar ? 'mdi-arrow-collapse-right' : 'mdi-arrow-expand-left'" @click.prevent.stop="toggleSidebar"></v-btn>
          </v-btn-group>
        </div>
      </div>
    </v-main>

    <v-navigation-drawer permanent v-model="showSidebar" location="right" :width="sidebarWidth">
      <Sidebar ref="sideBar"></Sidebar>
    </v-navigation-drawer>

    <v-snackbar v-model="updateNotification" timeout="-1">
      A new version of SimuDia-Extended is available!
      <template v-slot:actions>
        <v-btn @click="updateVersion">Update</v-btn>
        <v-btn @click="updateNotification = false">Close</v-btn>
      </template>
    </v-snackbar>

    <StationContextMenu ref="stationContextMenu"></StationContextMenu>
    <LineContextMenu ref="lineContextMenu"></LineContextMenu>
    <LineSegmentContextMenu ref="lineSegmentContextMenu"></LineSegmentContextMenu>

    <SaveChangesDialog ref="saveChangesDialog"></SaveChangesDialog>
    <FileOpenInfoDialog ref="fileOpenInfoDialog"></FileOpenInfoDialog>
    <AboutDialog ref="aboutDialog"></AboutDialog>
  </v-app>
</template>

<script setup lang="ts">
import { type StyleValue, computed, ref, watch, provide } from "vue"
import { useMainStore } from "../stores/main"
import { type OpenFileHandle, allAvailableApis as availableFileApis, createNewFileHandle } from "../file-api"
import { deserialize, serialize } from "../serialization"
import Workspace from "./Workspace.vue"
import Sidebar from "./Sidebar.vue"
import { useGuiStore } from "../stores/gui"
import { useGuiMessageStore } from "../stores/gui-message"
import StationContextMenu from "../context-menus/StationContextMenu.vue"
import LineContextMenu from "../context-menus/LineContextMenu.vue"
import LineSegmentContextMenu from "../context-menus/LineSegmentContextMenu.vue"
import SaveChangesDialog from "../dialogs/SaveChangesDialog.vue"
import FileOpenInfoDialog from "../dialogs/FileOpenInfoDialog.vue"
import AboutDialog from "../dialogs/AboutDialog.vue"
import { stationContextMenuInjection, lineContextMenuInjection, lineSegmentContextMenuInjection } from "./injection"
import { registerSW } from "virtual:pwa-register"

const store = useMainStore()
const gui = useGuiStore()
const message = useGuiMessageStore()

const workspace = ref<InstanceType<typeof Workspace>>(null)
const horizontalZoomStyle = computed(() => ({
  position: "absolute",
  right: `${(workspace.value?.scrollBarSize?.width ?? 0) + 44}px`,
  bottom: `${(workspace.value?.scrollBarSize?.height ?? 0)}px`,
}) satisfies StyleValue)
const verticalZoomStyle = computed(() => ({
  position: "absolute",
  right: `${(workspace.value?.scrollBarSize?.width ?? 0)}px`,
  bottom: `${(workspace.value?.scrollBarSize?.height ?? 0) + 48}px`,
}) satisfies StyleValue)
const toggleSidebarStyle = computed(() => ({
  position: "absolute",
  right: `${(workspace.value?.scrollBarSize?.width ?? 0)}px`,
  bottom: `${(workspace.value?.scrollBarSize?.height ?? 0)}px`,
}) satisfies StyleValue)

const stationContextMenu = ref<InstanceType<typeof StationContextMenu>>(null)
provide(stationContextMenuInjection, stationContextMenu)
const lineContextMenu = ref<InstanceType<typeof LineContextMenu>>(null)
provide(lineContextMenuInjection, lineContextMenu)
const lineSegmentContextMenu = ref<InstanceType<typeof LineSegmentContextMenu>>(null)
provide(lineSegmentContextMenuInjection, lineSegmentContextMenu)

const saveChangesDialog = ref<InstanceType<typeof SaveChangesDialog>>(null)
const fileOpenInfoDialog = ref<InstanceType<typeof FileOpenInfoDialog>>(null)
const aboutDialog = ref<InstanceType<typeof AboutDialog>>(null)

const title = computed(() => {
  return (gui.modified ? "*" : "") + gui.currentFileHandle.getFilename() + " - SimuDia-Extended " + (__VERSION__ ?? "")
})

const zoomInHorizontal = () => { gui.zoom.horizontal++ }
const zoomOutHorizontal = () => { gui.zoom.horizontal-- }
const zoomInVertical = () => { gui.zoom.vertical++ }
const zoomOutVertical = () => { gui.zoom.vertical-- }

const showSidebar = ref(true)
const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value
}

const toggleInputMode = () => {
  if (gui.mode === "input") {
    gui.resetInput()
    gui.mode = "edit"
  } else {
    gui.unselectAll()
    gui.mode = "input"
  }
}

// returns true if succeeds
const openFileInternal = async (fileHandle: OpenFileHandle, type: "standard" | "legacy" | null): Promise<boolean> => {
  let content: string
  try {
    content = await fileHandle.open()
  } catch (e) {
    await fileOpenInfoDialog.value.open("error", [`${e}`])
    return false
  }

  const { result, type: resolvedType, errors, warnings } = deserialize(content, type)
  if (errors.length > 0) {
    await fileOpenInfoDialog.value.open("error", errors)
    return false
  }

  store.$patch(result)

  if (resolvedType == "legacy") {
    gui.currentFileHandle = createNewFileHandle(fileHandle.getFilename().replace(/\.simudia$/, ".simudiax"))
    gui.modified = true
  } else {
    gui.currentFileHandle = fileHandle
    gui.modified = false
  }

  gui.unselectAll()

  if (warnings.length > 0) {
    await fileOpenInfoDialog.value.open("warning", warnings)
  }

  return true
}

const saveFileInternal = async (fileHandle: OpenFileHandle): Promise<boolean> => {
  const { result, errors, warnings } = serialize(store)
  if (errors.length > 0) {
    await fileOpenInfoDialog.value.open("error", errors)
    return false
  }

  try {
    await fileHandle.save(result)
  } catch (e) {
    await fileOpenInfoDialog.value.open("error", [`${e}`])
    return false
  }

  gui.modified = false

  if (warnings.length > 0) {
    await fileOpenInfoDialog.value.open("warning", warnings)
  }

  return true
}

// returns true if proceedable
const checkModifiedAndSaveFile = async (): Promise<boolean> => {
  if (gui.modified) {
    const result = await saveChangesDialog.value.open()
    if (result == "cancel") return false
    if (result == "yes") {
      return await saveFile()
    }
  }
  return true
}

// returns true if succeeds
const newFile = async (): Promise<boolean> => {
  if (!await checkModifiedAndSaveFile()) return false
  gui.newFile()
  gui.unselectAll()
  return true
}

// returns true if succeeds
const openFile = async (): Promise<boolean> => {
  if (!await checkModifiedAndSaveFile()) return false

  const api = availableFileApis[0]
  const fileHandle = await api.open({ type: "standard" })
  if (fileHandle == null) return false

  return await openFileInternal(fileHandle, "standard")
}

// returns true if succeeds
const importLegacyFile = async (): Promise<boolean> => {
  if (!await checkModifiedAndSaveFile()) return false

  const api = availableFileApis[0]
  const fileHandle = await api.open({ type: "legacy" })
  if (fileHandle == null) return false

  return await openFileInternal(fileHandle, "legacy")
}

// returns true if succeeds
const saveFile = async (): Promise<boolean> => {
  if (!gui.currentFileHandle.hasOpenedFile) {
    return await saveFileAs()
  }

  return await saveFileInternal(gui.currentFileHandle)
}

// returns true if succeeds
const saveFileAs = async (): Promise<boolean> => {
  const api = availableFileApis[0]
  const fileHandle = await api.create({ preferredFilename: gui.currentFileHandle.getFilename() })
  if (fileHandle == null) return false

  if (await saveFileInternal(fileHandle)) {
    gui.currentFileHandle = fileHandle
  } else {
    return false
  }
}

const dragover = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer.items.length != 1 || e.dataTransfer.items[0].kind != "file") {
    e.dataTransfer.dropEffect = "none"
    return
  }
  e.dataTransfer.dropEffect = "copy"
}

// returns true if succeeds
const drop = async (e: DragEvent): Promise<boolean> => {
  e.preventDefault()
  if (e.dataTransfer.items.length != 1 || e.dataTransfer.items[0].kind != "file") return false

  const api = availableFileApis[0]
  const fileHandle = await api.onFileDrop(e.dataTransfer.items[0])
  if (fileHandle == null) return false

  if (!await checkModifiedAndSaveFile()) return false

  return await openFileInternal(fileHandle, null)
}

const showAboutDialog = () => {
  aboutDialog.value.open()
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

const updateAvailable = ref(false)
const updateNotification = ref(false)
watch(updateAvailable, () => {
  if (updateAvailable) updateNotification.value = true
})
const updateVersion = () => {
  console.log("Updating version")
  updateSW()
}
const updateSW = registerSW({
  onNeedRefresh: async () => {
    console.log("Service Worker needs to refresh")
    updateAvailable.value = true
  },
  onRegisteredSW: () => {
    console.log("Service Worker registered")
  },
  onOfflineReady: () => {
    console.log("Service Worker is now offline ready")
  },
})
</script>

<style scoped>
</style>
