<template>
  <defs>
    <symbol id="lines">
      <polyline v-for="path in allLinePaths" :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width" :stroke-dasharray="path.dashArray"></polyline>

      <g v-if="gui.lineSelection.hoveredSet == -1">
        <polyline v-for="path in hoveredLinePaths" :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width + 1" :stroke-dasharray="path.dashArray"></polyline>
      </g>
      <g v-if="gui.lineSelection.hoveredHalt == -1">
        <polyline v-for="path in hoveredSetPaths" :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width + 1" :stroke-dasharray="path.dashArray"></polyline>
      </g>
      <line v-for="seg in hoveredHaltSegments" :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2" :stroke="seg.color" :stroke-width="seg.width + 1" :stroke-dasharray="seg.dashArray"></line>
      <circle v-for="e in hoveredHaltPoints" :cx="e.x" :cy="e.y" :r="e.r" :fill="e.color"></circle>

      <g v-if="gui.lineSelection.selectedSet == -1">
        <polyline
          v-for="path in selectedLinePaths"
          class="selected-line"
          :points="path.d"
          fill="transparent"
          :stroke="path.color"
          :stroke-width="path.width"
          :stroke-dasharray="path.dashArray"
        ></polyline>
      </g>
      <g v-if="gui.lineSelection.selectedHalt == -1">
        <polyline
          v-for="path in selectedSetPaths"
          class="selected-line"
          :points="path.d"
          fill="transparent"
          :stroke="path.color"
          :stroke-width="path.width"
          :stroke-dasharray="path.dashArray"
        ></polyline>
      </g>
      <line
        v-for="seg in selectedHaltSegments"
        class="selected-line"
        :x1="seg.x1"
        :y1="seg.y1"
        :x2="seg.x2"
        :y2="seg.y2"
        :stroke="seg.color"
        :stroke-width="seg.width + 1"
        :stroke-dasharray="seg.dashArray"
      ></line>
      <circle v-for="e in selectedHaltPoints" class="selected-line" :cx="e.x" :cy="e.y" :r="e.r" :fill="e.color"></circle>
    </symbol>
    <symbol id="lines-hover">
      <g v-if="gui.mode == 'edit'">
        <g v-for="path in allLinePaths">
          <polyline
            v-if="path.lineIndex != gui.lineSelection.selectedLine"
            :points="path.d"
            fill="transparent"
            stroke="transparent"
            stroke-width="10"
            style="pointer-events: visibleStroke"
            @mouseenter="gui.hoverLine(path.lineIndex)"
            @mouseleave="gui.unhoverLine(path.lineIndex)"
            @click.prevent.stop="gui.clickLine(path.lineIndex)"
            @contextmenu.prevent.stop="contextLine($event, path.lineIndex)"
          ></polyline>
        </g>
        <g v-for="path in selectedLinePaths">
          <polyline
            v-if="path.setIndex != gui.lineSelection.selectedSet"
            :points="path.d"
            fill="transparent"
            stroke="transparent"
            stroke-width="10"
            style="pointer-events: visibleStroke"
            @mouseenter="gui.hoverSet(path.setIndex)"
            @mouseleave="gui.unhoverSet(path.setIndex)"
            @click.prevent.stop="gui.clickSet(path.setIndex)"
          ></polyline>
        </g>
        <g v-for="seg in allHaltSegmentsInSelectedHalt[0]">
          <line
            :x1="seg.x1"
            :y1="seg.y1"
            :x2="seg.x2"
            :y2="seg.y2"
            stroke="transparent"
            :stroke-width="10"
            stroke-linecap="round"
            style="pointer-events: visibleStroke"
            @mouseenter="hoverSegment(seg.haltIndex, 0)"
            @mouseleave="unhoverSegment(seg.haltIndex, 0)"
            @click.prevent.stop="clickSegment(seg.haltIndex, 0)"
            @contextmenu.prevent.stop="contextSegment($event, seg.haltIndex, 0)"
          ></line>
        </g>
        <g v-for="seg in allHaltSegmentsInSelectedHalt[1]">
          <line
            :x1="seg.x1"
            :y1="seg.y1"
            :x2="seg.x2"
            :y2="seg.y2"
            stroke="transparent"
            :stroke-width="15"
            stroke-linecap="round"
            style="pointer-events: visibleStroke"
            @mouseenter="hoverSegment(seg.haltIndex, 1)"
            @mouseleave="unhoverSegment(seg.haltIndex, 1)"
            @click.prevent.stop="clickSegment(seg.haltIndex, 1)"
            @contextmenu.prevent.stop="contextSegment($event, seg.haltIndex, 1)"
          ></line>
        </g>
      </g>
    </symbol>
  </defs>
