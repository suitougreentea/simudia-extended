<template>
  <v-checkbox-btn v-model="currentHalt.skip" label="Skip"></v-checkbox-btn>
  <template v-if="!currentHalt.skip">
    <v-checkbox-btn v-model="currentHalt.wait" label="Wait"></v-checkbox-btn>
    <TimeInputControl v-model="currentHalt.waitTime" label="Wait time" omit-hour :disabled="!currentHalt.wait"></TimeInputControl>
    <v-checkbox-btn v-model="currentHalt.reverse" label="Reverse"></v-checkbox-btn>
    <v-checkbox-btn v-model="currentHalt.overrideLoadingTime" label="Override loading"></v-checkbox-btn>
    <TimeInputControl v-model="currentHalt.loadingTime" label="Loading time" omit-hour :disabled="!currentHalt.overrideLoadingTime"></TimeInputControl>
    <v-checkbox-btn v-model="currentHalt.scheduled" label="Schedule departure"></v-checkbox-btn>
    <TimeInputControl v-model="currentHalt.departureTime" label="Departure time" :disabled="!currentHalt.scheduled"></TimeInputControl>
    <NumberInputControl
      label="Departure time (Shift)"
      :disabled="!currentHalt.scheduled"
      :model-value="departureTimeShift(currentHalt.departureTime)"
      @update:model-value="currentHalt.departureTime = shiftToTime($event)"
    ></NumberInputControl>
  </template>
  <v-divider class="ma-3"></v-divider>
  <v-btn @click="gui.insertHaltToSelectedLine(gui.lineSelection.selectedHalt)">Insert halt</v-btn>
  <v-btn :disabled="store.lines[gui.lineSelection.selectedLine].halts.length < 3" @click="gui.deleteHaltFromSelectedLine(gui.lineSelection.selectedHalt)">Delete halt</v-btn>
</template>

<script setup lang="ts">
import { computed } from "vue"
import TimeInputControl from "../components/TimeInputControl.vue"
import NumberInputControl from "../components/NumberInputControl.vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"

const store = useMainStore()
const gui = useGuiStore()

const currentHalt = computed(() => {
  return store.lines[gui.lineSelection.selectedLine].halts[gui.lineSelection.selectedHalt]
})

const stationName = computed(() => {
  return store.stations[store.findStationIndex(currentHalt.value.stationId)].name
})

const changeHalt = (key, value) => {
  store.modifyLineHalt({ lineIndex: gui.lineSelection.selectedLine, haltIndex: gui.lineSelection.selectedHalt, key, value })
}

const departureTimeShift = (time) => {
  const monthLength = store.monthLength
  const shiftDivisor = store.shiftDivisor
  return Math.round(((time % monthLength) / monthLength) * shiftDivisor)
}

const shiftToTime = (shift) => {
  const monthLength = store.monthLength
  const shiftDivisor = store.shiftDivisor
  return (shift / shiftDivisor) * monthLength
}
</script>

<style scoped></style>
