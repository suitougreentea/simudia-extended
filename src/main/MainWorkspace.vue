<template>
  <div ref="container" style="overflow: scroll" @click="clickBackground">
    <svg style="position: absolute; top: 0; left: 0" :width="gui.layout.width" :height="gui.layout.height">
      <filter id="selected-shadow" filterUnits="userSpaceOnUse" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="2"></feGaussianBlur>
        <feBlend in="SourceGraphic" in2="blur" mode="normal"></feBlend>
      </filter>
      <TimeGrid></TimeGrid>
      <VisibleStations></VisibleStations>
      <LineInput></LineInput>
      <VisibleLines></VisibleLines>
      <ClickableStations></ClickableStations>
      <ClickableLines></ClickableLines>
    </svg>
    <div style="position: absolute; top: 0; left: 0">
      <div v-if="stationPlaceholderVisible"
        class="station-name station-name-placeholder"
        :style="{ top: newStationY + 'px', left: gui.layout.left + 'px' }"
      >{{ stationPlaceholderText }}</div>
      <input
        v-for="(s, i) in gui.stations"
        ref="existingStation"
        type="text"
        :value="s.name"
        class="station-name"
        :style="{ top: gui.y(s.accumulatedTime) - 20 + 'px', left: '20px', width: gui.stationsWidth + 'px' }"
        @focus="gui.resetInput"
        @blur="modifyStationBlur(i)"
        @keydown.tab.prevent="modifyStationKeyProceed(i)"
        @keydown.enter.prevent="modifyStationKeyProceed(i)"
        @keydown.esc.prevent="modifyStationKeyCancel(i)"
        @contextmenu.stop
      >
      <input
        ref="newStation"
        type="text"
        class="station-name"
        :style="{ top: newStationY + 'px', left: gui.layout.left + 'px', width: gui.stationsWidth + 'px' }"
        @focus="newStationFocus"
        @blur="newStationBlur"
        @keydown.tab.prevent="newStationKeyProceed"
        @keydown.enter.prevent="newStationKeyProceed"
        @keydown.esc.prevent="newStationKeyCancel"
        @contextmenu.stop
      >
      <div ref="stationForMeasure" class="station-name" style="opacity: 0"></div>
      <TimeInput ref="timeInput"></TimeInput>
    </div>
  </div>
</template>

<script setup lang="ts">
import TimeGrid from "./TimeGrid.vue"
import VisibleStations from "./VisibleStations.vue"
import ClickableStations from "./ClickableStations.vue"
import VisibleLines from "./VisibleLines.vue"
import ClickableLines from "./ClickableLines.vue"
import LineInput from "./LineInput.vue"
import TimeInput from "./TimeInput.vue"
import { computed, ref, watch } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"
import { useGuiMessageStore } from "../stores/gui-message"

const store = useMainStore()
const gui = useGuiStore()
const message = useGuiMessageStore()

const container = ref<HTMLDivElement>()
const newStation = ref<HTMLInputElement>()
const existingStation = ref<HTMLInputElement[]>()
const stationForMeasure = ref<HTMLDivElement>()

const newStationY = computed(() => {
  const stations = store.stations
  if (stations.length === 0) {
    return 20
  } else {
    return gui.layout.height - 20
  }
})

const stationPlaceholderVisible = ref(true)
const stationPlaceholderText = computed(() => {
  return store.stations.length > 0 ? "Add station" : "Begin here"
})

const clickBackground = () => {
  gui.unselectAll()
}

const newStationFocus = () => {
  gui.resetInput()
  const element = newStation.value!
  element.value = ""
  stationPlaceholderVisible.value = false
}

const newStationBlur = () => {
  const element = newStation.value!
  const text = element.value.trim()
  if (text !== "") {
    store.addStation({ name: text })
    element.value = ""
  }
  stationPlaceholderVisible.value = true
}

const newStationKeyProceed = () => {
  const element = newStation.value!
  const text = element.value.trim()
  if (text !== "") {
    store.addStation({ name: text })
    element.value = ""
  } else {
    element.blur()
  }
}

const newStationKeyCancel = () => {
  const element = newStation.value!
  element.value = ""
  element.blur()
}

const modifyStationKeyProceed = (i: number) => {
  const array = existingStation.value!
  const element = array[i]
  const text = element.value.trim()
  if (text !== gui.stations[i].name) {
    store.modifyStation({ pos: i, name: text })
  }
  if (array.length === i + 1) {
    newStation.value!.focus()
  } else {
    array[i + 1].focus()
  }
}

const modifyStationKeyCancel = (i: number) => {
  const array = existingStation.value!
  const element = array[i]
  element.value = gui.stations[i].name
  element.blur()
}

const modifyStationBlur = (i: number) => {
  const array = existingStation.value!
  const element = array[i]
  const text = element.value.trim()
  if (text !== gui.stations[i].name) {
    store.modifyStation({ pos: i, name: text })
  }
}

const stationNames = computed(() => store.stations.map((e) => e.name))
watch(stationNames, (value) => {
  const widths = value.map((e) => measureStationWidth(e))
  gui.stationsWidth = Math.max(100, ...widths) + 10
})
const measureStationWidth = (name: string) => {
  const element = stationForMeasure.value!
  element.innerText = name
  return element.clientWidth
}

const containerResizeObserver = new ResizeObserver(() => {
  if (container.value == null) return
  gui.workspaceSize = {
    width: container.value.clientWidth,
    height: container.value.clientHeight,
  }
  gui.scrollbarSize = {
    width: container.value.offsetWidth - container.value.clientWidth,
    height: container.value.offsetHeight - container.value.clientHeight,
  }
})
let currentObservedContainer: Element | undefined = undefined
watch(container, c => {
  if (currentObservedContainer != null) containerResizeObserver.unobserve(currentObservedContainer)
  if (c != null) containerResizeObserver.observe(c)
  currentObservedContainer = c
})
</script>

<style scoped>
.station-name {
  min-width: 100px;
  line-height: 20px;
  position: absolute;
  white-space: nowrap;
  font-size: 14px;
}
.station-name-placeholder {
  color: gray;
}
</style>
