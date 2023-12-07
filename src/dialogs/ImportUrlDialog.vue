<template>
  <Dialog persistent ref="dialog" class="w-75">
    <v-card>
      <v-container>
        <v-text-field v-model="url" label="URL to import">
          <template v-slot:append>
            <v-btn icon="mdi-arrow-right" color="primary" @click="openUrl"></v-btn>
          </template>
        </v-text-field>
      </v-container>
      <v-card class="overflow-auto" height="250px">
        <div v-if="loadingExamples" class="progress-container">
          <v-progress-circular indeterminate></v-progress-circular>
        </div>
        <v-list v-else density="compact">
          <v-list-subheader>Examples</v-list-subheader>
          <v-list-item v-if="errorExamples">Error loading example list</v-list-item>
          <template v-else>
            <v-list-item v-for="e in examples" @click="openExample(e.url)">{{ e.name }}</v-list-item>
          </template>
        </v-list>
      </v-card>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="dialog.close(null)">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from "vue"
import Dialog from "../components/Dialog.vue"
import { fetchExampleList, type Example } from "../example"

type Actions = string | null

const dialog = ref<InstanceType<typeof Dialog>>()
const open = async () => {
  url.value = ""
  loadExamples()
  return await dialog.value.open() as Actions
}

const url = ref("")
const loadingExamples = ref(false)
const errorExamples = ref(true)
const examples = ref<Example[]>([])

const loadExamples = async () => {
  try {
    loadingExamples.value = true
    errorExamples.value = false
    examples.value = await fetchExampleList()
    loadingExamples.value = false
  } catch (e) {
    console.error(e)
    loadingExamples.value = false
    errorExamples.value = true
  }
}

const openUrl = () => {
  const trimmed = url.value.trim()
  dialog.value.close(trimmed != "" ? trimmed : null)
}

const openExample = (url: string) => {
  dialog.value.close(url)
}

defineExpose({
  open,
})
</script>

<style scoped>
.progress-container {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>