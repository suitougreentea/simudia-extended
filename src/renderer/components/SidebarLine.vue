<template lang="pug">
div
  div(v-if="lineSelection.selectedLine >= 0 && lineSelection.selectedSet == -1")
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
  div(v-if="lineSelection.selectedHalt >= 0")
    div(v-if="lineSelection.selectedType == 1")
      div From: {{ stationName }}
      div To: {{ nextStationName }}
      label Journey time:
      TimeInputControl(:value="currentHalt.time" @change="changeTime('time', $event)")
    div(v-if="lineSelection.selectedType == 2")
      div Stops at: {{ nextStationName }}
      label Journey time:
      TimeInputControl(:value="currentHalt.time" @change="changeTime('time', $event)")

</template>

<script lang="ts">
import Vue from "vue"
//import Time from "../../time"
import TimeInputControl from "./TimeInputControl.vue"

export default Vue.extend({
  name: "sidebar-line",
  props: [
    "lineSelection"
  ],
  components: {
    TimeInputControl
  },
  data: function() {
    return {
      errorTime: false
    }
  },
  methods: {
    value(event: Event) {
      return (event.target as HTMLInputElement).value
    },
    changeLine(key: string, value: any) {
      this.$store.commit("modifyLine", { index: this.lineSelection.selectedLine, key, value })
    },
    changeHalt(key: string, value: any) {
    },
    changeTime(key: string, event: any) {
      const time = event.target.time
      this.$store.commit("modifyLineHalt", { lineIndex: this.lineSelection.selectedLine, haltIndex: this.lineSelection.selectedHalt, key, value: time })
    },
  },
  computed: {
    currentLine(): Array<any> { return this.$store.state.lines[this.lineSelection.selectedLine] },
    currentHalt(): any { return this.$store.state.lines[this.lineSelection.selectedLine].halts[this.lineSelection.selectedHalt] },
    nextHalt(): any { 
      const halts = this.$store.state.lines[this.lineSelection.selectedLine].halts
      return halts[(this.lineSelection.selectedHalt+1) % halts.length]
    },
    stationName(): string {
      return this.$store.state.stations[this.$store.getters.findStationIndex(this.currentHalt.stationId)].name
    },
    nextStationName(): string {
      return this.$store.state.stations[this.$store.getters.findStationIndex(this.nextHalt.stationId)].name
    },
  }
});

</script>

<style lang="stylus">

</style>
