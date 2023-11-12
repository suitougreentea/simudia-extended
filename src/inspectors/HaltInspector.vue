<template>
  <p>Stops at: {{ stationName }}</p>
  <v-divider class="ma-3"></v-divider>
  <v-checkbox-btn label="Skip" v-model="currentHalt.skip"></v-checkbox-btn>
  <template v-if="!currentHalt.skip">
    <v-checkbox-btn label="Wait" v-model="currentHalt.wait"></v-checkbox-btn>
    <TimeInputControl label="Wait time" omit-hour :disabled="!currentHalt.wait" v-model="currentHalt.waitTime"></TimeInputControl>
    <v-checkbox-btn label="Reverse" v-model="currentHalt.reverse"></v-checkbox-btn>
    <v-checkbox-btn label="Override loading" v-model="currentHalt.overrideLoadingTime"></v-checkbox-btn>
    <TimeInputControl label="Loading time" omit-hour :disabled="!currentHalt.overrideLoadingTime" v-model="currentHalt.loadingTime"></TimeInputControl>
    <v-checkbox-btn label="Schedule departure" v-model="currentHalt.scheduled"></v-checkbox-btn>
    <TimeInputControl label="Departure time" :disabled="!currentHalt.scheduled" v-model="currentHalt.departureTime"
      :hint="'Shift: ' + departureTimeShift(currentHalt.departureTime)" persistent-hint></TimeInputControl>
  </template>
  <v-divider class="ma-3"></v-divider>
  <v-btn @click="gui.insertHaltToSelectedLine(gui.lineSelection.selectedHalt)">Insert halt</v-btn>
  <v-btn @click="gui.deleteHaltFromSelectedLine(gui.lineSelection.selectedHalt)" :disabled="store.lines[gui.lineSelection.selectedLine].halts.length < 3">Delete halt</v-btn>
</template>

<script setup lang="ts">
import { computed } from "vue"
import TimeInputControl from "../components/TimeInputControl.vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"

const store = useMainStore()
const gui = useGuiStore()

const currentHalt = computed(() => { return store.lines[gui.lineSelection.selectedLine].halts[gui.lineSelection.selectedHalt] })

const stationName = computed(() => {
  return store.stations[store.findStationIndex(currentHalt.value.stationId)].name
})

const changeHalt = (key, value) => {
  store.modifyLineHalt({ lineIndex: gui.lineSelection.selectedLine, haltIndex: gui.lineSelection.selectedHalt, key, value })
}

const departureTimeShift = (time) => {
  const monthLength = store.monthLength
  const shiftDivisor = store.shiftDivisor
  return Math.round((time % monthLength) / monthLength * shiftDivisor)
}

const shiftToTime = (shift) => {
  const monthLength = store.monthLength
  const shiftDivisor = store.shiftDivisor
  return shift / shiftDivisor * monthLength
}
</script>

<style scoped>
</style>