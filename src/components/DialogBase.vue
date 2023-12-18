<template>
  <v-dialog v-model="opened">
    <slot></slot>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue"

let currentResolve: ((action: any) => void) | null = null
const opened = ref(false)

const open = async () => {
  return new Promise<any>((resolve, _) => {
    currentResolve = resolve
    opened.value = true
  })
}

const close = (action: any) => {
  if (currentResolve != null) {
    currentResolve(action)
    currentResolve = null
  }
  opened.value = false
}

defineExpose({
  open,
  close,
})
</script>

<style scoped></style>
