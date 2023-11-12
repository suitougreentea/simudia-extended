<template>
  <v-checkbox-btn label="Visible" v-model="currentLine.visible"></v-checkbox-btn>
  <v-text-field label="Name" v-model="currentLine.name"></v-text-field>
  <NumberInputControl label="Departures/month" v-model="currentLine.divisor" integer :min="1" :max="65535"></NumberInputControl>
  <NumberInputControl label="Line width" v-model="currentLine.lineWidth" :min="1"></NumberInputControl>
  <ColorInputControl label="Color" v-model="currentLine.color"></ColorInputControl>
  <TimeInputControl label="Default loading time" omit-hour v-model="currentLine.defaultLoadingTime"></TimeInputControl>
  <TimeInputControl label="Reversing time" omit-hour v-model="currentLine.reversingTime"></TimeInputControl>
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

const currentLine = computed(() => { return store.lines[gui.lineSelection.selectedLine] })

const changeLine = (key, value) => {
  store.modifyLine({ index: gui.lineSelection.selectedLine, key, value })
}
</script>

<style scoped>
</style>