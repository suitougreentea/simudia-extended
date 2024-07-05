<template>
  <g>
    <path
      v-for="e in pathListCached"
      v-show="e.show"
      :class="e.class"
      :d="e.d"
      :stroke="e.stroke"
      :stroke-width="e.strokeWidth"
      :stroke-dasharray="e.strokeDashArray">
    </path>
    <circle
      v-for="e in circleListCached"
      v-show="e.show"
      :class="e.class"
      :cx="e.cx"
      :cy="e.cy"
      :r="e.r"
      :fill="e.fill">
    </circle>
  </g>
</template>

<script setup lang="ts">
import { computed, type Ref } from "vue"
import type { LineRenderData } from "../lib/render";

const props = withDefaults(defineProps<{
  data: LineRenderData[]
  appearance?: "normal" | "selected" | "hovered" | "clickable"
  line?: number
  set?: number
  halt?: number
  type?: number
}>(), {
  appearance: "normal"
})

const normalClasses = ["line"]
const selectedClasses = ["line", "line-selected"]

const pathList = computed(() => {
  const lineData = props.data.find(l => l.lineIndex == props.line)
  if (lineData == null) return []

  const classList = props.appearance == "selected" ? selectedClasses : normalClasses
  const strokeWidth =
    props.appearance == "hovered" ? lineData.width + 1 :
    props.appearance == "clickable" ? 10 :
    lineData.width
  const stroke = props.appearance == "clickable" ? "transparent" : lineData.color

  if (props.set == null) {
    // lines
    if (props.appearance == "clickable") {
      return [{
        "class": classList,
        d: lineData.entireLinePath.merged,
        stroke,
        strokeWidth,
        strokeDashArray: "",
      }]
    } else {
      return lineData.entireLinePath.list.map(e => ({
        "class": classList,
        d: e.path,
        stroke,
        strokeWidth,
        strokeDashArray: e.dashArray,
      }))
    }
  } else if (props.halt == null) {
    // sets
    const setData = lineData.sets[props.set]
    if (props.appearance == "clickable") {
      return [{
        "class": classList,
        d: setData.entireSetPath.merged,
        stroke,
        strokeWidth,
        strokeDashArray: "",
      }]
    } else {
      return setData.entireSetPath.list.map(e => ({
        "class": classList,
        d: e.path,
        stroke,
        strokeWidth,
        strokeDashArray: e.dashArray,
      }))
    }
  } else {
    // halts (segments)
    const haltData = lineData.sets[props.set].segments[props.halt]
    const paths = props.type == 1 ? haltData.haltPaths : haltData.journeyPaths
    return paths.map(e => ({
      "class": classList,
      d: e.path,
      stroke,
      strokeWidth,
      strokeDashArray: e.dashArray,
    }))
  }
})

const circleList = computed(() => {
  if (props.appearance != "selected" && props.appearance != "hovered") return []

  const lineData = props.data.find(l => l.lineIndex == props.line)
  if (lineData == null) return []

  // TODO: should have circle class list, not line
  const classList = props.appearance == "selected" ? selectedClasses : normalClasses

  if (props.set != null && props.halt != null) {
    // halts (segments)
    if (props.type != 1) return []

    const haltData = lineData.sets[props.set].segments[props.halt]
    const paths = props.type == 1 ? haltData.haltPaths : haltData.journeyPaths
    return paths.map(e => ({
      "class": classList,
      cx: e.center.x,
      cy: e.center.y,
      r: lineData.width + 2,
      fill: lineData.color,
    }))
  }
  return []
})

type WithShowProperty<T> = T & { show: boolean }
const createCached = <T>(input: Ref<T[]>, emptyValue: T): Ref<WithShowProperty<T>[]> => {
  const emptyValueWithShow = { ...emptyValue, show: false }
  let length = 0
  return computed(() => {
    length = Math.max(length, input.value.length)
    const elements = input.value.map(e => ({ show: true, ...e }))
    const emptyElements = [...new Array(length - input.value.length)].fill(emptyValueWithShow)
    return [...elements, ...emptyElements]
  })
}

const pathListCached = createCached(pathList, {
  "class": [],
  d: "",
  stroke: "",
  strokeWidth: 0,
  strokeDashArray: "",
})

const circleListCached = createCached(circleList, {
  "class": [],
  cx: 0,
  cy: 0,
  r: 0,
  fill: "",
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
