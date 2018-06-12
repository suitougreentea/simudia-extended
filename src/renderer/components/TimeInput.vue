<template lang="pug">
div.time-input-container(v-if="inputtingTimeIndex >= 0" :style="{ top: timeInputPosition.y + 'px', left: timeInputPosition.x + 'px' }")
  div(contenteditable :class="{error: errorTime}" ref="timeInput"
      @keydown.enter.prevent="putTime" @input="inputTime")
  
</template>
<script lang="ts">
import Vue from 'vue'
import Time from "../../time"

export default Vue.extend({
  props: ["x", "accumulatedStationY"],
  data: function() {
    return {
      rubberbands: new Array<any>(),
      inputtingTimeIndex: -1,
      errorTime: false,
      inputtingTimes: new Array<number>(),
    }
  },
  methods: {
    start(rubberbands: Array<any>) {
      this.rubberbands = rubberbands
      this.inputtingTimeIndex = 0
      Vue.nextTick(() => {
        const element = this.$refs.timeInput as HTMLElement
        element.innerText = new Time(this.rubberbands[this.inputtingTimeIndex+1].time - this.rubberbands[this.inputtingTimeIndex].time).joinStringSimple()
        element.focus()
        document.execCommand("selectAll", false, null)
      })
    },
    inputTime() {
      const element = this.$refs.timeInput as HTMLElement
      const text = element.innerText.trim()
      this.errorTime = !Time.isValidTimeInput(text)
    },
    putTime() {
      const element = this.$refs.timeInput as HTMLElement
      const text = element.innerText.trim()
      if (!Time.isValidTimeInput(text)) return
      this.inputtingTimes.push(Time.parse(text).tick)
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
        this.$emit("end-line-input")
      }
    },
  },
  computed: {
    timeInputPosition(): any {
      if (this.inputtingTimeIndex > this.rubberbands.length - 2) return {x: 0, y: 0}
      const {time: firstTime, station: firstStation} = this.rubberbands[this.inputtingTimeIndex]
      const {time: secondTime, station: secondStation} = this.rubberbands[this.inputtingTimeIndex+1]
      const x = this.x((firstTime + secondTime) / 2) - 50
      const y = (this.accumulatedStationY[firstStation] + this.accumulatedStationY[secondStation]) / 2 - 10
      return {x, y}
    },
  }
})
</script>
<style lang="stylus">

</style>
