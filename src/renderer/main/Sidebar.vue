<!-- NOTE: This component must be a child of MainScreen -->

<template lang="pug">
div(style="height: 100%")
  div#sidebar-above
    div(v-if="$parent.lineSelection.selectedLine == -1")
      div
        label Month length:
        TimeInputControl(:value="$store.state.monthLength" @change="changeGlobal('monthLength', time($event))")
      div
        label Shift divisor:
        input(type="number" min=1 :value="$store.state.shiftDivisor" @input="changeGlobal('shiftDivisor', Math.max(Math.floor(Number(value($event))), 1))")

    div(v-if="$parent.lineSelection.selectedLine >= 0 && $parent.lineSelection.selectedSet == -1")
      div
        input(type="checkbox" :checked="currentLine.visible", @change="changeLine('visible', check($event))")
        label Visible
      div
        label Name:
        input(type="text" :value="currentLine.name" @change="changeLine('name', value($event))")
      div
        label Departures/month:
        input(type="number" min=1 :value="currentLine.divisor" @input="changeLine('divisor', Math.max(Math.floor(Number(value($event))), 1))")
      div
        label Line width:
        input(type="number" min=1 :value="currentLine.lineWidth" @input="changeLine('lineWidth', Math.max(Number(value($event)), 1))")
      div
        label Color:
        input(type="color" min=1 :value="currentLine.color" @input="changeLine('color', value($event))")
      div
        label Default loading time:
        TimeInputControl(:value="currentLine.defaultLoadingTime" @change="changeLine('defaultLoadingTime', time($event))")
      div
        label Reversing time:
        TimeInputControl(:value="currentLine.reversingTime" @change="changeLine('reversingTime', time($event))")
    div(v-if="$parent.lineSelection.selectedHalt >= 0")
      div(v-if="$parent.lineSelection.selectedType == 0")
        div From: {{ stationName }}
        div To: {{ nextStationName }}
        div
          input(type="checkbox" :checked="currentHalt.skip", @change="changeHalt('skip', check($event))")
          label Skip
        div(v-if="!currentHalt.skip")
          label Journey time:
          TimeInputControl(:value="currentHalt.time" @change="changeHalt('time', time($event))")
      div(v-if="$parent.lineSelection.selectedType == 1")
        div Stops at: {{ stationName }}
        div
          input(type="checkbox" :checked="currentHalt.skip", @change="changeHalt('skip', check($event))")
          label Skip
        div(v-if="!currentHalt.skip")
          div
            input(type="checkbox" :checked="currentHalt.wait", @change="changeHalt('wait', check($event))")
            label Wait:
            TimeInputControl(:disabled="!currentHalt.wait" :value="currentHalt.waitTime" @change="changeHalt('waitTime', time($event))")

          div
            input(type="checkbox" :checked="currentHalt.reverse", @change="changeHalt('reverse', check($event))")
            label Reverse

          div
            input(type="checkbox" :checked="currentHalt.overrideLoadingTime", @change="changeHalt('overrideLoadingTime', check($event))")
            label Override loading:
            TimeInputControl(:disabled="!currentHalt.overrideLoadingTime" :value="currentHalt.loadingTime" @change="changeHalt('loadingTime', time($event))")

          div
            input(type="checkbox" :checked="currentHalt.scheduled", @change="changeHalt('scheduled', check($event))")
            label Schedule departure:
            TimeInputControl(:disabled="!currentHalt.scheduled" :value="currentHalt.departureTime" @change="changeHalt('departureTime', time($event))")
            div
              label In-game shift:
              input(:disabled="!currentHalt.scheduled" type="number" min="0" :value="departureTimeShift(currentHalt.departureTime)" @input="changeHalt('departureTime', shiftToTime(Number(value($event))))")
  div#sidebar-below
    div(v-if="$parent.lineSelection.selectedLine == -1")
      div(v-for="(line, lineIndex) in $store.state.lines")
        div(:class="{ 'hovered-line': $parent.lineSelection.hoveredLine == lineIndex }" :style="{ borderBottom: '2px solid ' + line.color }"
            @mouseenter="$parent.$refs.lineDefs.hoverLine(lineIndex, $event)"
            @mouseleave="$parent.$refs.lineDefs.unhoverLine(lineIndex, $event)"
            @click.prevent.stop="$parent.$refs.lineDefs.clickLine(lineIndex, $event)"
            @contextmenu.prevent.stop="$parent.$refs.lineDefs.contextLine(lineIndex, $event)")
          input(type="checkbox" :checked="line.visible" @change="changeLineVisibility(lineIndex, check($event))" @click.stop="")
          span {{ line.name }}
    div(v-if="$parent.lineSelection.selectedLine >= 0 && $parent.lineSelection.selectedSet == -1")
      div(v-for="line in lineInfoString") {{ line }}


