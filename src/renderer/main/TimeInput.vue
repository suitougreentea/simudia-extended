<template lang="pug">
div.time-input-container(v-if="inputtingTimeIndex >= 0" :style="{ top: timeInputPosition.y + 'px', left: timeInputPosition.x + 'px' }")
  div(contenteditable :class="{error: errorTime}" ref="timeInput"
      @keydown.enter.prevent="putTime" @input="inputTime")
  
</template>
<script>
import Vue from "vue"
import TimeUtil from "../../time-util"

export default Vue.extend({
  props: ["x", "accumulatedStationY", "lineInsertOrigin"],
  data: function() {
    return {
      rubberbands: [],
      inputtingTimeIndex: -1,
      errorTime: false,
      inputtingTimes: []
    }
  },
  methods: {
    start(rubberbands) {
      this.rubberbands = rubberbands
      this.inputtingTimeIndex = 0
      Vue.nextTick(() => {
        const element = this.$refs.timeInput
        element.innerText = TimeUtil.joinStringSimple(this.rubberbands[this.inputtingTimeIndex+1].time - this.rubberbands[this.inputtingTimeIndex].time)
        element.focus()
        document.execCommand("selectAll", false, null)
      })
    },
    inputTime() {
      const element = this.$refs.timeInput
      const text = element.innerText.trim()
      this.errorTime = !TimeUtil.isValidTimeInput(text)
    },
    putTime() {
      const element = this.$refs.timeInput
      const text = element.innerText.trim()
      if (!TimeUtil.isValidTimeInput(text)) return
      this.inputtingTimes.push(TimeUtil.parse(text))
      if (this.inputtingTimeIndex < this.rubberbands.length - 2) {
        this.inputtingTimeIndex++
        element.innerText = TimeUtil.joinStringSimple(this.rubberbands[this.inputtingTimeIndex+1].time - this.rubberbands[this.inputtingTimeIndex].time)
        element.focus()
        document.execCommand("selectAll", false, null)
      } else {
        if (this.lineInsertOrigin.line !== -1) {
          this.$store.commit("insertHalts", {
            lineIndex: this.lineInsertOrigin.line, haltIndex: this.lineInsertOrigin.halt,
            stationIndices: this.rubberbands.map(e => e.station), times: this.inputtingTimes
          })
        } else {
          this.$store.commit("addLine", { stationIndices: this.rubberbands.map(e => e.station), times: this.inputtingTimes, firstTime: this.rubberbands[0].time })
        }
        this.end()
        this.$emit("end-line-input")
      }
    },
    end() {
      this.rubberbands = []
      this.inputtingTimeIndex = -1
      this.inputtingTimes = []
    }
  },
  computed: {
    timeInputPosition() {
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
