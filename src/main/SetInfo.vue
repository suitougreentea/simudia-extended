<template>
  <TimeTable :line-index="gui.lineSelection.selectedLine" :set-index="gui.lineSelection.selectedSet"></TimeTable>
</template>

<script setup lang="ts">
import TimeTable from "./TimeTable.vue"
import { useGuiStore } from "../stores/gui"

const gui = useGuiStore()
</script>

<style scoped>
</style>