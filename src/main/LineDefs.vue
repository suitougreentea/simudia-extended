<!-- NOTE: This component must be a child of MainScreen -->

<template lang="pug">
defs
  symbol#lines
    polyline(v-for="path in linePaths"
      :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width" :stroke-dasharray="path.dashArray")
    polyline(v-for="path in hoveredLinePaths"
      :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width + 1" :stroke-dasharray="path.dashArray")
    g(v-if="$parent.lineSelection.selectedSet == -1")
      polyline.selectedLine(v-for="path in selectedLinePaths"
        :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width" :stroke-dasharray="path.dashArray")
    polyline(v-for="path in hoveredSetPaths"
      :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width + 1" :stroke-dasharray="path.dashArray")
    g(v-if="$parent.lineSelection.selectedHalt == -1")
      polyline.selectedLine(v-for="path in selectedSetPaths"
        :points="path.d" fill="transparent" :stroke="path.color" :stroke-width="path.width" :stroke-dasharray="path.dashArray")
    line(v-for="seg in hoveredHaltSegments"
      :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2" :stroke="seg.color" :stroke-width="seg.width + 1" :stroke-dasharray="seg.dashArray")
    line.selectedLine(v-for="seg in selectedHaltSegments"
      :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2" :stroke="seg.color" :stroke-width="seg.width + 1" :stroke-dasharray="seg.dashArray")
  symbol#lines-hover
    g(v-if="$parent.mode == 'edit'")
      g(v-for="path in linePaths")
        polyline(v-if="path.lineIndex != $parent.lineSelection.selectedLine"
                :points="path.d" fill="transparent" stroke="transparent" stroke-width="10"
                @mouseenter="hoverLine(path.lineIndex, $event)" @mouseleave="unhoverLine(path.lineIndex, $event)"
                @click.prevent.stop="clickLine(path.lineIndex, $event)" @contextmenu.prevent.stop="contextLine(path.lineIndex, $event)"
                style="pointer-events: visibleStroke")
      g(v-for="path in selectedLinePaths")
        polyline(v-if="path.setIndex != $parent.lineSelection.selectedSet"
                :points="path.d" fill="transparent" stroke="transparent" stroke-width="10"
                @mouseenter="hoverSet(path.setIndex, $event)" @mouseleave="unhoverSet(path.setIndex, $event)"
                @click.prevent.stop="clickSet(path.setIndex, $event)"
                style="pointer-events: visibleStroke")
      g(v-for="(t, type) in currentHaltSegments")
        g(v-for="seg in t")
          line(:x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2" stroke="transparent" stroke-width="10"
                @mouseenter="hoverSegment(seg.haltIndex, type, $event)" @mouseleave="unhoverSegment(seg.haltIndex, type, $event)"
                @click.prevent.stop="clickSegment(seg.haltIndex, type, $event)" @contextmenu.prevent.stop="contextSegment(seg.haltIndex, type, $event)"
                style="pointer-events: visibleStroke")
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from "vue"
import { useMainStore } from "../stores/main"
import { type ExposedType } from "./MainScreen.vue";

// TODO: remove
const instance: { parent: { exposed: ExposedType } } = getCurrentInstance()

const store = useMainStore()

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
        x1: instance.parent.exposed.x(segment.t1),
        x2: instance.parent.exposed.x(segment.t2),
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
        const currY = instance.parent.exposed.accumulatedStationY.value[currStationIndex]
        const nextY = instance.parent.exposed.accumulatedStationY.value[nextStationIndex]
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
  if (instance.parent.exposed.lineSelection.value.hoveredLine === -1) return []
  return linePaths.value.filter(path => path.lineIndex === instance.parent.exposed.lineSelection.value.hoveredLine)
})

const selectedLinePaths = computed(() => {
  if (instance.parent.exposed.lineSelection.value.selectedLine === -1) return []
  return linePaths.value.filter(path => path.lineIndex === instance.parent.exposed.lineSelection.value.selectedLine)
})

const hoveredSetPaths = computed(() => {
  if (instance.parent.exposed.lineSelection.value.selectedLine === -1 || instance.parent.exposed.lineSelection.value.hoveredSet === -1) return []
  return linePaths.value.filter(path =>
    path.lineIndex === instance.parent.exposed.lineSelection.value.selectedLine &&
    path.setIndex === instance.parent.exposed.lineSelection.value.hoveredSet)
})

const selectedSetPaths = computed(() => {
  if (instance.parent.exposed.lineSelection.value.selectedLine === -1 || instance.parent.exposed.lineSelection.value.selectedSet === -1) return []
  return linePaths.value.filter(path =>
    path.lineIndex === instance.parent.exposed.lineSelection.value.selectedLine &&
    path.setIndex === instance.parent.exposed.lineSelection.value.selectedSet)
})

const currentHaltSegments = computed(() => {
  const { selectedLine, selectedSet } = instance.parent.exposed.lineSelection.value
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
  if (current[0].length === 0 || instance.parent.exposed.lineSelection.value.hoveredType === -1) return []
  return current[instance.parent.exposed.lineSelection.value.hoveredType].filter(e => e.haltIndex === instance.parent.exposed.lineSelection.value.hoveredHalt)
})

const selectedHaltSegments = computed(() => {
  const current = currentHaltSegments.value
  if (current[0].length === 0 || instance.parent.exposed.lineSelection.value.selectedType === -1) return []
  return current[instance.parent.exposed.lineSelection.value.selectedType].filter(e => e.haltIndex === instance.parent.exposed.lineSelection.value.selectedHalt)
})

const hoverLine = (index, event) => {
  instance.parent.exposed.lineSelection.value.hoveredLine = index
  instance.parent.exposed.lineSelection.value.hoveredSet = -1
  instance.parent.exposed.lineSelection.value.hoveredHalt = -1
  instance.parent.exposed.lineSelection.value.hoveredType = -1
}

const unhoverLine = (index, event) => {
  if (instance.parent.exposed.lineSelection.value.hoveredLine === index) {
    instance.parent.exposed.lineSelection.value.hoveredLine = -1
  }
}

const clickLine = (index, event) => {
  instance.parent.exposed.resetInput() // needed by Sidebar
  instance.parent.exposed.unselectStation()
  instance.parent.exposed.lineSelection.value.selectedLine = index
  instance.parent.exposed.lineSelection.value.selectedSet = -1
  instance.parent.exposed.lineSelection.value.selectedHalt = -1
  instance.parent.exposed.lineSelection.value.selectedType = -1
  instance.parent.exposed.lineSelection.value.hoveredLine = index
  instance.parent.exposed.lineSelection.value.hoveredSet = -1
  instance.parent.exposed.lineSelection.value.hoveredHalt = -1
  instance.parent.exposed.lineSelection.value.hoveredType = -1
}

const contextLine = (index, event) => {
  instance.parent.exposed.resetInput() // needed by Sidebar
  console.warn("TODO: implement menu")
  /*
  const menu = new Menu()
  menu.append(new MenuItem({
    label: "Delete line",
    click: () => {
      instance.parent.exposed.deleteSelectedLine(index)
    }
  }))
  menu.popup()
  */
}

const hoverSet = (index, event) => {
  instance.parent.exposed.lineSelection.value.hoveredLine = -1
  instance.parent.exposed.lineSelection.value.hoveredSet = index
  instance.parent.exposed.lineSelection.value.hoveredHalt = -1
  instance.parent.exposed.lineSelection.value.hoveredType = -1
}

const unhoverSet = (index, event) => {
  if (instance.parent.exposed.lineSelection.value.hoveredSet === index) {
    instance.parent.exposed.lineSelection.value.hoveredLine = -1
    instance.parent.exposed.lineSelection.value.hoveredSet = -1
  }
}

const clickSet = (index, event) => {
  instance.parent.exposed.unselectStation()
  instance.parent.exposed.lineSelection.value.selectedSet = index
  instance.parent.exposed.lineSelection.value.selectedHalt = -1
  instance.parent.exposed.lineSelection.value.selectedType = -1
  instance.parent.exposed.lineSelection.value.hoveredSet = index
  instance.parent.exposed.lineSelection.value.hoveredHalt = -1
  instance.parent.exposed.lineSelection.value.hoveredType = -1
}

const hoverSegment = (haltIndex, type, event) => {
  instance.parent.exposed.lineSelection.value.hoveredHalt = haltIndex
  instance.parent.exposed.lineSelection.value.hoveredType = type
}

const unhoverSegment = (haltIndex, type, event) => {
  if (instance.parent.exposed.lineSelection.value.hoveredHalt === haltIndex && instance.parent.exposed.lineSelection.value.hoveredType === type) {
    instance.parent.exposed.lineSelection.value.hoveredLine = -1
    instance.parent.exposed.lineSelection.value.hoveredSet = -1
    instance.parent.exposed.lineSelection.value.hoveredHalt = -1
    instance.parent.exposed.lineSelection.value.hoveredType = -1
  }
}

const clickSegment = (haltIndex, type, event) => {
  instance.parent.exposed.unselectStation()
  instance.parent.exposed.lineSelection.value.selectedHalt = haltIndex
  instance.parent.exposed.lineSelection.value.selectedType = type
  instance.parent.exposed.lineSelection.value.hoveredHalt = haltIndex
  instance.parent.exposed.lineSelection.value.hoveredType = type
}

const contextSegment = (haltIndex, type, event) => {
  if (type === 1) {
    console.warn("TODO: implement menu")
    /*
    const menu = new Menu()
    menu.append(new MenuItem({
      label: "Insert halt",
      click: () => {
        instance.parent.exposed.insertHaltToSelectedLine(haltIndex)
      }
    }))
    menu.append(new MenuItem({
      label: "Delete halt",
      enabled: store.lines[instance.parent.exposed.lineSelection.value.selectedLine].halts.length >= 3,
      click: () => {
        instance.parent.exposed.deleteHaltFromSelectedLine(haltIndex)
      }
    }))
    menu.popup()
    */
  }
}

defineExpose({
  hoverLine,
  unhoverLine,
  clickLine,
})

</script>

<style lang="stylus">
</style>
