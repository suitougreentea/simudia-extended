<template lang="pug">
div(style="display: contents")
  input(type="text" :disabled="disabled" :class="{error: error}" :value="rawText" @input.stop="input" @change.stop="change")
</template>
<script>
import { defineComponent } from "vue"
import TimeUtil from "../time-util"

export default defineComponent({
  props: ["value", "disabled"],
  data: function() {
    return {
      rawText: TimeUtil.joinStringSimple(this.value),
      time: this.value,
    }
  },
  methods: {
    input(event) {
      const element = event.target
      const text = element.value.trim()
      this.rawText = text
      this.$emit("input", {target: this})
    },
    change(event) {
      const element = event.target
      const text = element.value.trim()
      this.rawText = text
      if (TimeUtil.isValidTimeInput(text)) {
        this.time = TimeUtil.parse(text)
        this.$emit("change", {target: this})
      }
    }
  },
  computed: {
    stringified() {
      return TimeUtil.joinStringSimple(this.value)
    },
    error() {
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

