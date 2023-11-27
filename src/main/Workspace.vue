<template>
  <div ref="container" style="overflow: scroll;" @click="clickBackground">
    <svg style="position: absolute; top: 0; left: 0;" :width="gui.layout.width" :height="gui.layout.height">
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
      <div class="station-name" contenteditable v-for="(s, i) in gui.stations" :style="{ top: gui.y(s.accumulatedTime) - 20 + 'px', left: '20px' }" @focus="gui.resetInput" @keydown.tab.prevent="modifyStationKeyProceed(i)" @keydown.enter.prevent="modifyStationKeyProceed(i)" @keydown.esc.prevent="modifyStationKeyCancel(i)" @blur="modifyStationBlur(i)" ref="existingStation">{{ s.name }}</div>
      <div class="station-name" contenteditable :style="{ top: newStationY + 'px', left: '20px' }" @focus="newStationFocus" @keydown.tab.prevent="newStationKeyProceed" @keydown.enter.prevent="newStationKeyProceed" @keydown.esc.prevent="newStationKeyCancel" @blur="newStationBlur" ref="newStation"></div>
      <div class="station-name" style="opacity: 0" ref="stationForMeasure"></div>
      <TimeInput ref="timeInput"></TimeInput>
    </div>
  </div>
</template>

<script setup lang="ts">
import LineDefs from "./LineDefs.vue"
import StationDefs from "./StationDefs.vue"
import LineInputDefs from "./LineInputDefs.vue"
import TimeInput from "./TimeInput.vue"
import { computed, ref, watch } from "vue";
import { useMainStore } from "../stores/main";
import { useGuiStore } from "../stores/gui";
import { useGuiMessageStore } from "../stores/gui-message";
import * as TimeUtil from "../time-util"

const store = useMainStore()
const gui = useGuiStore()
const message = useGuiMessageStore()

const container = ref<HTMLDivElement>(null)
const scrollBarSize = computed(() => {
  if (container.value == null) return { width: 0, height: 0 }
  return {
    width: container.value.offsetWidth - container.value.clientWidth,
    height: container.value.offsetHeight - container.value.clientHeight,
  }
})
const lineInputDefs = ref(null)
const newStation = ref(null)
const existingStation = ref(null)
const stationForMeasure = ref(null)

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
      color = "dimgrey"
      y = gui.layout.top
    } else if (i % (TimeUtil.SECOND_DIVISOR * 60 * 15) === 0) {
      color = "grey"
      y = gui.layout.top + gui.layout.headerHeight
    } else {
      color = "lightgrey"
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

const clickBackground = () => {
  gui.unselectAll()
}

const newStationFocus = () => {
  gui.resetInput()
  const element = newStation.value
  element.innerText = ""
}

const newStationKeyProceed = () => {
  const element = newStation.value
  const text = element.innerText.trim()
  if (text !== "") {
    store.addStation({ name: text })
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
    store.addStation({ name: text })
    element.innerText = ""
  }
}

const modifyStationKeyProceed = (i) => {
  const array = existingStation.value
  const element = array[i]
  const text = element.innerText.trim()
  if (text !== gui.stations[i].name) {
    store.modifyStation({ pos: i, name: text })
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
    store.modifyStation({ pos: i, name: text })
  }
}

const stationNames = computed(() =>  store.stations.map(e => e.name))
watch(stationNames, (value) => {
  const widths = value.map(e => measureStationWidth(e))
  gui.stationsWidth = Math.max(100, ...widths) + 10
})
const measureStationWidth = (name) => {
  const element = stationForMeasure.value
  element.innerText = name
  return element.clientWidth
}

message.$onAction(({ name, args: _args }) => {
  if (name == "enterKeyPressed") {
    const args = _args[0]
    const lineInputDefsElement = lineInputDefs.value
    if (gui.mode === "input" && !gui.inputtingTime && lineInputDefsElement.rubberbands.length > 0) {
      args.event.preventDefault()
      args.event.stopPropagation()
      lineInputDefsElement.finishInput()
    }
  }
})

defineExpose({
  scrollBarSize,
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
</style>