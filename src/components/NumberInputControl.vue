<template>  
  <v-text-field type="number" v-model="model" :min="min" :max="max" :rules="[rule]" @change="onChange"></v-text-field>
</template>

<script setup lang="ts">
import { ref, toRefs, watch } from "vue"
const props = withDefaults(defineProps<{
  modelValue: number,
  min?: number,
  max?: number,
  integer?: boolean,
}>(), {
  min: undefined,
  max: undefined,
  integer: false,
})

const emit = defineEmits<{
  "update:modelValue": [newValue: number],
}>()

const model = ref(0)
const update = (modelValue: number) => {
  model.value = modelValue
}
update(props.modelValue)

const modelRefs = toRefs(props)
watch(modelRefs.modelValue, (newValue) => {
  update(newValue)
})

const rule = (value: string) => {
  const numbered = Number(value)
  if (isNaN(numbered)) return false
  if (numbered < props.min || props.max < numbered) return false
  if (props.integer && Math.floor(numbered) != numbered) return false
  return true
}

const onChange = () => {
  let newValue = Number(model.value)
  if (!isNaN(newValue)) {
    if (props.integer) newValue = Math.floor(newValue)
    if (props.min != null) newValue = Math.max(newValue, props.min)
    if (props.max != null) newValue = Math.min(newValue, props.max)
    emit("update:modelValue", newValue)
    update(newValue)
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

