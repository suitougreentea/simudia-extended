<template>
  <line
    :class="renderData.class"
    :x1="renderData.x1"
    :x2="renderData.x2"
    :y1="renderData.y1"
    :y2="renderData.y2"
    :stroke="renderData.stroke"
    :stroke-width="renderData.strokeWidth"
    >
  </line>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(defineProps<{
  x1: number
  x2: number
  y: number
  appearance?: "normal" | "selected" | "hovered" | "clickable"
}>(), {
  appearance: "normal"
})

const normalClasses = ["line"]
const selectedClasses = ["line", "line-selected"]

const renderData = computed(() => {

  const classList = props.appearance == "selected" ? selectedClasses : normalClasses
  const strokeWidth =
    props.appearance == "hovered" ? 2.5 :
    props.appearance == "clickable" ? 10 :
    1
  const stroke = props.appearance == "clickable" ? "transparent" : "dimgrey"

  return {
    "class": classList,
    x1: props.x1,
    x2: props.x2,
    y1: props.y,
    y2: props.y,
    stroke,
    strokeWidth,
  }
})
</script>

<style scoped>
.line {
  stroke-linecap: round;
}
.line-selected {
  filter: url(#selected-shadow);
}
</style>