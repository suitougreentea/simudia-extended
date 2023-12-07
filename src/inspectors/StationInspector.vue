<template>
  <template v-if="gui.isSingleStationSelected">
    <v-text-field label="Name" v-model="target[0].name"></v-text-field>
    <v-divider class="ma-3"></v-divider>
  </template>
  <template v-if="!gui.isSingleStationSelected">
    <template v-for="e in times">
      <div class="text-body-2">
        <span class="line-color" :style="{ 'background-color': e.lineColor }"></span>
        <span>{{ e.lineName }}</span>
      </div>
      <div class="text-body-2">
        <span class="journey-direction">{{ e.direction }}</span>
        <span>{{ e.haltNames }}</span>
      </div>
      <TimeInputControl class="mb-3" label="Journey time" omit-hour :model-value="e.time" @update:model-value="changeJourneyTime(e.lineIndex, e.haltIndex, $event)" :hints="e.hints"></TimeInputControl>
    </template>
    <v-divider class="ma-3"></v-divider>
  </template>
  <v-btn v-if="gui.isSingleStationSelected" @click="gui.insertStationRelativeTo(targetIds[0], 0)">Insert station above</v-btn>
  <v-btn v-if="gui.isSingleStationSelected" @click="gui.insertStationRelativeTo(targetIds[0], 1)">Insert station below</v-btn>
  <v-btn @click="gui.deleteStations(targetIds)">Delete station</v-btn>
</template>

<script setup lang="ts">
import TimeInputControl from "../components/TimeInputControl.vue"
import { computed } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"
const data = useMainStore()
const gui = useGuiStore()

const targetIds = computed(() => gui.resolvedSelectedStations.map(e => e.id))
const target = computed(() => targetIds.value.map(id => data.findStation(id)))

const times = computed(() => gui.getJourneyTimesAmong(gui.selectedStationIds).map(e => {
  const lineName = data.lines[e.lineIndex].name
  const lineColor = data.lines[e.lineIndex].color
  const fromIndex = data.findStationIndex(e.fromId)
  const toIndex = data.findStationIndex(e.toId)
  const direction = fromIndex < toIndex ? "↓" : fromIndex > toIndex ? "↑" : ""
  const fromName = data.findStation(e.fromId).name
  const toName = data.findStation(e.toId).name
  const hints = gui.getTimeHintsBetween(e.fromId, e.toId)
  return {
    lineName,
    lineColor,
    direction,
    haltNames: `${fromName} → ${toName}`,
    time: e.time,
    lineIndex: e.lineIndex,
    haltIndex: e.haltIndex,
    hints,
  }
}))

const changeJourneyTime = (lineIndex: number, haltIndex: number, newTime: number) => {
  data.lines[lineIndex].halts[haltIndex].time = newTime
}
</script>

<style scoped>
.line-color {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 8px;
}
.journey-direction {
  font-weight: bold;
  margin-right: 8px;
}
</style>