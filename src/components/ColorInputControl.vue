<template>
  <v-text-field v-model="textModel" :rules="[rule]" @change="onTextChange">
    <template #append>
      <input v-model="colorModel" style="opacity: revert; width: 28px; height: 28px; margin-left: -4px; margin-right: 12px" type="color" @change="onColorChange" />
    </template>
  </v-text-field>
</template>

<script setup lang="ts">
import { ref, toRefs, watch } from "vue"
const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  "update:modelValue": [newValue: string]
}>()

const textModel = ref("")
const colorModel = ref("")
const update = (modelValue: string) => {
  textModel.value = modelValue
  colorModel.value = modelValue
}
update(props.modelValue)

const modelRefs = toRefs(props)
watch(modelRefs.modelValue, (newValue) => {
  update(newValue)
})

const regex = /^#[0-9a-fA-F]{6}$/
const rule = (value: string) => {
  return value.match(regex) != null
}

const onTextChange = () => {
  if (textModel.value.match(regex)) {
    emit("update:modelValue", textModel.value)
    update(textModel.value)
  } else {
    emit("update:modelValue", props.modelValue)
    update(props.modelValue)
  }
}
const onColorChange = () => {
  emit("update:modelValue", colorModel.value)
  update(colorModel.value)
}
</script>

<style scoped></style>
