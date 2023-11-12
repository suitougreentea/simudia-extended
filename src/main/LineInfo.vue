<template>
  <div v-for="line in lineInfoString">{{ line }}</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"
import * as TimeUtil from "../time-util"

const store = useMainStore()
const gui = useGuiStore()

const lineInfoString = computed(() => {
  const result = []
  const monthLength = store.monthLength
  const shiftDivisor = store.shiftDivisor
  const line = store.lines[gui.lineSelection.selectedLine]
  const halts = line.halts
  const times = store.computedTimes[gui.lineSelection.selectedLine]
  for (let i = 0; i < halts.length; i++) {
    const halt = halts[i]
    const station = store.findStation(halt.stationId)
    if (i !== 0) result.push(TimeUtil.joinString(times[i].arrival, false))
    const scheduleInfo = times[i].scheduled ? "Scheduled: " + Math.round((times[i].departure % monthLength) / monthLength * shiftDivisor) : ""
    result.push(`[${station.name}] ${scheduleInfo}`)
    result.push(TimeUtil.joinString(times[i].departure, false))
    result.push("↓ " + TimeUtil.joinString(halt.time))
  }
  const firstHalt = halts[0]
  const firstStation = store.findStation(firstHalt.stationId)
  result.push(TimeUtil.joinString(times[0].arrival, false))
  result.push(`[${firstStation.name}]`)
  return result
})
</script>

<style scoped>
</style>