<template>
  <v-checkbox-btn label="Skip" v-model="currentHalt.skip"></v-checkbox-btn>
  <template v-if="!currentHalt.skip">
    <TimeInputControl label="Journey time" omit-hour v-model="currentHalt.time"></TimeInputControl>
  </template>
</template>

<script setup lang="ts">
import { computed } from "vue"
import TimeInputControl from "../components/TimeInputControl.vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"

const store = useMainStore()
const gui = useGuiStore()

const currentHalt = computed(() => { return store.lines[gui.lineSelection.selectedLine].halts[gui.lineSelection.selectedHalt] })
const nextHalt = computed(() => {
  const halts = store.lines[gui.lineSelection.selectedLine].halts
  return halts[(gui.lineSelection.selectedHalt+1) % halts.length]
})

const stationName = computed(() => {
  return store.stations[store.findStationIndex(currentHalt.value.stationId)].name
})
const nextStationName = computed(() => {
  return store.stations[store.findStationIndex(nextHalt.value.stationId)].name
})

const changeHalt = (key, value) => {
  store.modifyLineHalt({ lineIndex: gui.lineSelection.selectedLine, haltIndex: gui.lineSelection.selectedHalt, key, value })
}
</script>

<style scoped>
</style>