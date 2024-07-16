<template>
  <v-app @dragover="dragover" @drop="drop">
    <v-navigation-drawer permanent touchless rail color="primary">
      <v-list density="compact" nav>
        <v-menu>
          <template #activator="{ props }">
            <v-list-item prepend-icon="mdi-menu" :active="false" v-bind="props"></v-list-item>
          </template>
          <v-list>
            <v-list-item @click="newFile">New</v-list-item>
            <v-list-item @click="openFile">Open...</v-list-item>
            <v-list-item @click="saveFile">Save</v-list-item>
            <v-list-item @click="saveFileAs">Save As...</v-list-item>
            <v-list-item @click="importLegacyFile">Import SimuDia data...</v-list-item>
            <v-list-item @click="importUrl">Import from URL / Examples...</v-list-item>
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
      <div class="main-area">
        <MainWorkspace style="position: absolute; width: 100%; height: 100%;"></MainWorkspace>
        <Toolbar></Toolbar>
      </div>
    </v-main>

    <v-navigation-drawer v-model="gui.showSidebar" permanent touchless location="right" :width="sidebarWidth">
      <div
        class="sidebar-resizable"
        @pointerdown.prevent.stop="onSidebarResizablePointerdown">
      </div>
      <SidebarContent></SidebarContent>
    </v-navigation-drawer>

    <v-snackbar v-model="updateNotification" timeout="-1">
      A new version of SimuDia-Extended is available!
      <template #actions>
        <v-btn @click="updateVersion">Update</v-btn>
        <v-btn @click="updateNotification = false">Close</v-btn>
      </template>
    </v-snackbar>

    <StationContextMenu ref="stationContextMenu"></StationContextMenu>
    <LineContextMenu ref="lineContextMenu"></LineContextMenu>
    <LineSegmentContextMenu ref="lineSegmentContextMenu"></LineSegmentContextMenu>

    <SaveChangesDialog ref="saveChangesDialog"></SaveChangesDialog>
    <FileOpenInfoDialog ref="fileOpenInfoDialog"></FileOpenInfoDialog>
    <ImportUrlDialog ref="importUrlDialog"></ImportUrlDialog>
    <AboutDialog ref="aboutDialog"></AboutDialog>
  </v-app>
</template>

<script setup lang="ts">
import { computed, ref, watch, provide, onMounted } from "vue"
import { useMainStore } from "../stores/main"
import { type OpenFileHandle, allAvailableApis as availableFileApis, createNewFileHandle, createUrlFileHandle } from "../file-api"
import { deserialize, serialize } from "../serialization"
import MainWorkspace from "./MainWorkspace.vue"
import Toolbar from "./Toolbar.vue"
import SidebarContent from "./SidebarContent.vue"
import { useGuiStore } from "../stores/gui"
import { useGuiMessageStore } from "../stores/gui-message"
import StationContextMenu from "../context-menus/StationContextMenu.vue"
import LineContextMenu from "../context-menus/LineContextMenu.vue"
import LineSegmentContextMenu from "../context-menus/LineSegmentContextMenu.vue"
import SaveChangesDialog from "../dialogs/SaveChangesDialog.vue"
import FileOpenInfoDialog from "../dialogs/FileOpenInfoDialog.vue"
import ImportUrlDialog from "../dialogs/ImportUrlDialog.vue"
import AboutDialog from "../dialogs/AboutDialog.vue"
import { stationContextMenuInjection, lineContextMenuInjection, lineSegmentContextMenuInjection } from "./injection"
import { registerSW } from "virtual:pwa-register"

const store = useMainStore()
const gui = useGuiStore()
const message = useGuiMessageStore()

