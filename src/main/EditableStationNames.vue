<template>
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
    @keydown.tab.exact.prevent="modifyStationKeyProceed(i, 1)"
    @keydown.tab.shift.exact.prevent="modifyStationKeyProceed(i, -1)"
    @keydown.enter.prevent="modifyStationKeyProceed(i, 1)"
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
    @keydown.tab.exact.prevent="newStationKeyProceed(1)"
    @keydown.tab.shift.exact.prevent="newStationKeyProceed(-1)"
    @keydown.enter.prevent="newStationKeyProceed(1)"
    @keydown.esc.prevent="newStationKeyCancel"
    @contextmenu.stop
  >
  <div ref="stationForMeasure" class="station-name" style="opacity: 0"></div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"

const store = useMainStore()
const gui = useGuiStore()

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

const newStationKeyProceed = (offset: number) => {
  const array = existingStation.value ?? []
  const element = newStation.value!
  const text = element.value.trim()
  if (text !== "") {
    store.addStation({ name: text })
    element.value = ""
  } else {
    element.blur()
  }
  const newIndex = array.length + offset
  if (newIndex < 0) return
  if (newIndex < array.length) {
    array[newIndex].focus()
  }
}

const newStationKeyCancel = () => {
  const element = newStation.value!
  element.value = ""
  element.blur()
}

const modifyStationKeyProceed = (i: number, offset: number) => {
  const array = existingStation.value!
  const element = array[i]
  const text = element.value.trim()
  if (text !== gui.stations[i].name) {
    store.modifyStation({ pos: i, name: text })
  }
  const newIndex = i + offset
  if (newIndex < 0) return
  if (newIndex >= array.length) {
    newStation.value!.focus()
  } else {
    array[newIndex].focus()
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