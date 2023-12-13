<template>
  <v-checkbox-btn v-model="currentLine.visible" label="Visible"></v-checkbox-btn>
  <v-text-field v-model="currentLine.name" label="Name"></v-text-field>
  <NumberInputControl v-model="currentLine.divisor" label="Departures/month" integer :min="1" :max="65535"></NumberInputControl>
  <NumberInputControl v-model="currentLine.lineWidth" label="Line width" :min="1"></NumberInputControl>
  <ColorInputControl v-model="currentLine.color" label="Color"></ColorInputControl>
  <TimeInputControl v-model="currentLine.defaultLoadingTime" label="Default loading time" omit-hour></TimeInputControl>
  <TimeInputControl v-model="currentLine.reversingTime" label="Reversing time" omit-hour></TimeInputControl>
  <v-divider class="ma-3"></v-divider>
  <v-btn @click="gui.copySelectedLine(gui.lineSelection.selectedLine)">Copy line</v-btn>
  <v-btn @click="gui.deleteSelectedLine(gui.lineSelection.selectedLine)">Delete line</v-btn>
</template>

<script setup lang="ts">
import { computed } from "vue"
import TimeInputControl from "../components/TimeInputControl.vue"
import NumberInputControl from "../components/NumberInputControl.vue"
import ColorInputControl from "../components/ColorInputControl.vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"

const store = useMainStore()
const gui = useGuiStore()

const currentLine = computed(() => {
  return store.lines[gui.lineSelection.selectedLine]
})

const changeLine = (key, value) => {
  store.modifyLine({ index: gui.lineSelection.selectedLine, key, value })
}
</script>

<style scoped></style>