const stationContextMenu = ref<InstanceType<typeof StationContextMenu>>()
provide(stationContextMenuInjection, stationContextMenu as any) // TODO: typing
const lineContextMenu = ref<InstanceType<typeof LineContextMenu>>()
provide(lineContextMenuInjection, lineContextMenu as any)
const lineSegmentContextMenu = ref<InstanceType<typeof LineSegmentContextMenu>>()
provide(lineSegmentContextMenuInjection, lineSegmentContextMenu as any)

const saveChangesDialog = ref<InstanceType<typeof SaveChangesDialog>>()
const fileOpenInfoDialog = ref<InstanceType<typeof FileOpenInfoDialog>>()
const importUrlDialog = ref<InstanceType<typeof ImportUrlDialog>>()
const aboutDialog = ref<InstanceType<typeof AboutDialog>>()

const title = computed(() => {
  return (gui.modified ? "*" : "") + gui.currentFileHandle.getFilename() + " - SimuDia-Extended " + (__VERSION__ ?? "")
})

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
const openFileInternal = async (fileHandle: OpenFileHandle, type: "standard" | "legacy" | null, forceImport: boolean): Promise<boolean> => {
  let content: string
  try {
    content = await fileHandle.open()
  } catch (e) {
    await fileOpenInfoDialog.value!.open("error", [`${e}`])
    return false
  }

  const { result, type: resolvedType, errors, warnings } = deserialize(content, type)
  if (errors.length > 0) {
    await fileOpenInfoDialog.value!.open("error", errors)
    return false
  }

  store.$patch(result!)

  let imported = forceImport
  let newFilenameWhenImported = fileHandle.getFilename()
  if (resolvedType == "legacy") {
    imported = true
    newFilenameWhenImported = fileHandle.getFilename().replace(/\.simudia$/, ".simudiax")
  }

  if (imported) {
    gui.currentFileHandle = createNewFileHandle(newFilenameWhenImported)
    gui.modified = true
  } else {
    gui.currentFileHandle = fileHandle
    gui.modified = false
  }

  gui.unselectAll()

  if (warnings.length > 0) {
    await fileOpenInfoDialog.value!.open("warning", warnings)
  }

  return true
}

const saveFileInternal = async (fileHandle: OpenFileHandle): Promise<boolean> => {
  const { result, errors, warnings } = serialize(store)
  if (errors.length > 0) {
    await fileOpenInfoDialog.value!.open("error", errors)
    return false
  }

  try {
    await fileHandle.save(result!)
  } catch (e) {
    await fileOpenInfoDialog.value!.open("error", [`${e}`])
    return false
  }

  gui.modified = false

  if (warnings.length > 0) {
    await fileOpenInfoDialog.value!.open("warning", warnings)
  }

  return true
}

// returns true if proceedable
const checkModifiedAndSaveFile = async (): Promise<boolean> => {
  if (gui.modified) {
    const result = await saveChangesDialog.value!.open()
    if (result == "cancel") return false
    if (result == "yes") {
      return await saveFile()
    }
  }
  return true
}

// returns true if succeeds
const newFile = async (): Promise<boolean> => {
  if (!(await checkModifiedAndSaveFile())) return false
  gui.newFile()
  gui.unselectAll()
  return true
}

// returns true if succeeds
const openFile = async (): Promise<boolean> => {
  if (!(await checkModifiedAndSaveFile())) return false

  const api = availableFileApis[0]
  const fileHandle = await api.open({ type: "standard" })
  if (fileHandle == null) return false

  return await openFileInternal(fileHandle, "standard", false)
}

// returns true if succeeds
const importLegacyFile = async (): Promise<boolean> => {
  if (!(await checkModifiedAndSaveFile())) return false

  const api = availableFileApis[0]
  const fileHandle = await api.open({ type: "legacy" })
  if (fileHandle == null) return false

  return await openFileInternal(fileHandle, "legacy", true)
}

// returns true if succeeds
const importUrl = async (): Promise<boolean> => {
  if (!(await checkModifiedAndSaveFile())) return false

  const url = await importUrlDialog.value!.open()
  if (url == null) return false
  const fileHandle = createUrlFileHandle(url)
  if (fileHandle == null) return false

  return await openFileInternal(fileHandle, null, true)
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
    return true
  } else {
    return false
  }
}

