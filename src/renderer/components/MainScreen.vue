<template lang="pug">
div(style="position: relative")
  div.diagram
    div
      button(v-if="$root.canUndo" @click="$root.undo") Undo
      button(v-else disabled) Undo
      button(v-if="$root.canRedo" @click="$root.redo") Redo
      button(v-else disabled) Redo
      button(@click="mode = 'input'") Input mode
      button(@click="mode = 'edit'") Edit mode
      //-div {{ hoveredLine }}
      //-div {{ hoveredSet }}
      //-div {{ hoveredSegment }}
      //-div {{ selectedLine }}
      //-div {{ selectedSet }}
      //-div {{ selectedSegment }}
    div(style="position: relative")
      svg(:width="width", :height="height" ref="svg")
        filter(id="selected-shadow" filterUnits="userSpaceOnUse" width="200%" height="200%")
          feGaussianBlur(in="SourceGraphic" result="blur" stdDeviation=2)
          feBlend(in="SourceGraphic" in2="blur" mode="normal")

        line(v-for="l in vgrids" :x1="l.x" :x2="l.x" :y1="l.y" :y2="bottom" :stroke="l.color")
        line(v-for="(s, i) in stations" :x1="left" :x2="right" :y1="s.y" :y2="s.y" :stroke="s.color" :stroke-width="hoveredStation == i ? 2.5 : 1")
        line(v-if="stations.length == 0" :x1="left" :x2="right" :y1="top + 20" :y2="top + 20" stroke="black")
        //- TODO: 20 = TOP_SIZE
        circle(v-for="r in rubberbands" :cx="x(r.time)" :cy="stations[r.station].y" r=3 fill="black")
        path(:d="createPath(rubberbands)", fill="none", stroke="black")
        line(v-if="newRubberband.time" :x1="x(lastRubberband.time)" :y1="stations[lastRubberband.station].y"
            :x2="x(newRubberband.time)" :y2="stations[newRubberband.station].y" stroke="gray")
        g(v-for="(line, lineIndex) in lineSegments")
          g(v-for="(set, setIndex) in line")
            g(v-for="ss in set")
              line(v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" :stroke="s.color" :stroke-width="s.width + (isLineSegmentWidened(lineIndex, setIndex, s.haltIndex, s.type) ? 1 : 0)"
                  :class="{selectedLine: isLineSegmentSelected(lineIndex, setIndex, s.haltIndex, s.type)}"
                  stroke-linecap="round")
              //-circle(v-for="s in ss" v-if="s.type == 2 && (selectedSegment.type == 2 || hoveredSegment.halt == 2) && isLineSegmentWidened(lineIndex, setIndex, s.haltIndex, s.type)"
                    :cx="(s.x1 + s.x2) / 2" :cy="s.y1" r=3 fill="black")
        line(v-for="(s, i) in stations" :x1="left" :x2="right" :y1="s.y" :y2="s.y" stroke="transparent" stroke-width=10
            @mousemove="hoverStation(i, $event)" @mouseout="unhoverStation(i)" @click.prevent="clickStationLine(i, $event)")
        g(v-if="mode == 'edit'")
          g(v-for="(line, lineIndex) in lineSegments")
            g(v-if="lineIndex != selectedLine" v-for="(set, setIndex) in line")
              g(v-for="ss in set")
                line(v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" stroke="transparent" stroke-width=10
                    stroke-linecap="round"
                    @mousemove="hoverLine(lineIndex, $event)" @mouseout="unhoverLine(lineIndex, $event)" @click.prevent="clickLine(lineIndex, $event)")
          g(v-if="selectedLine >= 0" v-for="(set, setIndex) in lineSegments[selectedLine]")
            g(v-for="ss in set")
              line(v-if="setIndex != selectedSet" v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" stroke="transparent" stroke-width=10
                  stroke-linecap="round"
                  @mousemove="hoverSet(setIndex, $event)" @mouseout="unhoverSet(setIndex, $event)" @click.prevent="clickSet(setIndex, $event)")
          g(v-if="selectedSet >= 0")
            //- TODO: somehow placing v-if and v-for fails
            g(v-for="ss in lineSegments[selectedLine][selectedSet]")
              line(v-for="s in ss" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" stroke="transparent" stroke-width=10
                  stroke-linecap="round"
                  @mousemove="hoverSegment(s.haltIndex, s.type, $event)" @mouseout="unhoverSegment(s.haltIndex, s.type, $event)" @click.prevent="clickSegment(s.haltIndex, s.type, $event)")
      div(style="position: absolute; top: 0; left: 0;")
        div.station-name(contenteditable v-for="(s, i) in stations" :style="{ top: s.y - 20 + 'px', left: '20px' }"
            @keydown.tab.prevent="modifyStationKeyProceed(i)" @keydown.enter.prevent="modifyStationKeyProceed(i)" @keydown.esc.prevent="modifyStationKeyCancel(i)" @blur="modifyStationBlur(i)"
            ref="existingStation") {{ s.name }}
        div.station-name(contenteditable :style="{ top: newStationY + 'px', left: '20px' }"
            @keydown.tab.prevent="newStationKeyProceed" @keydown.enter.prevent="newStationKeyProceed" @keydown.esc.prevent="newStationKeyCancel" @blur="newStationBlur"
            ref="newStation")
        div.station-name(:style="{ top: '-100px', left: '-100px' }"
            ref="stationForMeasure")
        div.time-input-container(v-if="inputtingTimeIndex >= 0" :style="{ top: timeInputPosition.y + 'px', left: timeInputPosition.x + 'px' }")
          div(contenteditable :class="{error: errorTime}" ref="timeInput"
              @keydown.enter.prevent="putTime" @input="inputTime")
  div.property-side
    SidebarLine(v-if="selectedLine >= 0 && selectedSet == -1" :line-index="selectedLine")


