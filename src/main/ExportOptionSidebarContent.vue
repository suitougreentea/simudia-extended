<template>
  <div style="height: 100%">
    <v-container>
      <NumberInputControl :model-value="width" label="Width" @update:model-value="widthUpdated"></NumberInputControl>
      <NumberInputControl :model-value="height" label="Height" :disabled="hasFixedHeight" @update:model-value="heightUpdated"></NumberInputControl>
      <!--
        <NumberInputControl v-model="gui.zoom.horizontal" label="Horizontal Zoom Level" :min="-20" :max="20"></NumberInputControl>
        <NumberInputControl v-model="gui.zoom.vertical" label="Vertical Zoom Level" :min="-20" :max=20></NumberInputControl>
      -->
      <v-divider class="ma-3"></v-divider>
      <v-btn color="primary" density="default" @click.prevent.stop="exportAsSvg">Export</v-btn>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, onMounted } from "vue"
import NumberInputControl from "../components/NumberInputControl.vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"
import { useGuiMessageStore } from "../stores/gui-message"

const store = useMainStore()
const gui = useGuiStore()
const message = useGuiMessageStore()

const width = ref(100)
const height = ref(100)
const hasFixedHeight = computed(() => gui.stations.length == 0)

onMounted(() => {
  const initialWidth = gui.layout.margin + gui.layout.stationsWidth + 1200 + gui.layout.margin;
  const initialHeight = gui.layout.margin + gui.layout.headerHeight + (hasFixedHeight.value ? 0 : 800) + gui.layout.margin;
  width.value = initialWidth
  height.value = initialHeight
  widthUpdated(initialWidth)
  heightUpdated(initialHeight)
})

const widthUpdated = (newWidth: number) => {
  const oldValue = width.value
  width.value = newWidth
  if (!updateHorizontalZoom(newWidth)) {
    (async () => {
      await nextTick()
      width.value = oldValue
    })()
  }
}

const heightUpdated = (newHeight: number) => {
  const oldValue = height.value
  height.value = newHeight
  if (!updateVerticalZoom(newHeight)) {
    (async () => {
      await nextTick()
      height.value = oldValue
    })()
  }
}

const updateHorizontalZoom = (newWidth: number): boolean => {
  const lastTime = store.monthLength
  const value = gui.xf(lastTime, newWidth)
  if (value != null) {
    gui.zoom.horizontal = value
    return true
  } else {
    return false
  }
}

const updateVerticalZoom = (newHeight: number): boolean => {
  const stations = gui.stations
  if (stations.length == 0) return false
  const lastStation = stations[stations.length - 1]
  const lastStationTime = lastStation.accumulatedTime
  const value = gui.yf(lastStationTime, newHeight)
  if (value != null) {
    gui.zoom.vertical = value
    return true
  } else {
    return false
  }
}

/*
const updateSizeFromZoom = () => {
  width.value = gui.layout.width
  height.value = gui.layout.height
}
watch(gui.zoom, (newZoom) => {
  updateSizeFromZoom()
})
updateSizeFromZoom()
*/

const exportAsSvg = () => {
  message.exportAsSvg({})
}

</script>