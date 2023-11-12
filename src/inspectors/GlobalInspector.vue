<template>
  <TimeInputControl label="Month length" v-model="store.monthLength"></TimeInputControl>
  <NumberInputControl label="Shift divisor" integer :min="1" :max="65535" v-model="store.shiftDivisor"></NumberInputControl>
</template>

<script setup lang="ts">
import TimeInputControl from '../components/TimeInputControl.vue'
import NumberInputControl from '../components/NumberInputControl.vue'
import { useMainStore } from '../stores/main'

const store = useMainStore()

</script>

<style scoped>
</style>