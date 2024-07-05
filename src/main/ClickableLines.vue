<template>
  <template v-if="gui.mode == 'edit'">
    <template
      v-for="lineIndex in lineClickables.indices">
      <Line
        :data="gui.lineRenderData"
        appearance="clickable"
        :line="lineIndex"
        @mouseenter="hoverLine(lineIndex)"
        @mouseleave="unhoverLine(lineIndex)"
        @click.prevent.stop="selectLine(lineIndex)"
        @contextmenu.prevent.stop="contextLine($event, lineIndex)">
      </Line>
    </template>
    <template
      v-for="setIndex in setClickables.indices">
      <Line
        :data="gui.lineRenderData"
        appearance="clickable"
        :line="setClickables.lineIndex"
        :set="setIndex"
        @mouseenter="hoverSet(setIndex)"
        @mouseleave="unhoverSet(setIndex)"
        @click.prevent.stop="selectSet(setIndex)">
      </Line>
    </template>
    <template
      v-for="{ haltIndex, haltType } in haltClickables.indices">
      <Line
        :data="gui.lineRenderData"
        appearance="clickable"
        :line="haltClickables.lineIndex"
        :set="haltClickables.setIndex"
        :halt="haltIndex"
        :type="haltType"
        @mouseenter="hoverHalt(haltIndex, haltType)"
        @mouseleave="unhoverHalt(haltIndex, haltType)"
        @click.prevent.stop="selectHalt(haltIndex, haltType)"
        @contextmenu.prevent.stop="contextHalt($event, haltIndex, haltType)">
      </Line>
    </template>
  </template>
</template>

<script setup lang="ts">
import Line from "../components/Line.vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"
import { computed, inject } from "vue"
import { lineContextMenuInjection, lineSegmentContextMenuInjection } from "./injection"
const store = useMainStore()
const gui = useGuiStore()
const lineContextMenu = inject(lineContextMenuInjection)!
const lineSegmentContextMenu = inject(lineSegmentContextMenuInjection)!

const lineClickables = computed(() => {
  const indices: number[] = []
  store.lines.forEach((line, lineIndex) => {
    if (!line.visible) return
    if (lineIndex == gui.lineSelection.selectedLine) return
    indices.push(lineIndex)
  })
  return {
    indices,
  }
})

const setClickables = computed(() => {
  const lineIndex = gui.lineSelection.selectedLine
  const line = store.lines[lineIndex]
  if (line == null || !line.visible) {
    return {
      lineIndex: undefined,
      indices: [],
    }
  }

  const indices: number[] = []
  for (let i = 0; i < line.divisor; i++) {
    if (i == gui.lineSelection.selectedSet) continue
    indices.push(i)
  }
  return {
    lineIndex,
    indices,
  }
})

const haltClickables = computed(() => {
  const lineIndex = gui.lineSelection.selectedLine
  const setIndex = gui.lineSelection.selectedSet
  const line = store.lines[lineIndex]
  if (line == null || !line.visible || setIndex < 0 || setIndex >= line.divisor) {
    return {
      lineIndex: undefined,
      setIndex: undefined,
      indices: [],
    }
  }

  const journeyIndices: { haltIndex: number, haltType: number }[] = []
  const haltIndices: { haltIndex: number, haltType: number }[] = []
  for (let i = 0; i < line.halts.length; i++) {
    // no need to skip selected ones
    journeyIndices.push({ haltIndex: i, haltType: 0 })
    haltIndices.push({ haltIndex: i, haltType: 1 })
  }
  return {
    lineIndex,
    setIndex,
    indices: [...journeyIndices, ...haltIndices],
  }
})

const hoverLine = (lineIndex: number) => {
  gui.hoverLine(lineIndex)
}
const unhoverLine = (lineIndex: number) => {
  gui.unhoverLine(lineIndex)
}
const selectLine = (lineIndex: number) => {
  gui.clickLine(lineIndex)
}
const contextLine = (ev: MouseEvent, lineIndex: number) => {
  gui.resetInput() // needed by Sidebar
  lineContextMenu!.value.open(ev, lineIndex)
}

const hoverSet = (setIndex: number) => {
  gui.hoverSet(gui.lineSelection.selectedLine, setIndex)
}
const unhoverSet = (setIndex: number) => {
  gui.unhoverSet(gui.lineSelection.selectedLine, setIndex)
}
const selectSet = (setIndex: number) => {
  gui.clickSet(gui.lineSelection.selectedLine, setIndex)
}

const hoverHalt = (haltIndex: number, haltType: number) => {
  gui.hoverSegment(gui.lineSelection.selectedLine, gui.lineSelection.selectedSet, haltIndex, haltType)
}
const unhoverHalt = (haltIndex: number, haltType: number) => {
  gui.unhoverSegment(gui.lineSelection.selectedLine, gui.lineSelection.selectedSet, haltIndex, haltType)
}
const selectHalt = (haltIndex: number, haltType: number) => {
  gui.clickSegment(gui.lineSelection.selectedLine, gui.lineSelection.selectedSet, haltIndex, haltType)
}
const contextHalt = (ev: MouseEvent, haltIndex: number, haltType: number) => {
  if (haltType === 1) {
    lineSegmentContextMenu!.value.open(ev, haltIndex)
  }
}
</script>

<style scoped>
</style>