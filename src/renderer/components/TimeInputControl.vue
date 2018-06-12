<template lang="pug">
input(type="text" :class="{error: error}" :value="rawText" @input="input" @change="change")
</template>
<script lang="ts">
import Vue from 'vue'
import Time from "../../time"
export default Vue.extend({
  props: ["value"],
  data: function() {
    return {
      rawText: this.value.joinStringSimple(),
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
      if (Time.isValidTimeInput(text)) {
        this.time = Time.parse(text)
        this.$emit("change", {target: this})
      }
    }
  },
  computed: {
    stringified(): string {
      return this.value.joinStringSimple()
    },
    error(): boolean {
      return !Time.isValidTimeInput(this.rawText)
    }
  },
  watch: {
    value() {
      this.rawText = this.value.joinStringSimple()
    }
  }
})
</script>

<style lang="stylus">
input.error
  box-shadow: 0px 0px 2px 1px red
</style>

