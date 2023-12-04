<template>
  <v-checkbox-btn label="Skip" v-model="currentHalt.skip"></v-checkbox-btn>
  <template v-if="!currentHalt.skip">
    <TimeInputControl label="Journey time" omit-hour v-model="currentHalt.time" :hints="hints"></TimeInputControl>
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

const hints = gui.getTimeHintsBetween(currentHalt.value.stationId, nextHalt.value.stationId)

</script>

<style scoped>
</style>