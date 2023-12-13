<template>
  <div class="grid">
    <div v-if="times.length > 0" class="solid-border span-row"></div>
    <template v-for="(e, i) in times">
      <!-- row 1 -->
      <div class="station" @mouseenter="hoverHalt(e.haltIndex, 1)" @mouseleave="unhoverHalt(e.haltIndex, 1)" @click.prevent.stop="clickHalt(e.haltIndex, 1)">
        <div class="station-name">{{ e.stationName }}</div>
        <div v-if="e.scheduled" class="scheduled">Scheduled: {{ e.scheduledValue }}</div>
      </div>
      <div class="journey-time">
        <div v-if="i != times.length - 1" class="journey-time-body" @mouseenter="hoverHalt(e.haltIndex, 0)" @mouseleave="unhoverHalt(e.haltIndex, 0)" @click.prevent.stop="clickHalt(e.haltIndex, 0)">
          {{ TimeUtil.joinString(e.timeToNextStation, true) }}
        </div>
      </div>
      <div class="station-times">
        <template v-if="i == 0">
          <div class="arrival-time"></div>
          <div class="no-border"></div>
          <div class="departure-time">{{ TimeUtil.joinString(e.departureTime, false) }}</div>
        </template>
        <template v-else-if="i == times.length - 1">
          <div class="arrival-time">{{ TimeUtil.joinString(e.arrivalTime, false) }}</div>
          <div class="no-border"></div>
          <div class="departure-time"></div>
        </template>
        <template v-else>
          <div class="arrival-time">{{ TimeUtil.joinString(e.arrivalTime, false) }}</div>
          <div class="dash-border"></div>
          <div class="departure-time">{{ TimeUtil.joinString(e.departureTime, false) }}</div>
        </template>
      </div>
      <div class="solid-border span-row"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"
import * as TimeUtil from "../time-util"

const store = useMainStore()
const gui = useGuiStore()

const { lineIndex, setIndex } = defineProps<{
  lineIndex: number
  setIndex: number
}>()

const times = computed(() => {
  if (lineIndex == -1 || setIndex == -1) return []

  const result: {
    haltIndex: number
    stationName: string
    scheduled: boolean
    scheduledValue: number
    arrivalTime: number
    departureTime: number
    timeToNextStation: number
  }[] = []

  const monthLength = store.monthLength
  const shiftDivisor = store.shiftDivisor
  const line = store.lines[lineIndex]
  const halts = line.halts
  const haltTimes = store.computedTimes[lineIndex].haltTimes
  const offsetTime = setIndex * (store.monthLength / line.divisor)

  for (let i = 0; i < halts.length; i++) {
    const halt = halts[i]
    if (halt.skip) continue
    const station = store.findStation(halt.stationId)
    const stationName = station.name
    const scheduledValue = Math.round(((haltTimes[i].departure % monthLength) / monthLength) * shiftDivisor)
    const arrivalTime = (haltTimes[i].arrival + offsetTime) % monthLength
    const departureTime = (haltTimes[i].departure + offsetTime) % monthLength
    const timeToNextStation = haltTimes[i].journey
    const scheduled = haltTimes[i].scheduled
    result.push({
      haltIndex: i,
      stationName,
      scheduled,
      scheduledValue,
      arrivalTime,
      departureTime,
      timeToNextStation,
    })
  }
  if (result.length > 0) {
    result.push({ ...result[0] })
  }

  return result
})

const hoverHalt = (haltIndex: number, type: number) => {
  gui.hoverSegment(lineIndex, setIndex, haltIndex, type)
}
const unhoverHalt = (haltIndex: number, type: number) => {
  gui.unhoverSegment(lineIndex, setIndex, haltIndex, type)
}
const clickHalt = (haltIndex: number, type: number) => {
  gui.clickSegment(lineIndex, setIndex, haltIndex, type)
}
</script>

<style scoped>
.no-border {
  width: 100%;
  height: 0;
  border-top: 1px solid transparent;
}

.solid-border {
  width: 100%;
  height: 0;
  border-top: 1px solid black;
}

.dash-border {
  width: 100%;
  height: 0;
  border-top: 1px dashed black;
}

.grid {
  display: grid;
  grid-template-columns: 1fr auto auto;
  font-size: 90%;
}

.span-row {
  grid-column: 1 / 4;
}

.station {
  height: calc(2.6rem + 1px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.scheduled {
  font-size: 85%;
}

.journey-time {
  position: relative;
}

.journey-time-body {
  position: relative;
  top: 1.3rem;
  z-index: 1;
  background-color: white;

  height: calc(2.6rem + 1px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 4px;
  font-size: 85%;
}

.station,
.journey-time-body {
  cursor: pointer;
}

.station:hover,
.journey-time-body:hover {
  background-color: rgb(240, 240, 240);
}

.station-times {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.arrival-time,
.departure-time {
  height: 1.3rem;
  line-height: 1.3rem;
  padding-left: 4px;
  padding-right: 4px;
}
</style>
