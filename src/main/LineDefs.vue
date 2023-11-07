<template>  
  <defs>
    <symbol id="lines">
      <polyline v-for="path in linePaths" :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width" :stroke-dasharray="path.dashArray"></polyline>
      <polyline v-for="path in hoveredLinePaths" :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width + 1" :stroke-dasharray="path.dashArray"></polyline>
      <g v-if="gui.lineSelection.selectedSet == -1">
        <polyline class="selected-line" v-for="path in selectedLinePaths" :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width" :stroke-dasharray="path.dashArray"></polyline>
      </g>
      <polyline v-for="path in hoveredSetPaths" :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width + 1" :stroke-dasharray="path.dashArray"></polyline>
      <g v-if="gui.lineSelection.selectedHalt == -1">
        <polyline class="selected-line" v-for="path in selectedSetPaths" :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width" :stroke-dasharray="path.dashArray"></polyline>
      </g>
      <line v-for="seg in hoveredHaltSegments" :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2" :stroke="seg.color" :stroke-width="seg.width + 1" :stroke-dasharray="seg.dashArray"></line>
      <line class="selected-line" v-for="seg in selectedHaltSegments" :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2" :stroke="seg.color" :stroke-width="seg.width + 1" :stroke-dasharray="seg.dashArray"></line>
    </symbol>
    <symbol id="lines-hover">
      <g v-if="gui.mode == 'edit'">
        <g v-for="path in linePaths">
          <polyline v-if="path.lineIndex != gui.lineSelection.selectedLine" :points="path.d" fill="transparent" stroke="transparent" stroke-width="10" @mouseenter="gui.hoverLine(path.lineIndex)" @mouseleave="gui.unhoverLine(path.lineIndex)" @click.prevent.stop="gui.clickLine(path.lineIndex)" @contextmenu.prevent.stop="gui.contextLine(path.lineIndex)" style="pointer-events: visibleStroke"></polyline>
        </g>
        <g v-for="path in selectedLinePaths">
          <polyline v-if="path.setIndex != gui.lineSelection.selectedSet" :points="path.d" fill="transparent" stroke="transparent" stroke-width="10" @mouseenter="gui.hoverSet(path.setIndex)" @mouseleave="gui.unhoverSet(path.setIndex)" @click.prevent.stop="gui.clickSet(path.setIndex)" style="pointer-events: visibleStroke"></polyline>
        </g>
        <g v-for="(t, type) in currentHaltSegments">
          <g v-for="seg in t">
            <line :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2" stroke="transparent" stroke-width="10" @mouseenter="gui.hoverSegment(seg.haltIndex, type)" @mouseleave="gui.unhoverSegment(seg.haltIndex, type)" @click.prevent.stop="gui.clickSegment(seg.haltIndex, type)" @contextmenu.prevent.stop="gui.contextSegment(seg.haltIndex, type)" style="pointer-events: visibleStroke"></line>
          </g>
        </g>
      </g>
    </symbol>
  </defs>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui";

const store = useMainStore()
const gui = useGuiStore()

const segmentToPaths = (segments) => {
  const result = []
  let current = []
  let i = 0
  for (; i < segments.length; i++) {
    if (i >= 1 && (segments[i-1].x2 !== segments[i].x1 || segments[i-1].dashed !== segments[i].dashed)) {
      current.push(`${segments[i-1].x2},${segments[i-1].y2}`)
      result.push({ d: current, dashed: segments[i-1].dashed })
      current = []
    }
    current.push(`${segments[i].x1},${segments[i].y1}`)
  }
  current.push(`${segments[i-1].x2},${segments[i-1].y2}`)
  result.push({ d: current, dashed: segments[i-1].dashed })
  return result
}

