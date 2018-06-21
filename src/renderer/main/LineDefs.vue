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

<script>
import Vue from "vue"
import * as Electron from "electron"
const { Menu, MenuItem } = Electron.remote

export default Vue.extend({
  computed: {
    lineSegments() {
      // line, set, segment
      const lines = this.$store.state.lines
      const computedTimes = this.$store.getters.computedTimes

      const pushSegment = (array, segment) => {
        const monthLength = this.$store.state.monthLength
        if (segment.t1 >= monthLength) {
          pushSegment(array, { ...segment, t1: segment.t1 - monthLength, t2: segment.t2 - monthLength })
        } else if (segment.t2 > monthLength) {
          const intermediateY = segment.y1 + (segment.y2 - segment.y1) * (monthLength - segment.t1) / (segment.t2 - segment.t1)
          pushSegment(array, { ...segment, t1: segment.t1, t2: monthLength, y2: intermediateY })
          pushSegment(array, { ...segment, t1: 0, t2: segment.t2 - monthLength, y1: intermediateY })
        } else {
          array.push({
            x1: this.$parent.x(segment.t1),
            x2: this.$parent.x(segment.t2),
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
          const offsetTime = set * (this.$store.state.monthLength / line.divisor)
          for (let j = 0; j < length; j++) {
            const currHalt = line.halts[j]
            const nextHalt = line.halts[(j+1) % length]
            const currStationIndex = this.$store.getters.findStationIndex(currHalt.stationId)
            const nextStationIndex = this.$store.getters.findStationIndex(nextHalt.stationId)
            const currY = this.$parent.accumulatedStationY[currStationIndex]
            const nextY = this.$parent.accumulatedStationY[nextStationIndex]
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
    },
    linePaths() {
      const segments = this.lineSegments
      const result = []
      segments.forEach((line, lineIndex) => {
        if (line.visible) {
          line.sets.forEach((set, setIndex) => {
            result.push(...this.segmentToPaths(set).map(path => { return { lineIndex, setIndex, d: path.d, width: line.width, color: line.color, dashArray: path.dashed ? "5, 5": "" } }))
          })
        }
      })
      return result
    },
    hoveredLinePaths() {
      if (this.$parent.lineSelection.hoveredLine === -1) return []
      return this.linePaths.filter(path => path.lineIndex === this.$parent.lineSelection.hoveredLine)
    },
    selectedLinePaths() {
      if (this.$parent.lineSelection.selectedLine === -1) return []
      return this.linePaths.filter(path => path.lineIndex === this.$parent.lineSelection.selectedLine)
    },
    hoveredSetPaths() {
      if (this.$parent.lineSelection.selectedLine === -1 || this.$parent.lineSelection.hoveredSet === -1) return []
      return this.linePaths.filter(path =>
        path.lineIndex === this.$parent.lineSelection.selectedLine &&
        path.setIndex === this.$parent.lineSelection.hoveredSet)
    },
    selectedSetPaths() {
      if (this.$parent.lineSelection.selectedLine === -1 || this.$parent.lineSelection.selectedSet === -1) return []
      return this.linePaths.filter(path =>
        path.lineIndex === this.$parent.lineSelection.selectedLine &&
        path.setIndex === this.$parent.lineSelection.selectedSet)
    },
    currentHaltSegments() {
      const { selectedLine, selectedSet } = this.$parent.lineSelection
      if (selectedLine === -1 || selectedSet === -1) return [[], []]
      const segments = this.lineSegments
      const line = segments[selectedLine]
      const result = [[], []] // type

      line.sets[selectedSet].forEach(segment => {
        result[segment.type].push({ x1: segment.x1, x2: segment.x2, y1: segment.y1, y2: segment.y2, haltIndex: segment.haltIndex, width: line.width, color: line.color, dashArray: segment.dashed ? "5, 5" : "" })
      })
      return result
    },
    hoveredHaltSegments() {
      const current = this.currentHaltSegments
      if (current[0].length === 0 || this.$parent.lineSelection.hoveredType === -1) return []
      return current[this.$parent.lineSelection.hoveredType].filter(e => e.haltIndex === this.$parent.lineSelection.hoveredHalt)
    },
    selectedHaltSegments() {
      const current = this.currentHaltSegments
      if (current[0].length === 0 || this.$parent.lineSelection.selectedType === -1) return []
      return current[this.$parent.lineSelection.selectedType].filter(e => e.haltIndex === this.$parent.lineSelection.selectedHalt)
    }
  },
  methods: {
    hoverLine(index, event) {
      this.$parent.lineSelection.hoveredLine = index
      this.$parent.lineSelection.hoveredSet = -1
      this.$parent.lineSelection.hoveredHalt = -1
      this.$parent.lineSelection.hoveredType = -1
    },
    unhoverLine(index, event) {
      if (this.$parent.lineSelection.hoveredLine === index) {
        this.$parent.lineSelection.hoveredLine = -1
      }
    },
    clickLine(index, event) {
      this.$parent.resetInput() // needed by Sidebar
      this.$parent.lineSelection.selectedLine = index
      this.$parent.lineSelection.selectedSet = -1
      this.$parent.lineSelection.selectedHalt = -1
      this.$parent.lineSelection.selectedType = -1
      this.$parent.lineSelection.hoveredLine = index
      this.$parent.lineSelection.hoveredSet = -1
      this.$parent.lineSelection.hoveredHalt = -1
      this.$parent.lineSelection.hoveredType = -1
    },
    contextLine(index, event) {
      this.$parent.resetInput() // needed by Sidebar
      const menu = new Menu()
      menu.append(new MenuItem({
        label: "Delete line",
        click: () => {
          this.$parent.lineSelection.selectedLine = -1
          this.$store.commit("deleteLine", index)
        }
      }))
      menu.popup()
    },
    hoverSet(index, event) {
      this.$parent.lineSelection.hoveredLine = -1
      this.$parent.lineSelection.hoveredSet = index
      this.$parent.lineSelection.hoveredHalt = -1
      this.$parent.lineSelection.hoveredType = -1
    },
    unhoverSet(index, event) {
      if (this.$parent.lineSelection.hoveredSet === index) {
        this.$parent.lineSelection.hoveredLine = -1
        this.$parent.lineSelection.hoveredSet = -1
      }
    },
    clickSet(index, event) {
      this.$parent.lineSelection.selectedSet = index
      this.$parent.lineSelection.selectedHalt = -1
      this.$parent.lineSelection.selectedType = -1
      this.$parent.lineSelection.hoveredSet = index
      this.$parent.lineSelection.hoveredHalt = -1
      this.$parent.lineSelection.hoveredType = -1
    },
    hoverSegment(haltIndex, type, event) {
      this.$parent.lineSelection.hoveredHalt = haltIndex
      this.$parent.lineSelection.hoveredType = type
    },
    unhoverSegment(haltIndex, type, event) {
      if (this.$parent.lineSelection.hoveredHalt === haltIndex && this.$parent.lineSelection.hoveredType === type) {
        this.$parent.lineSelection.hoveredLine = -1
        this.$parent.lineSelection.hoveredSet = -1
        this.$parent.lineSelection.hoveredHalt = -1
        this.$parent.lineSelection.hoveredType = -1
      }
    },
    clickSegment(haltIndex, type, event) {
      this.$parent.lineSelection.selectedHalt = haltIndex
      this.$parent.lineSelection.selectedType = type
      this.$parent.lineSelection.hoveredHalt = haltIndex
      this.$parent.lineSelection.hoveredType = type
    },
    contextSegment(haltIndex, type, event) {
      const lineIndex = this.$parent.lineSelection.selectedLine
      const setIndex = this.$parent.lineSelection.selectedSet
      const line = this.$store.state.lines[lineIndex]

      if (type === 1) {
        const menu = new Menu()
        menu.append(new MenuItem({
          label: "Insert halt",
          click: () => {
            const monthLength = this.$store.state.monthLength
            const halts = this.$store.state.lines[lineIndex].halts
            const halt = halts[haltIndex]
            const nextHalt = halts[(haltIndex + 1)%halts.length]
            const stationIndex = this.$store.getters.findStationIndex(halt.stationId)
            const nextStationIndex = this.$store.getters.findStationIndex(nextHalt.stationId)
            const time = (this.$store.getters.computedTimes[lineIndex][haltIndex].departure + monthLength / line.divisor * setIndex) % monthLength

            this.$parent.lineInsertOrigin = {
              line: lineIndex,
              halt: haltIndex,
            }
            this.$parent.mode = "input"
            this.$parent.$refs.lineInputDefs.setTerminal(nextStationIndex)
            this.$parent.$refs.lineInputDefs.addPoint({ station: stationIndex, time: time, skip: false })
          }
        }))
        menu.append(new MenuItem({
          label: "Delete halt",
          enabled: line.halts.length >= 3,
          click: () => {
            this.$parent.lineSelection.selectedHalt = -1
            this.$parent.lineSelection.selectedType = -1
            this.$store.commit("deleteHalt", { lineIndex, haltIndex })
          }
        }))
        menu.popup()
      }
    },
    segmentToPaths(segments) {
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
  }
})
</script>

<style lang="stylus">

</style>
