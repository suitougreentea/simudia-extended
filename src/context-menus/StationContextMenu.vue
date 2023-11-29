<template>
  <ContextMenu ref="menu">
    <v-list>
      <v-list-item :disabled="targetIds.length != 1" @click="gui.insertStationRelativeTo(targetIds[0], 0)">Insert station above</v-list-item>
      <v-list-item :disabled="targetIds.length != 1" @click="gui.insertStationRelativeTo(targetIds[0], 1)">Insert station below</v-list-item>
      <v-list-item @click="gui.deleteStations(targetIds)">Delete station</v-list-item>
    </v-list>
  </ContextMenu>
</template>

<script setup lang="ts">
import { ref } from "vue"
import ContextMenu from "../components/ContextMenu.vue"
import { useGuiStore } from "../stores/gui"

const gui = useGuiStore()

const targetIds = ref<number[]>([])
const menu = ref<InstanceType<typeof ContextMenu>>()
const open = ((ev: MouseEvent, stationIds: number[]) => {
  targetIds.value = stationIds
  menu.value?.openByEvent(ev)
})

defineExpose({
  open,
})
</script>

<style scoped>
</style>