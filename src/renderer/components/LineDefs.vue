<template lang="pug">
defs
  symbol#lines
    g(v-for="(line, lineIndex) in lineSegments")
      g(v-for="(set, setIndex) in line")
        g(v-for="ss in set")
          line(v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" :stroke="s.color" :stroke-width="s.width + (isLineSegmentWidened(lineIndex, setIndex, s.haltIndex, s.type) ? 1 : 0)"
              :class="{selectedLine: isLineSegmentSelected(lineIndex, setIndex, s.haltIndex, s.type)}"
              stroke-linecap="round")
          //-circle(v-for="s in ss" v-if="s.type == 2 && (selectedSegment.type == 2 || hoveredSegment.halt == 2) && isLineSegmentWidened(lineIndex, setIndex, s.haltIndex, s.type)"
                :cx="(s.x1 + s.x2) / 2" :cy="s.y1" r=3 fill="black")
  symbol#lines-hover
    g(v-if="mode == 'edit'")
      g(v-for="(line, lineIndex) in lineSegments")
        g(v-if="lineIndex != lineSelection.selectedLine" v-for="(set, setIndex) in line")
          g(v-for="ss in set")
            line(v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" stroke="transparent" stroke-width=10
                stroke-linecap="round"
                @mousemove="hoverLine(lineIndex, $event)" @mouseout="unhoverLine(lineIndex, $event)" @click.prevent="clickLine(lineIndex, $event)")
      g(v-if="lineSelection.selectedLine >= 0" v-for="(set, setIndex) in lineSegments[lineSelection.selectedLine]")
        g(v-for="ss in set")
          line(v-if="setIndex != lineSelection.selectedSet" v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" stroke="transparent" stroke-width=10
              stroke-linecap="round"
              @mousemove="hoverSet(setIndex, $event)" @mouseout="unhoverSet(setIndex, $event)" @click.prevent="clickSet(setIndex, $event)")
      g(v-if="lineSelection.selectedSet >= 0")
        //- TODO: somehow placing v-if and v-for fails
        g(v-for="ss in lineSegments[lineSelection.selectedLine][lineSelection.selectedSet]")
          line(v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" stroke="transparent" stroke-width=10
              stroke-linecap="round"
              @mousemove="hoverSegment(s.haltIndex, s.type, $event)" @mouseout="unhoverSegment(s.haltIndex, s.type, $event)" @click.prevent="clickSegment(s.haltIndex, s.type, $event)")
</template>

<script lang="ts">
import Vue from 'vue'
import { Line } from "../store"

