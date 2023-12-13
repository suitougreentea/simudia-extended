<template>
  <TimeInputControl v-model="store.monthLength" label="Month length"></TimeInputControl>
  <NumberInputControl v-model="store.shiftDivisor" label="Shift divisor" integer :min="1" :max="65535"></NumberInputControl>
</template>

<script setup lang="ts">
import TimeInputControl from "../components/TimeInputControl.vue"
import NumberInputControl from "../components/NumberInputControl.vue"
import { useMainStore } from "../stores/main"

const store = useMainStore()
</script>

<style scoped></style>
