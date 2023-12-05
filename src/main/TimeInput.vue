<template>  
  <div class="time-input-container" v-if="inputtingTimeIndex >= 0 && !temporaryHidden" :style="{ top: timeInputPosition.y + 'px', left: timeInputPosition.x + 'px' }">
    <TimeInputControl omit-hour v-model="inputValue" :hints="hints" ref="timeInput"
      @keydown.enter="onEnterKeyDown" @selected-from-hints="onSelectedFromHints"></TimeInputControl>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"
import { useGuiMessageStore } from "../stores/gui-message"
import TimeInputControl, { type Hint } from "../components/TimeInputControl.vue"

const store = useMainStore()
const gui = useGuiStore()
const message = useGuiMessageStore()

const timeInput = ref(null)
const inputValue = ref(0)
const hints = ref<Hint[]>([])

const rubberbands = ref<{ time: number, station: number }[]>([])
const inputtingTimeIndex = ref(-1)
const inputtingTimes = ref([])

const temporaryHidden = ref(false)

const timeInputPosition = computed(() => {
  if (inputtingTimeIndex.value > rubberbands.value.length - 2) return { x: 0, y: 0 }
  const { time: firstTime, station: firstStation } = rubberbands.value[inputtingTimeIndex.value]
  const { time: secondTime, station: secondStation } = rubberbands.value[inputtingTimeIndex.value + 1]
  const x = gui.x((firstTime + secondTime) / 2) - 50
  const y = (gui.y(gui.stations[firstStation].accumulatedTime) + gui.y(gui.stations[secondStation].accumulatedTime)) / 2 - 20
  return { x, y }
})

const start = async (inRubberbands: { time: number, station: number }[]) => {
  rubberbands.value = inRubberbands
  startInput(0)
}

const startInput = async (index: number) => {
  inputtingTimeIndex.value = index
  const currentRubberband = rubberbands.value[inputtingTimeIndex.value]
  const nextRubberband = rubberbands.value[inputtingTimeIndex.value + 1]
  hints.value = [
    { time: nextRubberband.time - currentRubberband.time, source: "Inferred from line" },
    ...gui.getTimeHintsBetween(
      gui.stations[currentRubberband.station].id,
      gui.stations[nextRubberband.station].id)
  ]
  await nextTick()
  inputValue.value = nextRubberband.time - currentRubberband.time
  timeInput.value.$el.querySelector("input").focus()
  await nextTick()
  timeInput.value.$el.querySelector("input").select()
}

const onEnterKeyDown = async () => {
  // TODO: hacky way to wait inputValue update
  await nextTick()
  await new Promise(r => setTimeout(r, 0))
  putCurrentTime(inputValue.value)
}

const onSelectedFromHints = async (time: number) => {
  putCurrentTime(time)
}

const putCurrentTime = async (time: number) => {
  inputtingTimes.value.push(time)
  if (inputtingTimeIndex.value < rubberbands.value.length - 2) {
    temporaryHidden.value = true
    await nextTick()
    temporaryHidden.value = false
    startInput(inputtingTimeIndex.value + 1)
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

<style scoped>
.time-input-container {
  position: absolute;
  width: 100px;
  background-color: rgba(255, 255, 255, 0.7);
  box-shadow: 0px 0px 2px 1px black;
  border-radius: 4px;
}
</style>