const dragover = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer == null) return
  if (e.dataTransfer.items.length != 1 || e.dataTransfer.items[0].kind != "file") {
    e.dataTransfer.dropEffect = "none"
    return
  }
  e.dataTransfer.dropEffect = "copy"
}

// returns true if succeeds
const drop = async (e: DragEvent): Promise<boolean> => {
  e.preventDefault()
  if (e.dataTransfer == null || e.dataTransfer.items.length != 1 || e.dataTransfer.items[0].kind != "file") return false

  const api = availableFileApis[0]
  const fileHandle = await api.onFileDrop(e.dataTransfer.items[0])
  if (fileHandle == null) return false

  if (!(await checkModifiedAndSaveFile())) return false

  return await openFileInternal(fileHandle, null, false)
}

onMounted(async () => {
  const searchParams = new URL(window.location.href).searchParams
  const url = searchParams.get("open_url")
  if (url != null && url.trim() != "") {
    const fileHandle = createUrlFileHandle(url)
    if (fileHandle == null) return
    await openFileInternal(fileHandle, null, true)
  }
})

const showAboutDialog = () => {
  aboutDialog.value!.open()
}

const beforeUnload = (e: BeforeUnloadEvent) => {
  if (gui.modified) {
    e.returnValue = ""
    e.preventDefault()
  }
}

document.title = title.value
watch(title, (value) => {
  document.title = value
})

const windowWidth = ref(0)
window.addEventListener("resize", (_) => {
  windowWidth.value = window.innerWidth
})
windowWidth.value = window.innerWidth

// 割合で保存
// 表示の際は50以上、(ウィンドウ幅-100)未満
const sidebarProportion = ref(0.3)
const sidebarWidth = computed(() => {
  return Math.max(50, Math.min(windowWidth.value - 100, windowWidth.value * sidebarProportion.value))
})
const requestSidebarWidth = (width: number) => {
  width = Math.max(0, Math.min(windowWidth.value, width))
  sidebarProportion.value = width / windowWidth.value
}

const onSidebarResizablePointerdown = (ev: PointerEvent) => {
  const offset = sidebarWidth.value - (windowWidth.value - ev.screenX)
  const elem = (ev.target as HTMLElement).closest(".v-navigation-drawer")! as HTMLElement
  elem.style.transitionDuration = "0s"

  const pointermove = (ev: PointerEvent) => {
    requestSidebarWidth((windowWidth.value - ev.screenX) + offset)
  }

  const pointerup = (ev: PointerEvent) => {
    elem.style.transitionDuration = ""
    window.removeEventListener("pointermove", pointermove)
    window.removeEventListener("pointerup", pointerup)
    window.removeEventListener("pointercancel", pointerup)
  }
  window.addEventListener("pointermove", pointermove)
  window.addEventListener("pointerup", pointerup)
  window.addEventListener("pointercancel", pointerup)
}

window.addEventListener("keydown", (event) => {
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
window.addEventListener("keyup", (event) => {
  if (event.key === "Shift") gui.modifierStates.shift = false
  if (event.key === "Control") gui.modifierStates.control = false
})
window.addEventListener("beforeunload", (e) => beforeUnload(e))

const updateAvailable = ref(false)
const updateNotification = ref(false)
watch(updateAvailable, () => {
  if (updateAvailable.value) updateNotification.value = true
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
.main-area {
  position: absolute;
  left: var(--v-layout-left);
  right: var(--v-layout-right);
  top: var(--v-layout-top);
  bottom: var(--v-layout-bottom);
}

.sidebar-resizable {
  position: absolute;
  left: 0;
  width: 32px;
  height: 100%;
  cursor: ew-resize;
  touch-action: none;
}
</style>
