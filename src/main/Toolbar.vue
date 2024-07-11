<template>
  <div :style="scrollbarSizeStyle">
    <div class="toolbar-container-zoom-horizontal">
      <v-btn-group
        class="ma-2 toolbar-multiline-horizontal"
        :class="{ 'toolbar-expanded': horizontalToolbarHovered }"
        density="comfortable"
        elevation="4"
        @mouseenter="hoverHorizontalToolbar"
        @mouseleave="unhoverHorizontalToolbar">
        <div class="toolbar-line">
          <v-btn color="grey-lighten-4" icon="mdi-plus" @click.prevent.stop="zoomInHorizontal"></v-btn>
          <v-btn color="grey-lighten-4" icon="mdi-minus" @click.prevent.stop="zoomOutHorizontal"></v-btn>
        </div>
        <div class="toolbar-line">
          <v-btn color="grey-lighten-4" icon="mdi-arrow-expand-horizontal" @click.prevent.stop="zoomFitHorizontal"></v-btn>
          <v-btn color="grey-lighten-4" icon="mdi-undo-variant" @click.prevent.stop="zoomResetHorizontal"></v-btn>
        </div>
      </v-btn-group>
    </div>
    <div class="toolbar-container-zoom-vertical">
      <v-btn-group
        class="ma-2 toolbar-multiline-vertical"
        :class="{ 'toolbar-expanded': verticalToolbarHovered }"
        density="comfortable"
        elevation="4"
        @mouseenter="hoverVerticalToolbar"
        @mouseleave="unhoverVerticalToolbar">
        <div class="toolbar-line">
          <v-btn color="grey-lighten-4" icon="mdi-plus" @click.prevent.stop="zoomInVertical"></v-btn>
          <v-btn color="grey-lighten-4" icon="mdi-minus" @click.prevent.stop="zoomOutVertical"></v-btn>
        </div>
        <div class="toolbar-line">
          <v-btn color="grey-lighten-4" icon="mdi-arrow-expand-vertical" @click.prevent.stop="zoomFitVertical"></v-btn>
          <v-btn color="grey-lighten-4" icon="mdi-undo-variant" @click.prevent.stop="zoomResetVertical"></v-btn>
        </div>
      </v-btn-group>
    </div>
    <div class="toolbar-container-toggle-sidebar">
      <v-btn-group class="ma-2 toolbar-singleline" density="comfortable" elevation="4">
        <v-btn
          color="grey-lighten-4"
          :icon="gui.showSidebar ? 'mdi-arrow-collapse-right' : 'mdi-arrow-expand-left'"
          @click.prevent.stop="toggleSidebar">
        </v-btn>
      </v-btn-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"
import { computed, ref } from "vue";

const store = useMainStore()
const gui = useGuiStore()

const scrollbarSizeStyle = computed(() => ({
  "--scrollbar-width": `${gui.scrollbarSize.width}px`,
  "--scrollbar-height": `${gui.scrollbarSize.height}px`,
}))

const zoomInHorizontal = () => {
  gui.zoom.horizontal++
}
const zoomOutHorizontal = () => {
  gui.zoom.horizontal--
}
const zoomFitHorizontal = () => {
  const lastTime = store.monthLength
  const value = gui.xf(lastTime, gui.workspaceSize.width)
  if (value != null) gui.zoom.horizontal = value
}
const zoomResetHorizontal = () => {
  gui.zoom.horizontal = 0
}
const zoomInVertical = () => {
  gui.zoom.vertical++
}
const zoomOutVertical = () => {
  gui.zoom.vertical--
}
const zoomFitVertical = () => {
  const stations = gui.stations
  if (stations.length == 0) return
  const lastStation = stations[stations.length - 1]
  const lastStationTime = lastStation.accumulatedTime
  const value = gui.yf(lastStationTime, gui.workspaceSize.height)
  if (value != null) gui.zoom.vertical = value
}
const zoomResetVertical = () => {
  gui.zoom.vertical = 0
}

const horizontalToolbarHovered = ref(false)
const verticalToolbarHovered = ref(false)
const hoverHorizontalToolbar = () => {
  horizontalToolbarHovered.value = true
}
const unhoverHorizontalToolbar = () => {
  horizontalToolbarHovered.value = false
}
const hoverVerticalToolbar = () => {
  verticalToolbarHovered.value = true
}
const unhoverVerticalToolbar = () => {
  verticalToolbarHovered.value = false
}

const toggleSidebar = () => {
  gui.showSidebar = !gui.showSidebar
}
</script>

<style scoped>
.toolbar-container-zoom-horizontal {
  position: absolute;
  right: calc(var(--scrollbar-width) + 44px);
  bottom: var(--scrollbar-height);
}

.toolbar-container-zoom-vertical {
  position: absolute;
  right: var(--scrollbar-width);
  bottom: calc(var(--scrollbar-height) + 44px);
}

.toolbar-container-toggle-sidebar {
  position: absolute;
  right: var(--scrollbar-width);
  bottom: var(--scrollbar-height);
}

.toolbar-singleline {
  height: 36px;
}

.toolbar-multiline-horizontal {
  display: inline-flex;
  flex-direction: column-reverse;
  width: auto;
  height: 36px;
}

.toolbar-multiline-horizontal.toolbar-expanded {
  height: 72px;
}

.toolbar-multiline-horizontal .toolbar-line {
  display: flex;
  flex-direction: row;
  height: 36px;
  min-height: 36px;
}

.toolbar-multiline-vertical {
  display: inline-flex;
  flex-direction: row-reverse;
  width: 36px;
  height: auto;
}

.toolbar-multiline-vertical.toolbar-expanded {
  width: 72px;
}

.toolbar-multiline-vertical .toolbar-line {
  display: flex;
  flex-direction: column;
  width: 36px;
  min-width: 36px;
}

.toolbar-multiline-vertical .v-btn {
  height: 36px !important;
}
</style>