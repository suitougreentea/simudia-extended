<template>
  <v-list>
    <v-list-item density="compact" v-for="(line, lineIndex) in store.lines"
      :class="{ 'hovered-line': gui.lineSelection.hoveredLine == lineIndex }" 
      @mouseenter="gui.hoverLine(lineIndex)" @mouseleave="gui.unhoverLine(lineIndex)" @click.stop="clickLine($event, lineIndex)" @contextmenu.prevent.stop="contextLine($event, lineIndex)">
      <template v-slot:prepend>
        <v-list-item-action start>
          <v-checkbox-btn v-model="line.visible" :color="line.color"></v-checkbox-btn>
        </v-list-item-action>
      </template>
      <v-list-item-title>{{ line.name }}</v-list-item-title>
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">
import { inject } from "vue"
import { useGuiStore } from "../stores/gui"
import { useMainStore } from "../stores/main"
import { lineContextMenuInjection } from "./injection"

const store = useMainStore()
const gui = useGuiStore()

const lineContextMenu = inject(lineContextMenuInjection)

const clickLine = (event: KeyboardEvent | MouseEvent, index: number) => {
  if ((event.target as Element).nodeName != "INPUT") {
    event.preventDefault()
    gui.clickLine(index)
  }
}

const contextLine = (ev: MouseEvent, lineIndex: number) => {
  gui.resetInput() // needed by Sidebar
  lineContextMenu.value.open(ev, lineIndex)
}
</script>

<style scoped>
.hovered-line {
  background-color: #EEE;
}
</style>