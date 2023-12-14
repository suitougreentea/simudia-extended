<template>
  <DialogBase ref="dialog" persistent width="unset">
    <v-card>
      <v-card-text>
        <div v-if="type == 'error'">Error(s) generated while processing file:</div>
        <div v-if="type == 'warning'">Warning(s) generated while processing file:</div>
        <div v-for="m in messages">{{ m }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="dialog.close(null)">OK</v-btn>
      </v-card-actions>
    </v-card>
  </DialogBase>
</template>

<script setup lang="ts">
import { ref } from "vue"
import DialogBase from "../components/DialogBase.vue"

const dialog = ref<InstanceType<typeof DialogBase>>()
const type = ref<"error" | "warning">("error")
const messages = ref<string[]>([])
const open = async (type_: "error" | "warning", messages_: string[]) => {
  type.value = type_
  messages.value = messages_
  return (await dialog.value.open()) as null
}

defineExpose({
  open,
})
</script>

<style scoped></style>
