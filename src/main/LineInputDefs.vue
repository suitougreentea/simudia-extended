<!-- NOTE: This component must be a child of MainScreen -->

<template>  
  <defs>
    <symbol id="line-input">
      <path :d="displayPath" fill="none" stroke="black"></path>
      <circle v-for="c in displayCircles" :cx="c.x" :cy="c.y" r="3" fill="black"></circle>
      <g v-if="$parent.stationSelection.hovered >= 0 && $parent.hoveredTime >= 0">
        <path :d="displayPathNew" fill="none" stroke="gray"></path>
        <circle v-for="c in displayCirclesNew" :cx="c.x" :cy="c.y" r="3" fill="gray"></circle>
      </g>
    </symbol>
  </defs>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref } from "vue"
import * as TimeUtil from "../time-util"
import { type ExposedType } from "./MainScreen.vue";

// TODO: remove
const instance: { parent: { exposed: ExposedType } } = getCurrentInstance()

const rubberbands = ref([]) // {time, station, done}
const terminal = ref(-1)

const getNewRubberbands = (station, _time, skip) => {
  if (_time < 0) return []
  if (instance.parent.exposed.inputtingTime.value) return []
  if (rubberbands.value.length === 0) return [{ station, time: _time }]
  if (rubberbands.value[rubberbands.value.length - 1].station === station) {
    // if (rubberbands.value[rubberbands.value.length - 1].station != rubberbands.value[0].station) {
    if (rubberbands.value[rubberbands.value.length - 1].station !== terminal.value) {
      // return [{ station: rubberbands.value[0].station, time: rubberbands.value[rubberbands.value.length - 1].time + 30 * TimeUtil.SECOND_DIVISOR }]
      return [{ station: terminal.value, time: rubberbands.value[rubberbands.value.length - 1].time + 30 * TimeUtil.SECOND_DIVISOR }]
    }
    return []
  }
  const time = Math.max(_time, rubberbands.value[rubberbands.value.length - 1].time + 30 * TimeUtil.SECOND_DIVISOR)
  if (skip) return [{ station, time }]
  const result = []
  const {time: lastTime, station: lastStation} = rubberbands.value[rubberbands.value.length - 1]
  const lastY = instance.parent.exposed.accumulatedStationY.value[lastStation]
  const thisY = instance.parent.exposed.accumulatedStationY.value[station]
  let j = lastStation
  do {
    j += (lastStation < station) ? 1 : -1
    const y = instance.parent.exposed.accumulatedStationY.value[j]
    const t = lastTime + (time - lastTime) / (thisY - lastY) * (y - lastY)
    result.push({time: t, station: j})
  } while (j !== station)
  return result
}

const newRubberbands = computed(() => {
  return getNewRubberbands(instance.parent.exposed.stationSelection.value.hovered, instance.parent.exposed.hoveredTime.value, !instance.parent.exposed.modifierStates.value.shift)
})

const displayPath = computed(() => {
  return rubberbands.value.map((e, i) => {
    const x = instance.parent.exposed.x(e.time)
    const y = instance.parent.exposed.accumulatedStationY.value[e.station]
    if (i === 0) return `M ${x} ${y}`
    return `L ${x} ${y}`
  }).join(" ")
})

const displayPathNew = computed(() => {
  if (rubberbands.value.length === 0) return ""
  const appendedRubberbands = [rubberbands.value[rubberbands.value.length - 1], ...newRubberbands.value]
  return appendedRubberbands.map((e, i) => {
    const x = instance.parent.exposed.x(e.time)
    const y = instance.parent.exposed.accumulatedStationY.value[e.station]
    if (i === 0) return `M ${x} ${y}`
    return `L ${x} ${y}`
  }).join(" ")
})

const displayCircles = computed(() => {
  return rubberbands.value.map((e, i) => {
    const x = instance.parent.exposed.x(e.time)
    const y = instance.parent.exposed.accumulatedStationY.value[e.station]
    return { x, y }
  })
})

const displayCirclesNew = computed(() => {
  return newRubberbands.value.map((e, i) => {
    const x = instance.parent.exposed.x(e.time)
    const y = instance.parent.exposed.accumulatedStationY.value[e.station]
    return { x, y }
  })
})

const setTerminal = (stationIndex) => {
  terminal.value = stationIndex
}

const addPoint = ({ station, time, skip }) => {
  if (rubberbands.value.length === 0 && terminal.value === -1) {
    terminal.value = station
  }
  if (rubberbands.value.length > 0 && rubberbands.value[rubberbands.value.length - 1].station === station) {
    finishInput()
  } else {
    rubberbands.value = [...rubberbands.value, ...getNewRubberbands(station, time, skip)]
  }
}

const finishInput = () => {
  if (rubberbands.value[rubberbands.value.length - 1].station !== terminal.value) {
    rubberbands.value.push({ station: terminal.value, time: rubberbands.value[rubberbands.value.length - 1].time + 30 * TimeUtil.SECOND_DIVISOR })
  }
  if (rubberbands.value.length >= 3) {
    instance.parent.exposed.inputtingTime.value = true
    instance.parent.exposed.timeInput.value.start(rubberbands.value)
  }
}

const reset = () => {
  rubberbands.value = []
  terminal.value = -1
}

defineExpose({
  rubberbands,
  setTerminal,
  addPoint,
  finishInput,
  reset,
})
</script>

<style>
</style>
