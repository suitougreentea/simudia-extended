<!-- NOTE: This component must be a child of MainScreen -->

<template lang="pug">
defs
  symbol#line-input
    path(:d="displayPath", fill="none", stroke="black")
    circle(v-for="c in displayCircles" :cx="c.x" :cy="c.y" r=3 fill="black")
    g(v-if="$parent.stationSelection.hovered >= 0 && $parent.hoveredTime >= 0")
      path(:d="displayPathNew", fill="none", stroke="gray")
      circle(v-for="c in displayCirclesNew" :cx="c.x" :cy="c.y" r=3 fill="gray")
  
</template>
<script lang="ts">
import { defineComponent } from "vue"
import * as TimeUtil from "../time-util"

export default defineComponent({
  data: function() {
    return {
      rubberbands: [], // {time, station, done}
      terminal: -1
    }
  },
  methods: {
    setTerminal(stationIndex) {
      this.terminal = stationIndex
    },
    addPoint({ station, time, skip }) {
      if (this.rubberbands.length === 0 && this.terminal === -1) {
        this.terminal = station
      }
      if (this.rubberbands.length > 0 && this.rubberbands[this.rubberbands.length - 1].station === station) {
        this.finishInput()
      } else {
        this.rubberbands = [...this.rubberbands, ...this.getNewRubberbands(station, time, skip)]
      }
    },
    getNewRubberbands(station, _time, skip) {
      if (_time < 0) return []
      if (this.$parent.inputtingTime) return []
      if (this.rubberbands.length === 0) return [{ station, time: _time }]
      if (this.rubberbands[this.rubberbands.length - 1].station === station) {
        // if (this.rubberbands[this.rubberbands.length - 1].station != this.rubberbands[0].station) {
        if (this.rubberbands[this.rubberbands.length - 1].station !== this.terminal) {
          // return [{ station: this.rubberbands[0].station, time: this.rubberbands[this.rubberbands.length - 1].time + 30 * TimeUtil.SECOND_DIVISOR }]
          return [{ station: this.terminal, time: this.rubberbands[this.rubberbands.length - 1].time + 30 * TimeUtil.SECOND_DIVISOR }]
        }
        return []
      }
      const time = Math.max(_time, this.rubberbands[this.rubberbands.length - 1].time + 30 * TimeUtil.SECOND_DIVISOR)
      if (skip) return [{ station, time }]
      const result = []
      const {time: lastTime, station: lastStation} = this.rubberbands[this.rubberbands.length - 1]
      const lastY = this.$parent.accumulatedStationY[lastStation]
      const thisY = this.$parent.accumulatedStationY[station]
      let j = lastStation
      do {
        j += (lastStation < station) ? 1 : -1
        const y = this.$parent.accumulatedStationY[j]
        const t = lastTime + (time - lastTime) / (thisY - lastY) * (y - lastY)
        result.push({time: t, station: j})
      } while (j !== station)
      return result
    },
    finishInput() {
      if (this.rubberbands[this.rubberbands.length - 1].station !== this.terminal) {
        this.rubberbands.push({ station: this.terminal, time: this.rubberbands[this.rubberbands.length - 1].time + 30 * TimeUtil.SECOND_DIVISOR })
      }
      if (this.rubberbands.length >= 3) {
        this.$parent.inputtingTime = true
        this.$parent.$refs.timeInput.start(this.rubberbands)
      }
    },
    reset() {
      this.rubberbands = []
      this.terminal = -1
    }
  },
  computed: {
    newRubberbands() {
      return this.getNewRubberbands(this.$parent.stationSelection.hovered, this.$parent.hoveredTime, !this.$parent.modifierStates.shift)
    },
    displayPath() {
      return this.rubberbands.map((e, i) => {
        const x = this.$parent.x(e.time)
        const y = this.$parent.accumulatedStationY[e.station]
        if (i === 0) return `M ${x} ${y}`
        return `L ${x} ${y}`
      }).join(" ")
    },
    displayPathNew() {
      if (this.rubberbands.length === 0) return ""
      const rubberbands = [this.rubberbands[this.rubberbands.length - 1], ...this.newRubberbands]
      return rubberbands.map((e, i) => {
        const x = this.$parent.x(e.time)
        const y = this.$parent.accumulatedStationY[e.station]
        if (i === 0) return `M ${x} ${y}`
        return `L ${x} ${y}`
      }).join(" ")
    },
    displayCircles() {
      return this.rubberbands.map((e, i) => {
        const x = this.$parent.x(e.time)
        const y = this.$parent.accumulatedStationY[e.station]
        return { x, y }
      })
    },
    displayCirclesNew() {
      return this.newRubberbands.map((e, i) => {
        const x = this.$parent.x(e.time)
        const y = this.$parent.accumulatedStationY[e.station]
        return { x, y }
      })
    }
  }
})
</script>
<style lang="stylus">

</style>
