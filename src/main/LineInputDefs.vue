<template>
  <defs>
    <symbol id="line-input">
      <path :d="displayPath" fill="none" stroke="black"></path>
      <circle v-for="c in displayCircles" :cx="c.x" :cy="c.y" r="3" fill="black"></circle>
      <g v-if="gui.isSingleStationHovered && gui.hoveredTime >= 0">
        <path :d="displayPathNew" fill="none" stroke="grey"></path>
        <circle v-for="c in displayCirclesNew" :cx="c.x" :cy="c.y" r="3" fill="grey"></circle>
      </g>
    </symbol>
  </defs>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import * as TimeUtil from "../time-util"
import { useGuiStore } from "../stores/gui"
import { useGuiMessageStore } from "../stores/gui-message"

const gui = useGuiStore()
const message = useGuiMessageStore()

const rubberbands = ref([]) // {time, station, done}
const terminal = ref(-1)

const getNewRubberbands = (station, _time, skip) => {
  if (_time < 0) return []
  if (gui.inputtingTime) return []
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
  const { time: lastTime, station: lastStation } = rubberbands.value[rubberbands.value.length - 1]
  const lastY = gui.y(gui.stations[lastStation].accumulatedTime)
  const thisY = gui.y(gui.stations[station].accumulatedTime)
  let j = lastStation
  do {
    j += lastStation < station ? 1 : -1
    const y = gui.y(gui.stations[j].accumulatedTime)
    const t = lastTime + ((time - lastTime) / (thisY - lastY)) * (y - lastY)
    result.push({ time: t, station: j })
  } while (j !== station)
  return result
}

const newRubberbands = computed(() => {
  if (gui.resolvedHoveredStations.length != 1) return
  const stationIndex = gui.stations.findIndex((e) => e.id == gui.resolvedHoveredStations[0].id)
  return getNewRubberbands(stationIndex, gui.hoveredTime, !gui.modifierStates.shift)
})

const displayPath = computed(() => {
  return rubberbands.value
    .map((e, i) => {
      const x = gui.x(e.time)
      const y = gui.y(gui.stations[e.station].accumulatedTime)
      if (i === 0) return `M ${x} ${y}`
      return `L ${x} ${y}`
    })
    .join(" ")
})

const displayPathNew = computed(() => {
  if (rubberbands.value.length === 0) return ""
  const appendedRubberbands = [rubberbands.value[rubberbands.value.length - 1], ...newRubberbands.value]
  return appendedRubberbands
    .map((e, i) => {
      const x = gui.x(e.time)
      const y = gui.y(gui.stations[e.station].accumulatedTime)
      if (i === 0) return `M ${x} ${y}`
      return `L ${x} ${y}`
    })
    .join(" ")
})

const displayCircles = computed(() => {
  return rubberbands.value.map((e, i) => {
    const x = gui.x(e.time)
    const y = gui.y(gui.stations[e.station].accumulatedTime)
    return { x, y }
  })
})

const displayCirclesNew = computed(() => {
  return newRubberbands.value.map((e, i) => {
    const x = gui.x(e.time)
    const y = gui.y(gui.stations[e.station].accumulatedTime)
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
    gui.inputtingTime = true
    message.startTimeInput({ rubberbands: rubberbands.value })
  }
}

const reset = () => {
  rubberbands.value = []
  terminal.value = -1
}

message.$onAction(({ name, args: _args }) => {
  if (name == "resetInput") {
    reset()
  }
  if (name == "addLineInputPoint") {
    const args = _args[0]
    addPoint({ station: args.stationIndex, time: args.time, skip: args.skip })
  }
  if (name == "setLineInputTerminal") {
    const args = _args[0]
    setTerminal(args.stationIndex)
  }
})

defineExpose({
  rubberbands,
  setTerminal,
  addPoint,
  finishInput,
})
</script>

<style scoped></style>
