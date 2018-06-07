<template lang="pug">
div
  div
    label Name:
    input(type="text" :value="$store.state.lines[lineIndex].name" @change="change('name', value($event))")
  div
    label Departures/month:
    input(type="number" min=1 :value="$store.state.lines[lineIndex].divisor" @input="change('divisor', Math.max(Math.floor(Number(value($event))), 1))")
  div
    label Line width:
    input(type="number" min=1 :value="$store.state.lines[lineIndex].lineWidth" @input="change('lineWidth', Math.max(Number(value($event)), 1))")
  div
    label Color:
    input(type="color" min=1 :value="$store.state.lines[lineIndex].color" @input="change('color', value($event))")
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  name: "sidebar-line",
  props: [
    "lineIndex"
  ],
  components: {},
  methods: {
    change(key: string, value: any) {
      this.$store.commit("modifyLine", { index: this.lineIndex, key, value })
    },
    value(event: Event) {
      return (event.target as HTMLInputElement).value
    }
  }
});

</script>

<style lang="stylus">

</style>
