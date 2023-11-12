<template>
  <ContextMenu ref="menu">
    <v-list>
      <v-list-item @click="insertHalt">Insert halt</v-list-item>
      <v-list-item @click="deleteHalt" :disabled="!deleteHaltEnabled">Delete halt</v-list-item>
    </v-list>
  </ContextMenu>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import ContextMenu from "../components/ContextMenu.vue"
import { useGuiStore } from "../stores/gui";
import { useMainStore } from "../stores/main";

const store = useMainStore()
const gui = useGuiStore()

const selectedHaltIndex = ref(-1)
const menu = ref<InstanceType<typeof ContextMenu>>()
const open = ((ev: MouseEvent, haltIndex: number) => {
  selectedHaltIndex.value = haltIndex
  menu.value?.openByEvent(ev)
})

const deleteHaltEnabled = computed(() => gui.lineSelection.selectedLine >= 0 && store.lines[gui.lineSelection.selectedLine].halts.length >= 3)

const insertHalt = () => {
  gui.insertHaltToSelectedLine(selectedHaltIndex.value)
}
const deleteHalt = () => {
  gui.deleteHaltFromSelectedLine(selectedHaltIndex.value)
}

defineExpose({
  open,
})
</script>

<style scoped>
</style>