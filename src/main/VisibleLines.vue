<template>
  <Line
    v-for="lineIndex in lineList.indices"
    :data="gui.lineRenderData"
    appearance="normal"
    :line="lineIndex">
  </Line>
  <Line
    :data="gui.lineRenderData"
    appearance="selected"
    :line="selection.lineIndex"
    :set="selection.setIndex"
    :halt="selection.haltIndex"
    :type="selection.type">
  </Line>
  <Line
    :data="gui.lineRenderData"
    appearance="hovered"
    :line="hovered.lineIndex"
    :set="hovered.setIndex"
    :halt="hovered.haltIndex"
    :type="hovered.type">
  </Line>
</template>

<script setup lang="ts">
import Line from "../components/Line.vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"
import { computed } from "vue";
const store = useMainStore()
const gui = useGuiStore()

const lineList = computed(() => {
  const indices: number[] = []
  store.lines.forEach((line, lineIndex) => {
    if (!line.visible) return
    indices.push(lineIndex)
  })
  return {
    indices,
  }
})

const selection = computed(() => {
  const lineIndex = gui.lineSelection.selectedLine
  const setIndex = gui.lineSelection.selectedSet
  const haltIndex = gui.lineSelection.selectedHalt
  const type = gui.lineSelection.selectedType

  const line = store.lines[lineIndex]
  if (line == null || !line.visible) {
    return {
      lineIndex: undefined,
      setIndex: undefined,
      haltIndex: undefined,
      type: undefined,
    }
  }

  if (setIndex == -1) {
    return {
      lineIndex,
      setIndex: undefined,
      haltIndex: undefined,
      type: undefined,
    }
  } else if (haltIndex == -1) {
    return {
      lineIndex,
      setIndex,
      haltIndex: undefined,
      type: undefined,
    }
  } else {
    return {
      lineIndex,
      setIndex,
      haltIndex,
      type,
    }
  }
})

const hovered = computed(() => {
  const lineIndex = gui.lineSelection.hoveredLine
  const setIndex = gui.lineSelection.hoveredSet
  const haltIndex = gui.lineSelection.hoveredHalt
  const type = gui.lineSelection.hoveredType

  const line = store.lines[lineIndex]
  if (line == null || !line.visible) {
    return {
      lineIndex: undefined,
      setIndex: undefined,
      haltIndex: undefined,
      type: undefined,
    }
  }

  if (setIndex == -1) {
    return {
      lineIndex,
      setIndex: undefined,
      haltIndex: undefined,
      type: undefined,
    }
  } else if (haltIndex == -1) {
    return {
      lineIndex,
      setIndex,
      haltIndex: undefined,
      type: undefined,
    }
  } else {
    return {
      lineIndex,
      setIndex,
      haltIndex,
      type,
    }
  }
})
</script>

<style scoped>
</style>