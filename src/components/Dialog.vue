<template>
  <v-dialog v-model="opened">
    <slot></slot>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue"

let currentResolve: (any) => void = null
const opened = ref(false)

const open = async () => {
  return new Promise<any>((resolve, _) => {
    currentResolve = resolve
    opened.value = true
  })
}

const close = (action: any) => {
  currentResolve(action)
  currentResolve = null
  opened.value = false
}

defineExpose({
  open,
  close,
})
</script>

<style scoped>
</style>