</template>

<script lang="ts">
import Vue from "vue"
import Time, { SECOND_DIVISOR } from "../../time"
import { Line } from "../store"
import SidebarLine from "./SidebarLine.vue"

const MARGIN = 20
const TOP_SIZE = 20

export default Vue.extend({
  components: {
    SidebarLine
  },
  data: function() {
    return {
      top: MARGIN,
      left: MARGIN,
      mode: "input",
      stationsWidth: 110,
      hoveredStation: -1,
      rubberbands: new Array<any>(), // {time, station, done}
      newRubberband: {},
      inputtingTimeIndex: -1,
      errorTime: false,
      inputtingTimes: new Array<Time>(),
      hoveredLine: -1,
      hoveredSet: -1,
      hoveredSegment: { halt: -1, type: -1 },
      selectedLine: -1,
      selectedSet: -1,
      selectedSegment: { halt: -1, type: -1 },
    }
  },
  methods: {
    a() {
      console.log("!")
    },
    x(tick: number): number {
      return this.left + this.stationsWidth + tick / 7200
    },
    xi(x: number): number {
      return (x - this.left - this.stationsWidth) * 7200
    },
    newStationKeyProceed() {
      const element = this.$refs.newStation as HTMLElement
      const text = element.innerText.trim()
      if (text != "") {
        this.$store.commit("addStation", { name: text, width: this.measureStationWidth(text) })
        element.innerText = ""
      } else {
        element.blur()
      }
    },
    newStationKeyCancel() {
      const element = this.$refs.newStation as HTMLElement
      element.innerText = ""
      element.blur()
    },
    newStationBlur() {
      const element = this.$refs.newStation as HTMLElement
      const text = element.innerText.trim()
      if (text != "") {
        this.$store.commit("addStation", { name: text, width: this.measureStationWidth(text) })
        element.innerText = ""
      }
    },
    modifyStationKeyProceed(i: number) {
      const array = (this.$refs.existingStation as Array<HTMLElement>)
      const element = array[i]
      const text = element.innerText.trim()
      if (text != this.stations[i].name) {
        this.$store.commit("modifyStation", { pos: i, name: text, width: this.measureStationWidth(text) })
      }
      if (array.length == i + 1) {
        (this.$refs.newStation as HTMLElement).focus()
      } else {
        array[i + 1].focus()
      }
    },
    modifyStationKeyCancel(i: number) {
      const array = (this.$refs.existingStation as Array<HTMLElement>)
      const element = array[i]
      element.innerText = this.stations[i].name
      element.blur()
    },
    modifyStationBlur(i: number) {
      const array = (this.$refs.existingStation as Array<HTMLElement>)
      const element = array[i]
      const text = element.innerText.trim()
      if (text != this.stations[i].name) {
        this.$store.commit("modifyStation", { pos: i, name: text, width: this.measureStationWidth(text) })
      }
    },
    measureStationWidth(name: string): number {
      const element = this.$refs.stationForMeasure as HTMLElement
      element.innerText = name
      return element.clientWidth
    },
    hoverStation(i: number, e: MouseEvent) {
      this.hoveredStation = i
      if (this.mode == "input") {
        if (this.rubberbands.length > 0 && this.inputtingTimeIndex == -1) {
          const x = e.clientX - (this.$refs.svg as HTMLElement).getBoundingClientRect().left
          const t = Math.max(this.xi(x), ...this.rubberbands.map((e: any) => e.time + 30*SECOND_DIVISOR))
          this.newRubberband = {time: t, station: i}
        }
      }
    },
    unhoverStation(i: number) {
      if (this.hoveredStation == i) {
        this.hoveredStation = -1
        if (this.mode == "input") {
          this.newRubberband = {}
        }
      }
    },
    clickStationLine(i: number, e: MouseEvent) {
      const x = e.clientX - (this.$refs.svg as HTMLElement).getBoundingClientRect().left
      const time = Math.max(this.xi(x), ...this.rubberbands.map((e: any) => e.time + 30*SECOND_DIVISOR))
      if (this.mode == "input") {
        if (this.rubberbands.length == 0) {
          this.rubberbands.push({time: time, station: i})
        } else {
          if (this.lastRubberband.station == i) {
            if (this.rubberbands.length == 1) {
              this.rubberbands = []
              this.newRubberband = {}
            } else {
              if (this.lastRubberband.station != this.rubberbands[0].station) {
                this.rubberbands.push({ time: this.lastRubberband.time + 300 * SECOND_DIVISOR, station: this.rubberbands[0].station })
              }
              this.newRubberband = {}
              this.inputtingTimeIndex = 0
              Vue.nextTick(() => {
                const element = this.$refs.timeInput as HTMLElement
                element.innerText = new Time(this.rubberbands[1].time - this.rubberbands[0].time).joinStringSimple()
                element.focus()
                document.execCommand("selectAll", false, null)
              })
            }
          } else {
            if (e.getModifierState("Shift")) {
              this.rubberbands.push({time: time, station: i})
            } else {
              const {time: lastTime, station: lastStation} = this.lastRubberband
              const lastY = this.stations[lastStation].y
              const thisY = this.stations[i].y
              let j = lastStation
              do {
                j += (lastStation < i) ? 1 : -1
                const y = this.stations[j].y
                const t = lastTime + (time - lastTime) / (thisY - lastY) * (y - lastY)
                this.rubberbands.push({time: t, station: j})
              } while (j != i)
            }
          }
        }
      }
    },
    createPath(rubberbands: Array<any>) {
      return rubberbands.map((e, i) => {
        const x = this.x(e.time)
        const y = this.stations[e.station].y
        if (i == 0) return `M ${x} ${y}`
        return `L ${x} ${y}`
      })
    },
    inputTime() {
      const element = this.$refs.timeInput as HTMLElement
      const text = element.innerText.trim()
      this.errorTime = !this.isValidTimeInput(text)
    },
    putTime() {
      const element = this.$refs.timeInput as HTMLElement
      const text = element.innerText.trim()
      if (!this.isValidTimeInput(text)) return
      this.inputtingTimes.push(Time.parse(text))
      if (this.inputtingTimeIndex < this.rubberbands.length - 2) {
        this.inputtingTimeIndex ++
        element.innerText = new Time(this.rubberbands[this.inputtingTimeIndex+1].time - this.rubberbands[this.inputtingTimeIndex].time).joinStringSimple()
        element.focus()
        document.execCommand("selectAll", false, null)
      } else {
        this.$store.commit("addLine", { stationIndices: this.rubberbands.map(e => e.station), times: this.inputtingTimes, firstTime: new Time(this.rubberbands[0].time) })
        this.rubberbands = []
        this.inputtingTimeIndex = -1
        this.inputtingTimes = []
      }
    },
    isValidTimeInput(text: string): boolean {
      return /^[0-9]*[0-5][0-9][0-5][0-9](-[0-9]*[0-5][0-9][0-5][0-9])?$/.test(text)
    },
    isLineSegmentWidened(lineIndex: number, setIndex: number, haltIndex: number, type: number): boolean {
      // TODO: semantically correct, but it should be simpler
      // if I add one more selection stack state, it'll be more complex...
      if (this.selectedLine == -1) {
        return this.hoveredLine == lineIndex
      }
      if (this.selectedLine >= 0 && this.selectedSet == -1) {
        if (this.hoveredSet >= 0) {
          return this.selectedLine == lineIndex && this.hoveredSet == setIndex
        } else {
          if (this.selectedLine == lineIndex) return true
          if (this.hoveredLine >= 0) {
            return this.hoveredLine == lineIndex
          }
        }
      }
      if (this.selectedSet >= 0 && this.selectedSegment.halt == -1) {
        if (this.hoveredSegment.halt >= 0) {
          return this.selectedLine == lineIndex && this.selectedSet == setIndex && this.hoveredSegment.halt == haltIndex && this.hoveredSegment.type == type
        } else {
          if (this.selectedLine == lineIndex && this.selectedSet == setIndex) return true
          if (this.hoveredSet >= 0) {
            return this.selectedLine == lineIndex && this.hoveredSet == setIndex
          }
          if (this.hoveredLine >= 0) {
            return this.hoveredLine == lineIndex
          }
        }
      }
      if (this.selectedSegment.halt >= 0) {
        if (this.selectedLine == lineIndex && this.selectedSet == setIndex && this.selectedSegment.halt == haltIndex && this.selectedSegment.type == type) return true
        if (this.hoveredSegment.halt >= 0) {
          return this.selectedLine == lineIndex && this.selectedSet == setIndex && this.hoveredSegment.halt == haltIndex && this.hoveredSegment.type == type
        }
        if (this.hoveredSet >= 0) {
          return this.selectedLine == lineIndex && this.hoveredSet == setIndex
        }
        if (this.hoveredLine >= 0) {
          return this.hoveredLine == lineIndex
        }
      }
      return false
    },
    isLineSegmentSelected(lineIndex: number, setIndex: number, haltIndex: number, type: number): boolean {
      if (this.selectedSegment.halt >= 0)
        return this.selectedLine == lineIndex && this.selectedSet == setIndex && this.selectedSegment.halt == haltIndex && this.selectedSegment.type == type
      if (this.selectedSet >= 0) return this.selectedLine == lineIndex && this.selectedSet == setIndex
      return this.selectedLine == lineIndex
    },
    hoverLine(index: number, event: MouseEvent) {
      this.hoveredLine = index
      this.hoveredSet = -1
      this.hoveredSegment = { halt: -1, type: -1 }
    },
    unhoverLine(index: number, event: MouseEvent) { if (this.hoveredLine == index) this.hoveredLine = -1 },
    clickLine(index: number, event: MouseEvent) {
      this.selectedLine = this.hoveredLine = index
      this.selectedSet = this.hoveredSet = -1
      this.selectedSegment = this.hoveredSegment = { halt: -1, type: -1 }
    },
    hoverSet(index: number, event: MouseEvent) {
      this.hoveredLine = -1
      this.hoveredSet = index
      this.hoveredSegment = { halt: -1, type: -1 }
    },
    unhoverSet(index: number, event: MouseEvent) {
      if (this.hoveredSet == index) {
        this.hoveredLine = -1
        this.hoveredSet = -1
      }
    },
    clickSet(index: number, event: MouseEvent) {
      this.selectedSet = this.hoveredSet = index
      this.selectedSegment = this.hoveredSegment = { halt: -1, type: -1 }
    },
    hoverSegment(haltIndex: number, type: number, event: MouseEvent) {
      this.hoveredSegment = { halt: haltIndex, type }
    },
    unhoverSegment(haltIndex: number, type: number, event: MouseEvent) {
      if (this.hoveredSegment.halt == haltIndex && this.hoveredSegment.type == type) {
        this.hoveredLine = -1
        this.hoveredSet = -1
        this.hoveredSegment = { halt: -1, type: -1 }
      }
    },
    clickSegment(haltIndex: number, type: number, event: MouseEvent) {
      this.selectedSegment = this.hoveredSegment = { halt: haltIndex, type }
    }
  },
  computed: {
    width(): number {
      const monthLength = this.$store.state.month_length.getTick()
      return this.x(monthLength) + MARGIN
    },
    height(): number {
      const stations = this.stations
      if (stations.length == 0) return 60
      return stations[stations.length - 1].y + MARGIN
    },
    right(): number {
      return this.width - MARGIN
    },
    bottom(): number {
      return this.height - MARGIN
    },
    newStationY(): number {
      const stations = this.$store.state.stations
      if (stations.length == 0) {
        return 20
      } else {
        return this.height - 20
      }
    },
    vgrids() {
      const result = []
      const monthLength = this.$store.state.month_length.getTick()
      for (let i = 0; i <= monthLength; i += SECOND_DIVISOR * 60 * 3) {
        const x: number = this.x(i)
        let color: string
        let y: number
        if (i % (SECOND_DIVISOR * 60 * 60) == 0) {
          color = "black"
          y = this.top
        } else if (i % (SECOND_DIVISOR * 60 * 15) == 0) {
          color = "gray"
          y = this.top + TOP_SIZE
        } else {
          color = "lightgray"
          y = this.top + TOP_SIZE
        }
        result.push({ x: x, y: y, color: color })
      }
      return result
    },
    stations(): Array<any> {
      const stations = this.$store.state.stations
      const lines: Array<Line> = this.$store.state.lines
      const length = stations.length
      const result: Array<any> = []
      let y = 0
      for (let i = 0; i < length; i++) {
        const curr = stations[i]
        result.push({ name: curr.name, width: curr.width, y: this.top + TOP_SIZE + y, color: "black" })
        if (i == length - 1) continue
        const next = stations[(i+1) % length]
        const id1 = curr.id
        const id2 = next.id
        const found: Array<number> = []
        lines.forEach(line => {
          const halts = line.halts
          const haltsLength = halts.length
          for (let j = 0; j < haltsLength; j++) {
            const currHalt = halts[j]
            const nextHalt = halts[(j+1) % haltsLength]
            if (id1 == currHalt.stationId && id2 == nextHalt.stationId ||
                id1 == nextHalt.stationId && id2 == currHalt.stationId) {
              found.push(currHalt.time.tick)
            }
          }
        });
        //const averageTime = (found.length > 0) ? found.reduce((a, b) => a + b) / found.length : 20 * 3600
        const slowestTime = (found.length > 0) ? Math.max(...found) : 20 * 3600
        y += slowestTime / 3600
      }
      return result
    },
    lastRubberband(): any {
      return this.rubberbands[this.rubberbands.length - 1]
    },
    timeInputPosition(): any {
      if (this.inputtingTimeIndex > this.rubberbands.length - 2) return {x: 0, y: 0}
      const {time: firstTime, station: firstStation} = this.rubberbands[this.inputtingTimeIndex]
      const {time: secondTime, station: secondStation} = this.rubberbands[this.inputtingTimeIndex+1]
      const x = this.x((firstTime + secondTime) / 2) - 50
      const y = (this.stations[firstStation].y + this.stations[secondStation].y) / 2 - 10
      return {x, y}
    },
    computedTimes(): Array<Array<any>> {
      const lines: Array<Line> = this.$store.state.lines
      return lines.map(e => {
        const halts = e.halts
        const result: Array<any> = Array.from({length: halts.length}, _ => { return {arrival: null, wait: null, departure: null} })
        const length = halts.length
        let accum = 0
        let firstScheduledIndex = halts.findIndex(e => e.schedule != null)
        if (firstScheduledIndex >= 0) {
          accum = halts[firstScheduledIndex].schedule!.tick
        } else {
          firstScheduledIndex = 0
        }
        // TODO: firstScheduledIndexから回す
        for (let i = 0; i < halts.length; i++) {
          result[i].departure = accum
          accum += halts[i].time.tick
          result[(i+1) % length].arrival = accum
          const wait = 30 * SECOND_DIVISOR
          result[(i+1) % length].wait = wait
          accum += wait
        }
        const divisor = e.divisor
        const lastArrival = result[0].arrival
        let firstDeparture = result[0].departure
        const minWait = 30 * SECOND_DIVISOR
        while (firstDeparture < lastArrival + minWait) firstDeparture += this.$store.state.month_length.tick / divisor
        result[0].wait = firstDeparture - lastArrival

        return result
      })
    },
    lineSegments(): Array<Array<Array<Array<any>>>> {
      // line, set, [segment-journey, segment-halt]
      const lines: Array<Line> = this.$store.state.lines
      const computedTimes = this.computedTimes
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
            const currStation = this.stations[this.$store.getters.findStationIndex(currHalt.stationId)]
            const nextStation = this.stations[this.$store.getters.findStationIndex(nextHalt.stationId)]
            const currTime = time[j]
            const nextTime = time[(j+1) % length]
            const currDepTime = currTime.departure + offsetTime
            const nextArrTime = nextTime.arrival + offsetTime
            const nextDepTime = nextTime.arrival + nextTime.wait + offsetTime
            pushSegment(result[set][0],
            {
              t1: currDepTime, y1: currStation.y, t2: nextArrTime, y2: nextStation.y,
              haltIndex: j, type: 1, color: line.color, width: line.lineWidth
            })
            pushSegment(result[set][1], {
              t1: nextArrTime, y1: nextStation.y, t2: nextDepTime, y2: nextStation.y,
              haltIndex: j, type: 2, color: line.color, width: line.lineWidth
            })
          }
        }
        return result
      })
    },
  },
  watch: {
    stations(stations: Array<any>) {
      this.stationsWidth = Math.max(100, ...stations.map(e => e.width)) + 10
    }
  }
})
</script>

<style lang="stylus">
.station-name
  min-width: 100px
  line-height: 20px
  position: absolute
  white-space: nowrap

.time-input-container
  min-width: 100px
  line-height: 20px
  position: absolute
  white-space: nowrap
  background-color: rgba(255, 255, 255, 0.7)
  box-shadow: 0px 0px 2px 1px black
  .error
    box-shadow: 0px 0px 2px 1px red

.selectedLine
  filter: url(#selected-shadow)

.diagram
  position: fixed
  top: 0
  left: 0
  width: 70%
  height: 100%
  background-color: white
  overflow-x: auto
  overflow-y: auto

.property-side
  position: fixed
  top: 0
  right: 0
  width: 30%
  height: 100%
  background-color: white
  border-left: 2px solid black
</style>
