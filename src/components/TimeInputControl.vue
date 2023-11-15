<template>  
  <v-text-field type="text" v-model="model" :rules="[rule]" @change="onChange"></v-text-field>
</template>

<script setup lang="ts">
import { ref, toRefs, watch } from "vue";
import * as TimeUtil from "../time-util"
const props = withDefaults(defineProps<{
  modelValue: number,
  omitHour?: boolean,
}>(), {
  omitHour: false,
})

const emit = defineEmits<{
  "update:modelValue": [newValue: number],
}>()

const model = ref("")
const update = (modelValue: number) => {
  model.value = TimeUtil.joinString(modelValue, props.omitHour)
}
update(props.modelValue)

const modelRefs = toRefs(props)
watch(modelRefs.modelValue, (newValue) => {
  update(newValue)
})

const rule = (value: string) => {
  return TimeUtil.isValidTimeInput(value)
}

const onChange = () => {
  if (rule(model.value)) {
    let parsed = TimeUtil.parse(model.value)
    if (isNaN(parsed)) parsed = 0
    emit("update:modelValue", parsed)
    update(parsed)
  } else {
    emit("update:modelValue", props.modelValue)
    update(props.modelValue)
  }
}
</script>

<style scoped>
input.error {
  box-shadow: 0px 0px 2px 1px red;
}
</style>

