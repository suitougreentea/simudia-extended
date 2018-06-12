<template lang="pug">
defs
  symbol#line-input
    path(:d="displayPath", fill="none", stroke="black")
    circle(v-for="c in displayCircles" :cx="c.x" :cy="c.y" r=3 fill="black")
    g(v-if="stationSelection.hovered >= 0 && hoveredTime >= 0")
      path(:d="displayPathNew", fill="none", stroke="gray")
      circle(v-for="c in displayCirclesNew" :cx="c.x" :cy="c.y" r=3 fill="gray")
  
</template>
<script lang="ts">
import Vue from 'vue'
import { SECOND_DIVISOR } from "../../time"

export default Vue.extend({
  props: ["mode", "x", "accumulatedStationY", "stationSelection", "hoveredTime", "modifierStates"],
  data: function() {
    return {
      rubberbands: new Array<any>(), // {time, station, done}
      //newRubberband: {},
    }
  },
  methods: {
    addPoint(event: { station: number, time: number, skip: boolean }) {
      if (this.rubberbands.length > 0 && this.rubberbands[this.rubberbands.length - 1].station == event.station) {
        const rubberbands = [...this.rubberbands, ...this.getNewRubberbands(event.station, event.time, event.skip)]
        if (rubberbands.length >= 3) {
          this.$emit("start-time-input", rubberbands)
        }
      } else {
        this.rubberbands = [...this.rubberbands, ...this.getNewRubberbands(event.station, event.time, event.skip)]
      }
    },
    getNewRubberbands(station: number, _time: number, skip: boolean): Array<any> {
      if (_time < 0) return []
      if (this.rubberbands.length == 0) return [{ station, time: _time }]
      if (this.rubberbands[this.rubberbands.length - 1].station == station) {
        if (this.rubberbands[this.rubberbands.length - 1].station != this.rubberbands[0].station) {
          return [{ station: this.rubberbands[0].station, time: this.rubberbands[this.rubberbands.length - 1].time + 30 * SECOND_DIVISOR }]
        }
        return []
      }
      const time = Math.max(_time, this.rubberbands[this.rubberbands.length - 1].time + 30 * SECOND_DIVISOR)
      if (skip) return [{ station, time }]
      const result = []
      const {time: lastTime, station: lastStation} = this.rubberbands[this.rubberbands.length - 1]
      const lastY = this.accumulatedStationY[lastStation]
      const thisY = this.accumulatedStationY[station]
      let j = lastStation
      do {
        j += (lastStation < station) ? 1 : -1
        const y = this.accumulatedStationY[j]
        const t = lastTime + (time - lastTime) / (thisY - lastY) * (y - lastY)
        result.push({time: t, station: j})
      } while (j != station)
      return result
    },
    end() {
      this.rubberbands = []
    }
  },
  computed: {
    newRubberbands(): Array<any> {
      return this.getNewRubberbands(this.stationSelection.hovered, this.hoveredTime, this.modifierStates.shift)
    },
    displayPath(): string {
      return this.rubberbands.map((e, i) => {
        const x = this.x(e.time)
        const y = this.accumulatedStationY[e.station]
        if (i == 0) return `M ${x} ${y}`
        return `L ${x} ${y}`
      }).join(" ")
    },
    displayPathNew(): string {
      if (this.rubberbands.length == 0) return ""
      const rubberbands = [this.rubberbands[this.rubberbands.length - 1], ...this.newRubberbands]
      return rubberbands.map((e, i) => {
        const x = this.x(e.time)
        const y = this.accumulatedStationY[e.station]
        if (i == 0) return `M ${x} ${y}`
        return `L ${x} ${y}`
      }).join(" ")
    },
    displayCircles(): Array<any> {
      return this.rubberbands.map((e, i) => {
        const x = this.x(e.time)
        const y = this.accumulatedStationY[e.station]
        return { x, y }
      })
    },
    displayCirclesNew(): Array<any> {
      return this.newRubberbands.map((e, i) => {
        const x = this.x(e.time)
        const y = this.accumulatedStationY[e.station]
        return { x, y }
      })
    }
  }
})
</script>
<style lang="stylus">

</style>
