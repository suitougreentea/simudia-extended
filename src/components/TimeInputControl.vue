<template>  
  <div style="display: contents">
    <input type="text" :disabled="disabled" :class="{error: error}" :value="rawText" @input.stop="onInput" @change.stop="onChange">
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import * as TimeUtil from "../time-util"
const props = withDefaults(defineProps<{
  modelValue: number,
  disabled?: boolean,
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  "update:modelValue": [newValue: number],
}>()

const rawText = ref(TimeUtil.joinStringSimple(props.modelValue))
const time = ref(props.modelValue)

const stringified = computed(() => TimeUtil.joinStringSimple(props.modelValue))
const error = computed(() => !TimeUtil.isValidTimeInput(rawText.value))

const onInput = (event) => {
  const element = event.target
  const text = element.value.trim()
  rawText.value = text
}

const onChange = (event) => {
  const element = event.target
  const text = element.value.trim()
  rawText.value = text
  if (TimeUtil.isValidTimeInput(text)) {
    time.value = TimeUtil.parse(text)
    emit("update:modelValue", time.value)
  }
}

const propRefs = toRefs(props)
watch(propRefs.modelValue, (newValue) => {
  rawText.value = TimeUtil.joinStringSimple(newValue)
})
</script>

<style>
input.error {
  box-shadow: 0px 0px 2px 1px red;
}
</style>

