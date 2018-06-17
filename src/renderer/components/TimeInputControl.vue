<template lang="pug">
input(type="text" :disabled="disabled" :class="{error: error}" :value="rawText" @input="input" @change="change")
</template>
<script lang="ts">
import Vue from 'vue'
import TimeUtil from "../../time-util"
export default Vue.extend({
  props: ["value", "disabled"],
  data: function() {
    return {
      rawText: TimeUtil.joinStringSimple(this.value),
      time: this.value,
    }
  },
  methods: {
    input(event: Event) {
      const element = event.target as HTMLInputElement
      const text = element.value.trim()
      this.rawText = text
      this.$emit("input", {target: this})
    },
    change(event: Event) {
      const element = event.target as HTMLInputElement
      const text = element.value.trim()
      this.rawText = text
      if (TimeUtil.isValidTimeInput(text)) {
        this.time = TimeUtil.parse(text)
        this.$emit("change", {target: this})
      }
    }
  },
  computed: {
    stringified(): string {
      return TimeUtil.joinStringSimple(this.value)
    },
    error(): boolean {
      return !TimeUtil.isValidTimeInput(this.rawText)
    }
  },
  watch: {
    value() {
      this.rawText = TimeUtil.joinStringSimple(this.value)
    }
  }
})
</script>

<style lang="stylus">
input.error
  box-shadow: 0px 0px 2px 1px red
</style>

