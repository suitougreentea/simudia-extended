<template>
  <line v-for="l in verticalLines" :x1="l.x" :x2="l.x" :y1="l.y" :y2="gui.layout.bottom" :stroke="l.color"></line>
  <text v-for="t in verticalTexts" style="user-select: none; cursor: default" :x="t.x" :y="t.y" font-size="14">{{ t.text }}</text>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useMainStore } from "../stores/main"
import { useGuiStore } from "../stores/gui"
import * as TimeUtil from "../time-util"

const store = useMainStore()
const gui = useGuiStore()

const verticalLines = computed(() => {
  const result = []
  const monthLength = store.monthLength
  for (let i = 0; i <= monthLength; i += TimeUtil.SECOND_DIVISOR * 60 * 3) {
    const x_ = gui.x(i)
    let color
    let y
    if (i % (TimeUtil.SECOND_DIVISOR * 60 * 60) === 0) {
      color = "dimgrey"
      y = gui.layout.top
    } else if (i % (TimeUtil.SECOND_DIVISOR * 60 * 15) === 0) {
      color = "grey"
      y = gui.layout.top + gui.layout.headerHeight
    } else {
      color = "lightgrey"
      y = gui.layout.top + gui.layout.headerHeight
    }
    result.push({ x: x_, y: y, color: color })
  }
  return result
})

const verticalTexts = computed(() => {
  const result = []
  const monthLength = store.monthLength
  for (let i = 0; i <= monthLength / (TimeUtil.SECOND_DIVISOR * 60 * 60); i++) {
    const tick = i * TimeUtil.SECOND_DIVISOR * 60 * 60
    result.push({ x: gui.x(tick) + 5, y: gui.layout.top + gui.layout.headerHeight - 5, text: `${i}:00:00` })
  }
  return result
})
</script>