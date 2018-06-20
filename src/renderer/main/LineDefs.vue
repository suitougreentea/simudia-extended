<template lang="pug">
defs
  symbol#lines
    g(v-for="(line, lineIndex) in lineSegments")
      g(v-if="line.visible")
        g(v-for="(set, setIndex) in line.sets")
          g(v-for="ss in set")
            line(v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" :stroke="s.color" :stroke-width="s.width + (isLineSegmentWidened(lineIndex, setIndex, s.haltIndex, s.type) ? 1 : 0)"
                :stroke-dasharray="s.dashed ? '5, 5' : ''"
                :class="{selectedLine: isLineSegmentSelected(lineIndex, setIndex, s.haltIndex, s.type)}"
                stroke-linecap="round")
            //-circle(v-for="s in ss" v-if="s.type == 2 && (selectedSegment.type == 2 || hoveredSegment.halt == 2) && isLineSegmentWidened(lineIndex, setIndex, s.haltIndex, s.type)"
                  :cx="(s.x1 + s.x2) / 2" :cy="s.y1" r=3 fill="black")
  symbol#lines-hover
    g(v-if="mode == 'edit'")
      g(v-for="(line, lineIndex) in lineSegments")
        g(v-if="line.visible")
          g(v-if="lineIndex != lineSelection.selectedLine" v-for="(set, setIndex) in line.sets")
            g(v-for="ss in set")
              line(v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" stroke="transparent" stroke-width=10
                  stroke-linecap="round"
                  @mousemove="hoverLine(lineIndex, $event)" @mouseout="unhoverLine(lineIndex, $event)" @click.prevent.stop="clickLine(lineIndex, $event)"
                  @contextmenu.prevent.stop="contextLine(lineIndex, $event)")
      g(v-if="lineSelection.selectedLine >= 0 && lineSegments[lineSelection.selectedLine].visible")
        g(v-for="(set, setIndex) in lineSegments[lineSelection.selectedLine].sets")
          g(v-for="ss in set")
            line(v-if="setIndex != lineSelection.selectedSet" v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" stroke="transparent" stroke-width=10
                stroke-linecap="round"
                @mousemove="hoverSet(setIndex, $event)" @mouseout="unhoverSet(setIndex, $event)" @click.prevent.stop="clickSet(setIndex, $event)")
      g(v-if="lineSelection.selectedSet >= 0 && lineSegments[lineSelection.selectedLine].visible")
        g(v-for="ss in lineSegments[lineSelection.selectedLine].sets[lineSelection.selectedSet]")
          line(v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" stroke="transparent" stroke-width=10
              stroke-linecap="round"
              @mousemove="hoverSegment(s.haltIndex, s.type, $event)" @mouseout="unhoverSegment(s.haltIndex, s.type, $event)" @click.prevent.stop="clickSegment(s.haltIndex, s.type, $event)"
              @contextmenu.prevent.stop="contextSegment(s.haltIndex, s.type, $event)")
</template>

<script>
import Vue from "vue"
import * as Electron from "electron"
const { Menu, MenuItem } = Electron.remote

