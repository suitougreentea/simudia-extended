<template>
  <TimeTable :data="timeTableData"></TimeTable>
</template>

<script setup lang="ts">
import TimeTable, { type Data as TimeTableData } from "./TimeTable.vue"
import { computed } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"

const store = useMainStore()
const gui = useGuiStore()

const timeTableData = computed(() => {
  const times: TimeTableData["times"] = []

  const monthLength = store.monthLength
  const shiftDivisor = store.shiftDivisor
  const line = store.lines[gui.lineSelection.selectedLine]
  const halts = line.halts
  const haltTimes = store.computedTimes[gui.lineSelection.selectedLine].haltTimes

  for (let i = 0; i < halts.length; i++) {
    const halt = halts[i]
    if (halt.skip) continue
    const station = store.findStation(halt.stationId)
    const stationName = station.name
    const scheduledValue = Math.round((haltTimes[i].departure % monthLength) / monthLength * shiftDivisor)
    const arrivalTime = haltTimes[i].arrival
    const departureTime = haltTimes[i].departure
    const timeToNextStation = haltTimes[i].journey
    const scheduled = haltTimes[i].scheduled
    times.push({
      haltIndex: i,
      stationName,
      scheduled,
      scheduledValue,
      arrivalTime,
      departureTime,
      timeToNextStation,
    })
  }
  if (times.length > 0) {
    times.push({ ...times[0] })
  }

  return {
    lineIndex: gui.lineSelection.selectedLine,
    setIndex: 0,
    times,
  } satisfies TimeTableData
})
</script>

<style scoped>
</style>