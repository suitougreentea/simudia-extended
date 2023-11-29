<template>
  <Dialog ref="dialog" width="unset">
    <v-card>
      <template v-slot:prepend>
        <img class="icon" src="/pwa-icon-512.png">
      </template>
      <v-card-title>SimuDia-Extended</v-card-title>
      <v-card-subtitle>
        <div>{{ version }}</div>
        <div>{{ buildDate }}</div>
      </v-card-subtitle>
      <v-card-text>
        <div>Developed by <a href="https://twitter.com/suitougreentea" target="_blank">suitougreentea</a></div>
        <div>Icon by <a href="https://twitter.com/nekowa_2133" target="_blank">nekowa</a></div>
        <v-divider class="ma-2"></v-divider>
        <div><a href="https://github.com/suitougreentea/simudia-extended" target="_blank">GitHub</a></div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="dialog.close(null)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from "vue"
import Dialog from "../components/Dialog.vue"

type Actions = null

const dialog = ref<InstanceType<typeof Dialog>>()
const open = async () => {
  return await dialog.value.open() as Actions
}

const version = __VERSION__ != null ? `Version ${__VERSION__}` : ""
const buildDate = (() => {
  if (__BUILD_DATE__ == null) return ""
  try {
    const date = new Date(__BUILD_DATE__)
    if (isNaN(date.getTime())) return ""
    return `Build date: ${date.toLocaleString("ja", { timeZone: "UTC" })}`
  } catch {
    return ""
  }
})()

defineExpose({
  open,
})
</script>

<style scoped>
.icon {
  width: 64px;
  height: 64px;
}
</style>