</template>

<script setup lang="ts">
import { computed, inject } from "vue"
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"
import { lineContextMenuInjection, lineSegmentContextMenuInjection } from "./injection"

const store = useMainStore()
const gui = useGuiStore()

const lineContextMenu = inject(lineContextMenuInjection)
const lineSegmentContextMenu = inject(lineSegmentContextMenuInjection)

type Path = {
  d: string
  dashed: boolean
}

type LineSegmentInfo = {
  visible: boolean
  width: number
  color: string
  sets: LineSegment[][]
}

type RawLineSegment = {
  t1: number
  y1: number
  t2: number
  y2: number
  haltIndex: number
  type: number
  dashed: boolean
}

type LineSegment = {
  x1: number
  y1: number
  x2: number
  y2: number
  haltIndex: number
  type: number
  dashed: boolean
}

type DrawLineSegment = {
  x1: number
  y1: number
  x2: number
  y2: number
  haltIndex: number
  width: number
  color: string
  dashArray: string
}

type DrawPoint = {
  x: number
  y: number
  r: number
  color: string
}

type LinePath = {
  lineIndex: number
  setIndex: number
  d: string
  width: number
  color: string
  dashArray: string
}

const segmentToPaths = (segments: LineSegment[]): Path[] => {
  const result: Path[] = []
  let current: string[] = []
  let i = 0
  for (; i < segments.length; i++) {
    if (i >= 1 && (segments[i - 1].x2 !== segments[i].x1 || segments[i - 1].dashed !== segments[i].dashed)) {
      current.push(`${segments[i - 1].x2},${segments[i - 1].y2}`)
      result.push({ d: current.join(","), dashed: segments[i - 1].dashed })
      current = []
    }
    current.push(`${segments[i].x1},${segments[i].y1}`)
  }
  current.push(`${segments[i - 1].x2},${segments[i - 1].y2}`)
  result.push({ d: current.join(","), dashed: segments[i - 1].dashed })
  return result
}

