<!-- NOTE: This component must be a child of MainScreen -->

<template>  
  <div class="time-input-container" v-if="inputtingTimeIndex >= 0" :style="{ top: timeInputPosition.y + 'px', left: timeInputPosition.x + 'px' }">
    <div contenteditable :class="{ error: errorTime }" ref="timeInput" @keydown.enter.prevent="putTime" @input="inputTime"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref } from "vue"
import { useMainStore } from "../stores/main"
import * as TimeUtil from "../time-util"
import { type ExposedType } from "./MainScreen.vue"

// TODO: remove
const instance: { parent: { exposed: ExposedType } } = getCurrentInstance()

const store = useMainStore()

const timeInput = ref(null)

const rubberbands = ref([])
const inputtingTimeIndex = ref(-1)
const errorTime = ref(false)
const inputtingTimes = ref([])

const timeInputPosition = computed(() => {
  if (inputtingTimeIndex.value > rubberbands.value.length - 2) return { x: 0, y: 0 }
  const { time: firstTime, station: firstStation } = rubberbands.value[inputtingTimeIndex.value]
  const { time: secondTime, station: secondStation } = rubberbands.value[inputtingTimeIndex.value + 1]
  const x = instance.parent.exposed.x((firstTime + secondTime) / 2) - 50
  const y = (instance.parent.exposed.accumulatedStationY.value[firstStation] + instance.parent.exposed.accumulatedStationY.value[secondStation]) / 2 - 10
  return { x, y }
})

const start = (inRubberbands) => {
  rubberbands.value = inRubberbands
  inputtingTimeIndex.value = 0
  nextTick(() => {
    const element = timeInput
    element.value.innerText = TimeUtil.joinStringSimple(rubberbands.value[inputtingTimeIndex.value + 1].time - rubberbands.value[inputtingTimeIndex.value].time)
    element.value.focus()
    document.execCommand("selectAll", false)
  })
}

const inputTime = () => {
  const element = timeInput
  const text = element.value.innerText.trim()
  errorTime.value = !TimeUtil.isValidTimeInput(text)
}

const putTime = () => {
  const element = timeInput
  const text = element.value.innerText.trim()
  if (!TimeUtil.isValidTimeInput(text)) return
  inputtingTimes.value.push(TimeUtil.parse(text))
  if (inputtingTimeIndex.value < rubberbands.value.length - 2) {
    inputtingTimeIndex.value++
    element.value.innerText = TimeUtil.joinStringSimple(rubberbands.value[inputtingTimeIndex.value + 1].time - rubberbands.value[inputtingTimeIndex.value].time)
    element.value.focus()
    document.execCommand("selectAll", false)
  } else {
    if (instance.parent.exposed.lineInsertOrigin.value.line !== -1) {
      store.insertHalts({
        lineIndex: instance.parent.exposed.lineInsertOrigin.value.line, haltIndex: instance.parent.exposed.lineInsertOrigin.value.halt,
        stationIndices: rubberbands.value.map(e => e.station), times: inputtingTimes.value
      })
    } else {
      store.addLine({ stationIndices: rubberbands.value.map(e => e.station), times: inputtingTimes.value, firstTime: rubberbands.value[0].time })
    }
    instance.parent.exposed.resetInput()
  }
}

const reset = () =>  {
  rubberbands.value = []
  inputtingTimeIndex.value = -1
  inputtingTimes.value = []
}

defineExpose({
  start,
  reset,
})
</script>

<style>
</style>