const lineSegments = computed(() => {
  // line, set, segment
  const lines = store.lines
  const computedTimes = store.computedTimes

  const pushSegment = (array, segment) => {
    const monthLength = store.monthLength
    if (segment.t1 >= monthLength) {
      pushSegment(array, { ...segment, t1: segment.t1 - monthLength, t2: segment.t2 - monthLength })
    } else if (segment.t2 > monthLength) {
      const intermediateY = segment.y1 + (segment.y2 - segment.y1) * (monthLength - segment.t1) / (segment.t2 - segment.t1)
      pushSegment(array, { ...segment, t1: segment.t1, t2: monthLength, y2: intermediateY })
      pushSegment(array, { ...segment, t1: 0, t2: segment.t2 - monthLength, y1: intermediateY })
    } else {
      array.push({
        x1: gui.x(segment.t1),
        x2: gui.x(segment.t2),
        y1: segment.y1, y2: segment.y2,
        haltIndex: segment.haltIndex, type: segment.type, dashed: segment.dashed
      })
    }
  }

  return lines.map((line, i) => {
    const time = computedTimes[i]
    const sets = []
    const length = line.halts.length
    for (let set = 0; set < line.divisor; set++) {
      sets[set] = []
      const offsetTime = set * (store.monthLength / line.divisor)
      for (let j = 0; j < length; j++) {
        const currHalt = line.halts[j]
        const nextHalt = line.halts[(j+1) % length]
        const currStationIndex = store.findStationIndex(currHalt.stationId)
        const nextStationIndex = store.findStationIndex(nextHalt.stationId)
        const currY = gui.accumulatedStationY[currStationIndex]
        const nextY = gui.accumulatedStationY[nextStationIndex]
        const currTime = time[j]
        const nextTime = time[(j+1) % length]
        const currDepTime = currTime.departure + offsetTime
        const nextArrTime = nextTime.arrival + offsetTime
        const nextDepTime = nextTime.arrival + nextTime.wait + offsetTime
        pushSegment(sets[set], {
          t1: currDepTime, y1: currY, t2: nextArrTime, y2: nextY,
          haltIndex: j, type: 0, dashed: currHalt.skip
        })
        pushSegment(sets[set], {
          t1: nextArrTime, y1: nextY, t2: nextDepTime, y2: nextY,
          haltIndex: (j+1)%length, type: 1, dashed: nextHalt.skip
        })
      }
    }
    return { visible: line.visible, width: line.lineWidth, color: line.color, sets }
  })
})

const linePaths = computed(() => {
  const segments = lineSegments.value
  const result = []
  segments.forEach((line, lineIndex) => {
    if (line.visible) {
      line.sets.forEach((set, setIndex) => {
        result.push(...segmentToPaths(set).map(path => { return { lineIndex, setIndex, d: path.d, width: line.width, color: line.color, dashArray: path.dashed ? "5, 5": "" } }))
      })
    }
  })
  return result
})

const hoveredLinePaths = computed(() => {
  if (gui.lineSelection.hoveredLine === -1) return []
  return linePaths.value.filter(path => path.lineIndex === gui.lineSelection.hoveredLine)
})

const selectedLinePaths = computed(() => {
  if (gui.lineSelection.selectedLine === -1) return []
  return linePaths.value.filter(path => path.lineIndex === gui.lineSelection.selectedLine)
})

const hoveredSetPaths = computed(() => {
  if (gui.lineSelection.selectedLine === -1 || gui.lineSelection.hoveredSet === -1) return []
  return linePaths.value.filter(path =>
    path.lineIndex === gui.lineSelection.selectedLine &&
    path.setIndex === gui.lineSelection.hoveredSet)
})

const selectedSetPaths = computed(() => {
  if (gui.lineSelection.selectedLine === -1 || gui.lineSelection.selectedSet === -1) return []
  return linePaths.value.filter(path =>
    path.lineIndex === gui.lineSelection.selectedLine &&
    path.setIndex === gui.lineSelection.selectedSet)
})

const currentHaltSegments = computed(() => {
  const { selectedLine, selectedSet } = gui.lineSelection
  if (selectedLine === -1 || selectedSet === -1) return [[], []]
  const segments = lineSegments.value
  const line = segments[selectedLine]
  const result = [[], []] // type

  line.sets[selectedSet].forEach(segment => {
    result[segment.type].push({ x1: segment.x1, x2: segment.x2, y1: segment.y1, y2: segment.y2, haltIndex: segment.haltIndex, width: line.width, color: line.color, dashArray: segment.dashed ? "5, 5" : "" })
  })
  return result
})

const hoveredHaltSegments = computed(() => {
  const current = currentHaltSegments.value
  if (current[0].length === 0 || gui.lineSelection.hoveredType === -1) return []
  return current[gui.lineSelection.hoveredType].filter(e => e.haltIndex === gui.lineSelection.hoveredHalt)
})

const selectedHaltSegments = computed(() => {
  const current = currentHaltSegments.value
  if (current[0].length === 0 || gui.lineSelection.selectedType === -1) return []
  return current[gui.lineSelection.selectedType].filter(e => e.haltIndex === gui.lineSelection.selectedHalt)
})
</script>

<style scoped>
.selected-line {
  filter: url(#selected-shadow);
}
</style>