const lineSegments = computed(() => {
  // line, set, segment
  const lines = store.lines
  const computedTimes = store.computedTimes

  const pushSegment = (array: LineSegment[], segment: RawLineSegment) => {
    const monthLength = store.monthLength
    if (segment.t1 >= monthLength) {
      pushSegment(array, { ...segment, t1: segment.t1 - monthLength, t2: segment.t2 - monthLength })
    } else if (segment.t2 > monthLength) {
      const intermediateY = segment.y1 + ((segment.y2 - segment.y1) * (monthLength - segment.t1)) / (segment.t2 - segment.t1)
      pushSegment(array, { ...segment, t1: segment.t1, t2: monthLength, y2: intermediateY })
      pushSegment(array, { ...segment, t1: 0, t2: segment.t2 - monthLength, y1: intermediateY })
    } else if (segment.t1 < 0) {
      const intermediateY = segment.y1 + ((segment.y2 - segment.y1) * -segment.t1) / (segment.t2 - segment.t1)
      pushSegment(array, { ...segment, t1: segment.t1 + monthLength, t2: monthLength, y2: intermediateY })
      pushSegment(array, { ...segment, t1: 0, t2: segment.t2, y1: intermediateY })
    } else {
      array.push({
        x1: gui.x(segment.t1),
        x2: gui.x(segment.t2),
        y1: segment.y1,
        y2: segment.y2,
        haltIndex: segment.haltIndex,
        type: segment.type,
        dashed: segment.dashed,
      })
    }
  }

  return lines.map((line, i) => {
    const { haltTimes } = computedTimes[i]
    const sets: LineSegment[][] = []
    const length = line.halts.length
    for (let set = 0; set < line.divisor; set++) {
      sets[set] = []
      const offsetTime = set * (store.monthLength / line.divisor)
      for (let j = 0; j < length; j++) {
        const currHalt = line.halts[j]
        const nextHalt = line.halts[(j + 1) % length]
        const currStationIndex = store.findStationIndex(currHalt.stationId)
        const nextStationIndex = store.findStationIndex(nextHalt.stationId)
        const currY = gui.y(gui.stations[currStationIndex].accumulatedTime)
        const nextY = gui.y(gui.stations[nextStationIndex].accumulatedTime)
        const currTime = haltTimes[j]
        const nextTime = haltTimes[(j + 1) % length]
        const currArrTime = currTime.departure - currTime.wait + offsetTime
        const currDepTime = currTime.departure + offsetTime
        const nextArrTime = nextTime.arrival + offsetTime
        pushSegment(sets[set], {
          t1: currArrTime,
          y1: currY,
          t2: currDepTime,
          y2: currY,
          haltIndex: j,
          type: 1,
          dashed: currHalt.skip,
        })
        pushSegment(sets[set], {
          t1: currDepTime,
          y1: currY,
          t2: nextArrTime,
          y2: nextY,
          haltIndex: j,
          type: 0,
          dashed: currHalt.skip,
        })
      }
    }
    return { visible: line.visible, width: line.lineWidth, color: line.color, sets } as LineSegmentInfo
  })
})

const allLinePaths = computed(() => {
  const segments = lineSegments.value
  const result: LinePath[] = []
  segments.forEach((line, lineIndex) => {
    if (line.visible) {
      line.sets.forEach((set, setIndex) => {
        result.push(
          ...segmentToPaths(set).map((path) => {
            return { lineIndex, setIndex, d: path.d, width: line.width, color: line.color, dashArray: path.dashed ? "5, 5" : "" }
          })
        )
      })
    }
  })
  return result
})

const hoveredLinePaths = computed(() => {
  if (gui.lineSelection.hoveredLine === -1) return []
  return allLinePaths.value.filter((path) => path.lineIndex === gui.lineSelection.hoveredLine)
})

const selectedLinePaths = computed(() => {
  if (gui.lineSelection.selectedLine === -1) return []
  return allLinePaths.value.filter((path) => path.lineIndex === gui.lineSelection.selectedLine)
})

const hoveredSetPaths = computed(() => {
  if (gui.lineSelection.selectedLine === -1 || gui.lineSelection.hoveredSet === -1) return []
  return allLinePaths.value.filter((path) => path.lineIndex === gui.lineSelection.selectedLine && path.setIndex === gui.lineSelection.hoveredSet)
})

const selectedSetPaths = computed(() => {
  if (gui.lineSelection.selectedLine === -1 || gui.lineSelection.selectedSet === -1) return []
  return allLinePaths.value.filter((path) => path.lineIndex === gui.lineSelection.selectedLine && path.setIndex === gui.lineSelection.selectedSet)
})

