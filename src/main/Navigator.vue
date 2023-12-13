<template>
  <div v-for="selectedStation in selectedStations" v-if="selectedStations.length > 1" class="text-body-2 row">
    <v-spacer></v-spacer>
    <div>{{ selectedStation }}</div>
    <v-spacer></v-spacer>
  </div>
  <div v-if="selectedStations.length == 1" class="text-body-2 row">
    <v-icon icon="mdi-chevron-left" @click="selectStation(-1)"></v-icon>
    <v-spacer></v-spacer>
    <div>{{ selectedStations[0] }}</div>
    <v-spacer></v-spacer>
    <v-icon icon="mdi-chevron-right" @click="selectStation(1)"></v-icon>
  </div>
  <div v-if="selectedLine != null" class="text-body-2 row">
    <v-spacer></v-spacer>
    <div class="clickable" @click="selectLineAbsolute(selectedLine.index)">{{ selectedLine.name }}</div>
    <v-spacer></v-spacer>
  </div>
  <div v-if="selectedSet != null" class="text-body-2 row">
    <v-icon icon="mdi-chevron-left" @click="selectSet(-1)"></v-icon>
    <v-spacer></v-spacer>
    <div class="clickable" @click="selectSetAbsolute(selectedSet.index)">{{ selectedSet.name }}</div>
    <v-spacer></v-spacer>
    <v-icon icon="mdi-chevron-right" @click="selectSet(1)"></v-icon>
  </div>
  <div v-if="selectedHalt != null" class="text-body-2 row">
    <v-icon icon="mdi-chevron-left" @click="selectHalt(-1)"></v-icon>
    <v-spacer></v-spacer>
    <div>{{ selectedHalt.name }}</div>
    <v-spacer></v-spacer>
    <v-icon icon="mdi-chevron-right" @click="selectHalt(1)"></v-icon>
  </div>
  <v-divider v-if="selectedStations.length > 0 || selectedLine != null" class="ma-3"></v-divider>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"

const data = useMainStore()
const gui = useGuiStore()

const selectedStations = computed(() => gui.resolvedSelectedStations.map((e) => e.name))

const selectedLine = computed(() => {
  if (gui.lineSelection.selectedLine == -1) return null
  const line = data.lines[gui.lineSelection.selectedLine]
  return {
    index: gui.lineSelection.selectedLine,
    name: line.name,
  }
})

const selectedSet = computed(() => {
  if (gui.lineSelection.selectedLine == -1) return null
  if (gui.lineSelection.selectedSet == -1) return null
  return {
    index: gui.lineSelection.selectedSet,
    name: `Set ${gui.lineSelection.selectedSet + 1}`,
  }
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
    return {
      fromIndex: gui.lineSelection.selectedHalt,
      toIndex: (gui.lineSelection.selectedHalt + 1) % halts.length,
      name: `${currentStationName} → ${nextStationName}`,
    }
  }
  if (gui.lineSelection.selectedType == 1) {
    const halt = data.lines[gui.lineSelection.selectedLine].halts[gui.lineSelection.selectedHalt]
    const stationName = data.stations[data.findStationIndex(halt.stationId)].name
    return {
      index: gui.lineSelection.selectedHalt,
      name: stationName,
    }
  }
  return null
})

const selectStation = (delta: number) => {
  if (gui.isSingleStationSelected) {
    gui.selectStationRelativeTo(gui.resolvedSelectedStations[0].id, delta)
  }
}

const selectLineAbsolute = (index: number) => {
  gui.lineSelection.selectedLine = index
  gui.lineSelection.selectedSet = -1
  gui.lineSelection.selectedHalt = -1
  gui.lineSelection.selectedType = -1
}

const selectSet = (delta: number) => {
  const line = data.lines[gui.lineSelection.selectedLine]
  gui.lineSelection.selectedSet = (gui.lineSelection.selectedSet + delta + line.divisor) % line.divisor
}

const selectSetAbsolute = (index: number) => {
  gui.lineSelection.selectedSet = index
  gui.lineSelection.selectedHalt = -1
  gui.lineSelection.selectedType = -1
}

const selectHalt = (delta: number) => {
  const line = data.lines[gui.lineSelection.selectedLine]
  if (gui.lineSelection.selectedType == 0) {
    // journey (to next)
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
  } else if (gui.lineSelection.selectedType == 1) {
    // halt
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

.clickable {
  cursor: pointer;
}
</style>
