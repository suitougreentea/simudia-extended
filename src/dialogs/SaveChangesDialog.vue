<template>
  <DialogBase ref="dialog" persistent width="unset">
    <v-card>
      <v-card-text>Save changes?</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="dialog.close('yes')">Yes</v-btn>
        <v-btn color="primary" @click="dialog.close('no')">No</v-btn>
        <v-btn color="primary" @click="dialog.close('cancel')">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </DialogBase>
</template>

<script setup lang="ts">
import { ref } from "vue"
import DialogBase from "../components/DialogBase.vue"

type Actions = "yes" | "no" | "cancel"

const dialog = ref<InstanceType<typeof DialogBase>>()
const open = async () => {
  return (await dialog.value.open()) as Actions
}

defineExpose({
  open,
})
</script>

<style scoped></style>
