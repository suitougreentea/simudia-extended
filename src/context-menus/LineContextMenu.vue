<template>
  <ContextMenu ref="menu">
    <v-list>
      <v-list-item @click="copyLine">Copy line</v-list-item>
      <v-list-item @click="deleteLine">Delete line</v-list-item>
    </v-list>
  </ContextMenu>
</template>

<script setup lang="ts">
import { ref } from "vue"
import ContextMenu from "../components/ContextMenu.vue"
import { useGuiStore } from "../stores/gui"

const gui = useGuiStore()

const selectedLineIndex = ref(-1)
const menu = ref<InstanceType<typeof ContextMenu>>()
const open = (ev: MouseEvent, lineIndex: number) => {
  selectedLineIndex.value = lineIndex
  menu.value?.openByEvent(ev)
}

const copyLine = () => {
  gui.copySelectedLine(selectedLineIndex.value)
}
const deleteLine = () => {
  gui.deleteSelectedLine(selectedLineIndex.value)
}

defineExpose({
  open,
})
</script>

<style scoped></style>
