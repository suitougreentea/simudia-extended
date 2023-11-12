<template>
  <v-text-field label="Name" v-model="currentStation.name"></v-text-field>
  <v-divider class="ma-3"></v-divider>
  <v-btn @click="gui.insertStationAboveSelected(gui.stationSelection.selected)">Insert station above</v-btn>
  <v-btn @click="gui.insertStationBelowSelected(gui.stationSelection.selected)">Insert station below</v-btn>
  <v-btn @click="gui.deleteSelectedStation(gui.stationSelection.selected)">Delete station</v-btn>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGuiStore } from '../stores/gui'
import { useMainStore } from '../stores/main'

const store = useMainStore()
const gui = useGuiStore()

const currentStation = computed(() => { return store.stations[gui.stationSelection.selected] })
</script>

<style scoped>
</style>