</template>

<script>
import Vue from "vue"
import TimeUtil from "../../time-util"
import TimeInputControl from "../components/TimeInputControl.vue"

export default Vue.extend({
  name: "sidebar",
  components: {
    TimeInputControl
  },
  data: function() {
    return {
      errorTime: false
    }
  },
  methods: {
    value(event) {
      return event.target.value
    },
    check(event) {
      return event.target.checked
    },
    time(event) {
      return event.target.time
    },
    changeLine(key, value) {
      this.$store.commit("modifyLine", { index: this.$parent.lineSelection.selectedLine, key, value })
    },
    changeLineVisibility(index, value) {
      this.$store.commit("modifyLine", { index: index, key: "visible", value })
    },
    changeHalt(key, value) {
      this.$store.commit("modifyLineHalt", { lineIndex: this.$parent.lineSelection.selectedLine, haltIndex: this.$parent.lineSelection.selectedHalt, key, value })
    },
    changeGlobal(key, value) {
      this.$store.commit("modifyGlobal", { key, value })
    },
    departureTimeShift(time) {
      const monthLength = this.$store.state.monthLength
      const shiftDivisor = this.$store.state.shiftDivisor
      return Math.round((time % monthLength) / monthLength * shiftDivisor)
    },
    shiftToTime(shift) {
      const monthLength = this.$store.state.monthLength
      const shiftDivisor = this.$store.state.shiftDivisor
      return shift / shiftDivisor * monthLength
    }
  },
  computed: {
    currentLine() { return this.$store.state.lines[this.$parent.lineSelection.selectedLine] },
    currentHalt() { return this.$store.state.lines[this.$parent.lineSelection.selectedLine].halts[this.$parent.lineSelection.selectedHalt] },
    nextHalt() {
      const halts = this.$store.state.lines[this.$parent.lineSelection.selectedLine].halts
      return halts[(this.$parent.lineSelection.selectedHalt+1) % halts.length]
    },
    stationName() {
      return this.$store.state.stations[this.$store.getters.findStationIndex(this.currentHalt.stationId)].name
    },
    nextStationName() {
      return this.$store.state.stations[this.$store.getters.findStationIndex(this.nextHalt.stationId)].name
    },
    lineInfoString() {
      const result = []
      const monthLength = this.$store.state.monthLength
      const shiftDivisor = this.$store.state.shiftDivisor
      const line = this.$store.state.lines[this.$parent.lineSelection.selectedLine]
      const halts = line.halts
      const times = this.$store.getters.computedTimes[this.$parent.lineSelection.selectedLine]
      for (let i = 0; i < halts.length; i++) {
        const halt = halts[i]
        const station = this.$store.getters.findStation(halt.stationId)
        if (i !== 0) result.push(TimeUtil.joinString(times[i].arrival, false))
        const scheduleInfo = times[i].scheduled ? "Scheduled: " + Math.round((times[i].departure % monthLength) / monthLength * shiftDivisor) : ""
        result.push(`[${station.name}] ${scheduleInfo}`)
        result.push(TimeUtil.joinString(times[i].departure, false))
        result.push("↓ " + TimeUtil.joinString(halt.time))
      }
      const firstHalt = halts[0]
      const firstStation = this.$store.getters.findStation(firstHalt.stationId)
      result.push(TimeUtil.joinString(times[0].arrival, false))
      result.push(`[${firstStation.name}]`)
      return result
    },
  }
})
</script>

<style lang="stylus">
#sidebar-above
  height: 50%
  overflow: scroll
  border-bottom: 2px solid black

#sidebar-below
  height: 50%
  overflow: scroll

.hovered-line
  background-color: #EEE
</style>