export default Vue.extend({
  props: ["mode", "x", "accumulatedStationY", "lineSelection"],
  computed: {
    // Array<{ visible: boolean, sets: Array<Array<Array<any>>>}>
    lineSegments() {
      // line, set, [segment-journey, segment-halt]
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
            x1: this.x(segment.t1),
            x2: this.x(segment.t2),
            y1: segment.y1, y2: segment.y2,
            haltIndex: segment.haltIndex, type: segment.type, color: segment.color, width: segment.width, dashed: segment.dashed
          })
        }
      }
      return lines.map((line, i) => {
        const time = computedTimes[i]
        const result = []
        const length = line.halts.length
        for (let set = 0; set < line.divisor; set++) {
          result[set] = [[], []]
          const offsetTime = set * (this.$store.state.monthLength / line.divisor)
          for (let j = 0; j < length; j++) {
            const currHalt = line.halts[j]
            const nextHalt = line.halts[(j+1) % length]
            const currStationIndex = this.$store.getters.findStationIndex(currHalt.stationId)
            const nextStationIndex = this.$store.getters.findStationIndex(nextHalt.stationId)
            const currY = this.accumulatedStationY[currStationIndex]
            const nextY = this.accumulatedStationY[nextStationIndex]
            const currTime = time[j]
            const nextTime = time[(j+1) % length]
            const currDepTime = currTime.departure + offsetTime
            const nextArrTime = nextTime.arrival + offsetTime
            const nextDepTime = nextTime.arrival + nextTime.wait + offsetTime
            pushSegment(result[set][0], {
              t1: currDepTime, y1: currY, t2: nextArrTime, y2: nextY,
              haltIndex: j, type: 1, color: line.color, width: line.lineWidth,
              dashed: currHalt.skip
            })
            pushSegment(result[set][1], {
              t1: nextArrTime, y1: nextY, t2: nextDepTime, y2: nextY,
              haltIndex: (j+1)%length, type: 2, color: line.color, width: line.lineWidth,
              dashed: nextHalt.skip
            })
          }
        }
        return { visible: line.visible, sets: result }
      })
    },
  },
  methods: {
    isLineSegmentWidened(lineIndex, setIndex, haltIndex, type) {
      const { hoveredLine, hoveredSet, hoveredHalt, hoveredType,
        selectedLine, selectedSet, selectedHalt, selectedType } = this.lineSelection
      // TODO: semantically correct, but it should be simpler
      // if I add one more selection stack state, it'll be more complex...
      if (selectedLine === -1) {
        return hoveredLine === lineIndex
      }
      if (selectedLine >= 0 && selectedSet === -1) {
        if (hoveredSet >= 0) {
          return selectedLine === lineIndex && hoveredSet === setIndex
        } else {
          if (selectedLine === lineIndex) return true
          if (hoveredLine >= 0) {
            return hoveredLine === lineIndex
          }
        }
      }
      if (selectedSet >= 0 && selectedHalt === -1) {
        if (hoveredHalt >= 0) {
          return selectedLine === lineIndex && selectedSet === setIndex && hoveredHalt === haltIndex && hoveredType === type
        } else {
          if (selectedLine === lineIndex && selectedSet === setIndex) return true
          if (hoveredSet >= 0) {
            return selectedLine === lineIndex && hoveredSet === setIndex
          }
          if (hoveredLine >= 0) {
            return hoveredLine === lineIndex
          }
        }
      }
      if (selectedHalt >= 0) {
        if (selectedLine === lineIndex && selectedSet === setIndex && selectedHalt === haltIndex && selectedType === type) return true
        if (hoveredHalt >= 0) {
          return selectedLine === lineIndex && selectedSet === setIndex && hoveredHalt === haltIndex && hoveredType === type
        }
        if (hoveredSet >= 0) {
          return selectedLine === lineIndex && hoveredSet === setIndex
        }
        if (hoveredLine >= 0) {
          return hoveredLine === lineIndex
        }
      }
      return false
    },
    isLineSegmentSelected(lineIndex, setIndex, haltIndex, type) {
      const { selectedLine, selectedSet, selectedHalt, selectedType } = this.lineSelection
      if (selectedHalt >= 0) {
        return selectedLine === lineIndex && selectedSet === setIndex && selectedHalt === haltIndex && selectedType === type
      }
      if (selectedSet >= 0) return selectedLine === lineIndex && selectedSet === setIndex
      return selectedLine === lineIndex
    },
    hoverLine(index, event) {
      this.$emit("update-line-selection", {
        hoveredLine: index,
        hoveredSet: -1,
        hoveredHalt: -1,
        hoveredType: -1
      })
    },
    unhoverLine(index, event) {
      if (this.lineSelection.hoveredLine === index) {
        this.$emit("update-line-selection", {
          hoveredLine: -1
        })
      }
    },
    clickLine(index, event) {
      this.$emit("update-line-selection", {
        selectedLine: index,
        selectedSet: -1,
        selectedHalt: -1,
        selectedType: -1,
        hoveredLine: index,
        hoveredSet: -1,
        hoveredHalt: -1,
        hoveredType: -1
      })
    },
    contextLine(index, event) {
      this.clickLine(index, event)
      const menu = new Menu()
      menu.append(new MenuItem({
        label: "Delete line",
        click: () => {
          this.$emit("update-line-selection", {
            selectedLine: -1,
          })
          this.$store.commit("deleteLine", index)
        }
      }))
      menu.popup()
    },
    hoverSet(index, event) {
      this.$emit("update-line-selection", {
        hoveredLine: -1,
        hoveredSet: index,
        hoveredHalt: -1,
        hoveredType: -1
      })
    },
    unhoverSet(index, event) {
      if (this.lineSelection.hoveredSet === index) {
        this.$emit("update-line-selection", {
          hoveredLine: -1,
          hoveredSet: -1
        })
      }
    },
    clickSet(index, event) {
      this.$emit("update-line-selection", {
        selectedSet: index,
        selectedHalt: -1,
        selectedType: -1,
        hoveredSet: index,
        hoveredHalt: -1,
        hoveredType: -1
      })
    },
    hoverSegment(haltIndex, type, event) {
      this.$emit("update-line-selection", {
        hoveredHalt: haltIndex,
        hoveredType: type
      })
    },
    unhoverSegment(haltIndex, type, event) {
      if (this.lineSelection.hoveredHalt === haltIndex && this.lineSelection.hoveredType === type) {
        this.$emit("update-line-selection", {
          hoveredLine: -1,
          hoveredSet: -1,
          hoveredHalt: -1,
          hoveredType: -1
        })
      }
    },
    clickSegment(haltIndex, type, event) {
      this.$emit("update-line-selection", {
        selectedHalt: haltIndex,
        selectedType: type,
        hoveredHalt: haltIndex,
        hoveredType: type
      })
    },
    contextSegment(haltIndex, type, event) {
      this.clickSegment(haltIndex, type, event)

      const lineIndex = this.lineSelection.selectedLine
      const setIndex = this.lineSelection.selectedSet
      const line = this.$store.state.lines[lineIndex]

      if (type === 2) {
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
            this.$emit("insert-rubberband", {
              lineIndex,
              haltIndex,
              stationIndex,
              nextStationIndex,
              time
            })
          }
        }))
        menu.append(new MenuItem({
          label: "Delete halt",
          enabled: line.halts.length >= 3,
          click: () => {
            this.$emit("update-line-selection", {
              selectedHalt: -1,
              selectedType: -1,
            })
            this.$store.commit("deleteHalt", { lineIndex, haltIndex })
          }
        }))
        menu.popup()
      }
    }
  }
})
</script>

<style lang="stylus">

</style>
