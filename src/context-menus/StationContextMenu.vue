<template>
  <ContextMenu ref="menu">
    <v-list>
      <v-list-item @click="insertStationAbove">Insert station above</v-list-item>
      <v-list-item @click="insertStationBelow">Insert station below</v-list-item>
      <v-list-item @click="deleteStation">Delete station</v-list-item>
    </v-list>
  </ContextMenu>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ContextMenu from "../components/ContextMenu.vue"
import { useGuiStore } from "../stores/gui";

const gui = useGuiStore()

const selectedStationIndex = ref(-1)
const menu = ref<InstanceType<typeof ContextMenu>>()
const open = ((ev: MouseEvent, stationIndex: number) => {
  selectedStationIndex.value = stationIndex
  menu.value?.openByEvent(ev)
})

const insertStationAbove = () => {
  gui.insertStationAboveSelected(selectedStationIndex.value)
}
const insertStationBelow = () => {
  gui.insertStationBelowSelected(selectedStationIndex.value)
}
const deleteStation = () => {
  gui.deleteSelectedStation(selectedStationIndex.value)
}

defineExpose({
  open,
})
</script>

<style scoped>
</style>