export default Vue.extend({
  props: ["mode", "x", "accumulatedStationY", "lineSelection"],
  computed: {
    lineSegments(): Array<Array<Array<Array<any>>>> {
      // line, set, [segment-journey, segment-halt]
      const lines: Array<Line> = this.$store.state.lines
      const computedTimes = this.$store.getters.computedTimes
      const pushSegment = (array: Array<any>, segment: any) => {
        const monthLength = this.$store.state.month_length.tick
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
            haltIndex: segment.haltIndex, type: segment.type, color: segment.color, width: segment.width
          })
        }
      }
      return lines.map((line, i) => {
        const time = computedTimes[i]
        const result: Array<any> = []
        const length = line.halts.length
        for (let set = 0; set < line.divisor; set++) {
          result[set] = [[], []]
          const offsetTime = set * (this.$store.state.month_length.tick / line.divisor)
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
            pushSegment(result[set][0],
            {
              t1: currDepTime, y1: currY, t2: nextArrTime, y2: nextY,
              haltIndex: j, type: 1, color: line.color, width: line.lineWidth
            })
            pushSegment(result[set][1], {
              t1: nextArrTime, y1: nextY, t2: nextDepTime, y2: nextY,
              haltIndex: j, type: 2, color: line.color, width: line.lineWidth
            })
          }
        }
        return result
      })
    },
  },
  methods: {
    isLineSegmentWidened(lineIndex: number, setIndex: number, haltIndex: number, type: number): boolean {
      const { hoveredLine, hoveredSet, hoveredHalt, hoveredType,
              selectedLine, selectedSet, selectedHalt, selectedType } = this.lineSelection
      // TODO: semantically correct, but it should be simpler
      // if I add one more selection stack state, it'll be more complex...
      if (selectedLine == -1) {
        return hoveredLine == lineIndex
      }
      if (selectedLine >= 0 && selectedSet == -1) {
        if (hoveredSet >= 0) {
          return selectedLine == lineIndex && hoveredSet == setIndex
        } else {
          if (selectedLine == lineIndex) return true
          if (hoveredLine >= 0) {
            return hoveredLine == lineIndex
          }
        }
      }
      if (selectedSet >= 0 && selectedHalt == -1) {
        if (hoveredHalt >= 0) {
          return selectedLine == lineIndex && selectedSet == setIndex && hoveredHalt == haltIndex && hoveredType == type
        } else {
          if (selectedLine == lineIndex && selectedSet == setIndex) return true
          if (hoveredSet >= 0) {
            return selectedLine == lineIndex && hoveredSet == setIndex
          }
          if (hoveredLine >= 0) {
            return hoveredLine == lineIndex
          }
        }
      }
      if (selectedHalt >= 0) {
        if (selectedLine == lineIndex && selectedSet == setIndex && selectedHalt == haltIndex && selectedType == type) return true
        if (hoveredHalt >= 0) {
          return selectedLine == lineIndex && selectedSet == setIndex && hoveredHalt == haltIndex && hoveredType == type
        }
        if (hoveredSet >= 0) {
          return selectedLine == lineIndex && hoveredSet == setIndex
        }
        if (hoveredLine >= 0) {
          return hoveredLine == lineIndex
        }
      }
      return false
    },
    isLineSegmentSelected(lineIndex: number, setIndex: number, haltIndex: number, type: number): boolean {
      const { selectedLine, selectedSet, selectedHalt, selectedType } = this.lineSelection
      if (selectedHalt >= 0)
        return selectedLine == lineIndex && selectedSet == setIndex && selectedHalt == haltIndex && selectedType == type
      if (selectedSet >= 0) return selectedLine == lineIndex && selectedSet == setIndex
      return selectedLine == lineIndex
    },
    hoverLine(index: number, event: MouseEvent) {
      this.$emit("update-line-selection", {
        hoveredLine: index,
        hoveredSet: -1,
        hoveredHalt: -1,
        hoveredType: -1
      })
    },
    unhoverLine(index: number, event: MouseEvent) {
      if (this.lineSelection.hoveredLine == index) {
        this.$emit("update-line-selection", {
          hoveredLine: -1
        })
      }
    },
    clickLine(index: number, event: MouseEvent) {
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
    hoverSet(index: number, event: MouseEvent) {
      this.$emit("update-line-selection", {
        hoveredLine: -1,
        hoveredSet: index,
        hoveredHalt: -1,
        hoveredType: -1
      })
    },
    unhoverSet(index: number, event: MouseEvent) {
      if (this.lineSelection.hoveredSet == index) {
        this.$emit("update-line-selection", {
          hoveredLine: -1,
          hoveredSet: -1
        })
      }
    },
    clickSet(index: number, event: MouseEvent) {
      this.$emit("update-line-selection", {
        selectedSet: index,
        selectedHalt: -1,
        selectedType: -1,
        hoveredSet: index,
        hoveredHalt: -1,
        hoveredType: -1
      })
    },
    hoverSegment(haltIndex: number, type: number, event: MouseEvent) {
      this.$emit("update-line-selection", {
        hoveredHalt: haltIndex,
        hoveredType: type
      })
    },
    unhoverSegment(haltIndex: number, type: number, event: MouseEvent) {
      if (this.lineSelection.hoveredHalt == haltIndex && this.lineSelection.hoveredType == type) {
        this.$emit("update-line-selection", {
          hoveredLine: -1,
          hoveredSet: -1,
          hoveredHalt: -1,
          hoveredType: -1
        })
      }
    },
    clickSegment(haltIndex: number, type: number, event: MouseEvent) {
      this.$emit("update-line-selection", {
        selectedHalt: haltIndex,
        selectedType: type,
        hoveredHalt: haltIndex,
        hoveredType: type
      })
    }
  }
})
</script>

<style lang="stylus">

</style>
