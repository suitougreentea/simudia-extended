<template>
  <div class="grid">
    <div v-if="data.times.length > 0" class="solid-border span-row"></div>
    <template v-for="(e, i) in data.times">
      <!-- row 1 -->
      <div class="station"
        @mouseenter="hoverHalt(e.haltIndex, 1)" @mouseleave="unhoverHalt(e.haltIndex, 1)" @click.prevent.stop="clickHalt(e.haltIndex, 1)">
        <div class="station-name">{{ e.stationName }}</div>
        <div v-if="e.scheduled" class="scheduled">Scheduled: {{ e.scheduledValue }}</div>
      </div>
      <div class="journey-time">
        <div class="journey-time-body" v-if="i != data.times.length - 1"
          @mouseenter="hoverHalt(e.haltIndex, 0)" @mouseleave="unhoverHalt(e.haltIndex, 0)" @click.prevent.stop="clickHalt(e.haltIndex, 0)">
          {{ TimeUtil.joinString(e.timeToNextStation, true) }}
        </div>
      </div>
      <div class="station-times">
        <template v-if="i == 0">
          <div class="arrival-time"></div>
          <div class="no-border"></div>
          <div class="departure-time">{{ TimeUtil.joinString(e.departureTime, false) }}</div>
        </template>
        <template v-else-if="i == data.times.length">
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
import { useGuiStore } from "../stores/gui"
import * as TimeUtil from "../time-util"

export type Data = {
  lineIndex: number
  setIndex: number
  times: {
    haltIndex: number,
    stationName: string
    scheduled: boolean
    scheduledValue: number
    arrivalTime: number
    departureTime: number
    timeToNextStation: number
  }[]
}

const gui = useGuiStore()

const { data } = defineProps<{
  data: Data
}>()

const hoverHalt = (haltIndex: number, type: number) => {
  gui.hoverSegment(data.lineIndex, data.setIndex, haltIndex, type)
}
const unhoverHalt = (haltIndex: number, type: number) => {
  gui.unhoverSegment(data.lineIndex, data.setIndex, haltIndex, type)
}
const clickHalt = (haltIndex: number, type: number) => {
  gui.clickSegment(data.lineIndex, data.setIndex, haltIndex, type)
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

.station, .journey-time-body {
  cursor: pointer;
}

.station:hover, .journey-time-body:hover {
  background-color: rgb(240, 240, 240);
}

.station-times {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.arrival-time, .departure-time {
  height: 1.3rem;
  line-height: 1.3rem;
  padding-left: 4px;
  padding-right: 4px;
}
</style>