const allHaltSegmentsInSelectedHalt = computed(() => {
  const { selectedLine, selectedSet } = gui.lineSelection
  if (selectedLine === -1 || selectedSet === -1) return [[], []] as [DrawLineSegment[], DrawLineSegment[]]
  const segments = lineSegments.value
  const line = segments[selectedLine]
  const result: [DrawLineSegment[], DrawLineSegment[]] = [[], []] // type

  line.sets[selectedSet].forEach((segment) => {
    result[segment.type].push({
      x1: segment.x1,
      x2: segment.x2,
      y1: segment.y1,
      y2: segment.y2,
      haltIndex: segment.haltIndex,
      width: line.width,
      color: line.color,
      dashArray: segment.dashed ? "5, 5" : "",
    })
  })
  return result
})

const allHaltSegmentsInHoveredHalt = computed(() => {
  const { hoveredLine, hoveredSet } = gui.lineSelection
  if (hoveredLine === -1 || hoveredSet === -1) return [[], []] as [DrawLineSegment[], DrawLineSegment[]]
  const segments = lineSegments.value
  const line = segments[hoveredLine]
  const result: [DrawLineSegment[], DrawLineSegment[]] = [[], []] // type

  line.sets[hoveredSet].forEach((segment) => {
    result[segment.type].push({
      x1: segment.x1,
      x2: segment.x2,
      y1: segment.y1,
      y2: segment.y2,
      haltIndex: segment.haltIndex,
      width: line.width,
      color: line.color,
      dashArray: segment.dashed ? "5, 5" : "",
    })
  })
  return result
})

const hoveredHaltSegments = computed(() => {
  const current = allHaltSegmentsInHoveredHalt.value
  if (current[0].length === 0 || gui.lineSelection.hoveredType === -1) return []
  return current[gui.lineSelection.hoveredType].filter((e) => e.haltIndex === gui.lineSelection.hoveredHalt)
})

const selectedHaltSegments = computed(() => {
  const current = allHaltSegmentsInSelectedHalt.value
  if (current[0].length === 0 || gui.lineSelection.selectedType === -1) return []
  return current[gui.lineSelection.selectedType].filter((e) => e.haltIndex === gui.lineSelection.selectedHalt)
})

const hoveredHaltPoints = computed(() => {
  const current = allHaltSegmentsInHoveredHalt.value
  if (current[0].length === 0 || gui.lineSelection.hoveredType !== 1) return []
  return current[gui.lineSelection.hoveredType]
    .filter((e) => e.haltIndex === gui.lineSelection.hoveredHalt)
    .map((e) => ({ x: (e.x1 + e.x2) / 2, y: e.y1, r: e.width + 2, color: e.color })) as DrawPoint[]
})

const selectedHaltPoints = computed(() => {
  const current = allHaltSegmentsInSelectedHalt.value
  if (current[0].length === 0 || gui.lineSelection.selectedType !== 1) return []
  return current[gui.lineSelection.selectedType]
    .filter((e) => e.haltIndex === gui.lineSelection.selectedHalt)
    .map((e) => ({ x: (e.x1 + e.x2) / 2, y: e.y1, r: e.width + 2, color: e.color })) as DrawPoint[]
})

const contextLine = (ev: MouseEvent, lineIndex: number) => {
  gui.resetInput() // needed by Sidebar
  lineContextMenu.value.open(ev, lineIndex)
}

const hoverSegment = (segmentIndex: number, type: number) => {
  gui.hoverSegment(gui.lineSelection.selectedLine, gui.lineSelection.selectedSet, segmentIndex, type)
}

const unhoverSegment = (segmentIndex: number, type: number) => {
  gui.unhoverSegment(gui.lineSelection.selectedLine, gui.lineSelection.selectedSet, segmentIndex, type)
}

const clickSegment = (segmentIndex: number, type: number) => {
  gui.clickSegment(gui.lineSelection.selectedLine, gui.lineSelection.selectedSet, segmentIndex, type)
}

const contextSegment = (ev: MouseEvent, segmentIndex: number, type: number) => {
  if (type === 1) {
    lineSegmentContextMenu.value.open(ev, segmentIndex)
  }
}
</script>

<style scoped>
.selected-line {
  filter: url(#selected-shadow);
}
</style>
