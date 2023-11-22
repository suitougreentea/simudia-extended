<template>
  <div v-if="selectedLine != null" class="text-body-2 row">
    <v-spacer></v-spacer>
    <div>{{ selectedLine }}</div>
    <v-spacer></v-spacer>
  </div>
  <div v-if="selectedSet != null" class="text-body-2 row">
    <v-icon icon="mdi-chevron-left" @click="selectSet(-1)"></v-icon>
    <v-spacer></v-spacer>
    <div>{{ selectedSet }}</div>
    <v-spacer></v-spacer>
    <v-icon icon="mdi-chevron-right" @click="selectSet(1)"></v-icon>
  </div>
  <div v-if="selectedHalt != null" class="text-body-2 row">
    <v-icon icon="mdi-chevron-left" @click="selectHalt(-1)"></v-icon>
    <v-spacer></v-spacer>
    <div>{{ selectedHalt }}</div>
    <v-spacer></v-spacer>
    <v-icon icon="mdi-chevron-right" @click="selectHalt(1)"></v-icon>
  </div>
  <v-divider v-if="selectedLine != null" class="ma-3"></v-divider>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"

const data = useMainStore()
const gui = useGuiStore()

const selectedLine = computed(() => {
  if (gui.lineSelection.selectedLine == -1) return null
  const line = data.lines[gui.lineSelection.selectedLine]
  return line.name
})

const selectedSet = computed(() => {
  if (gui.lineSelection.selectedLine == -1) return null
  if (gui.lineSelection.selectedSet == -1) return null
  return `Set ${gui.lineSelection.selectedSet + 1}`
})

const selectedHalt = computed(() => {
  if (gui.lineSelection.selectedLine == -1) return null
  if (gui.lineSelection.selectedSet == -1) return null
  if (gui.lineSelection.selectedHalt == -1) return null
  if (gui.lineSelection.selectedType == 0) {
    const halts = data.lines[gui.lineSelection.selectedLine].halts
    const currentHalt = halts[gui.lineSelection.selectedHalt]
    const nextHalt = halts[(gui.lineSelection.selectedHalt + 1) % halts.length]
    const currentStationName = data.stations[data.findStationIndex(currentHalt.stationId)].name
    const nextStationName = data.stations[data.findStationIndex(nextHalt.stationId)].name
    return `${currentStationName} → ${nextStationName}`
  }
  if (gui.lineSelection.selectedType == 1) {
    const halt = data.lines[gui.lineSelection.selectedLine].halts[gui.lineSelection.selectedHalt]
    const stationName = data.stations[data.findStationIndex(halt.stationId)].name
    return stationName
  }
  return null
})

const selectSet = (delta: number) => {
  const line = data.lines[gui.lineSelection.selectedLine]
  gui.lineSelection.selectedSet = (gui.lineSelection.selectedSet + delta + line.divisor) % line.divisor
}

const selectHalt = (delta: number) => {
  const line = data.lines[gui.lineSelection.selectedLine]
  if (gui.lineSelection.selectedType == 0) { // journey (to next)
    if (delta == -1) {
      gui.lineSelection.selectedType = 1
    }
    if (delta == 1) {
      if (gui.lineSelection.selectedHalt == line.halts.length - 1) {
        selectSet(data.computedTimes[gui.lineSelection.selectedLine].setOffset)
      }
      gui.lineSelection.selectedType = 1
      gui.lineSelection.selectedHalt = (gui.lineSelection.selectedHalt + 1) % line.halts.length
    }
  } else if (gui.lineSelection.selectedType == 1) { // halt
    if (delta == -1) {
      if (gui.lineSelection.selectedHalt == 0) {
        selectSet(-data.computedTimes[gui.lineSelection.selectedLine].setOffset)
      }
      gui.lineSelection.selectedType = 0
      gui.lineSelection.selectedHalt = (gui.lineSelection.selectedHalt - 1 + line.halts.length) % line.halts.length
    }
    if (delta == 1) {
      gui.lineSelection.selectedType = 0
    }
  }
}

</script>

<style scoped>
.row {
  display: flex;
  align-items: flex-end;
}
</style>