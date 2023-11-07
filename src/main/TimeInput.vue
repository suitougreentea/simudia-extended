<template>  
  <div class="time-input-container" v-if="inputtingTimeIndex >= 0" :style="{ top: timeInputPosition.y + 'px', left: timeInputPosition.x + 'px' }">
    <div contenteditable :class="{ error: errorTime }" ref="timeInput" @keydown.enter.prevent="putTime" @input="inputTime"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui";
import { useGuiMessageStore } from "../stores/gui-message";
import * as TimeUtil from "../time-util"

const store = useMainStore()
const gui = useGuiStore()
const message = useGuiMessageStore()

const timeInput = ref(null)

const rubberbands = ref([])
const inputtingTimeIndex = ref(-1)
const errorTime = ref(false)
const inputtingTimes = ref([])

const timeInputPosition = computed(() => {
  if (inputtingTimeIndex.value > rubberbands.value.length - 2) return { x: 0, y: 0 }
  const { time: firstTime, station: firstStation } = rubberbands.value[inputtingTimeIndex.value]
  const { time: secondTime, station: secondStation } = rubberbands.value[inputtingTimeIndex.value + 1]
  const x = gui.x((firstTime + secondTime) / 2) - 50
  const y = (gui.accumulatedStationY[firstStation] + gui.accumulatedStationY[secondStation]) / 2 - 10
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
    if (gui.lineInsertOrigin.line !== -1) {
      store.insertHalts({
        lineIndex: gui.lineInsertOrigin.line, haltIndex: gui.lineInsertOrigin.halt,
        stationIndices: rubberbands.value.map(e => e.station), times: inputtingTimes.value
      })
    } else {
      store.addLine({ stationIndices: rubberbands.value.map(e => e.station), times: inputtingTimes.value, firstTime: rubberbands.value[0].time })
    }
    gui.resetInput()
  }
}

const reset = () =>  {
  rubberbands.value = []
  inputtingTimeIndex.value = -1
  inputtingTimes.value = []
}

message.$onAction(({ name, args: _args }) => {
  if (name == "resetInput") {
    reset()
  }
  if (name == "startTimeInput") {
    const args = _args[0]
    start(args.rubberbands)
  }
})

defineExpose({
  start,
})
</script>

<style>
</style>
