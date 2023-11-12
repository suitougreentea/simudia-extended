<template>
  <div ref="coordinateSpace" style="position: absolute; width: 100%; height: 100%; pointer-events: none;">
    <div :style="divStyle">
      <v-menu v-model="opened" activator="parent">
        <slot></slot>
      </v-menu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { StyleValue, computed, nextTick, ref } from 'vue';
import { useGuiMessageStore } from '../stores/gui-message';

const message = useGuiMessageStore()

const coordinateSpace = ref<HTMLDivElement>(null)
const opened = ref(false)
const offset = ref({ x: 0, y: 0 })

const divStyle = computed(() => ({
  position: "absolute",
  left: `${offset.value.x}px`,
  top: `${offset.value.y}px`,
}) satisfies StyleValue)

const open = async (location: { x: number, y: number }) => {
  message.closeAllContextMenus({})
  await nextTick()
  offset.value = location
  opened.value = true
}

const openByEvent = async (event: MouseEvent) => {
  const spaceOffset = coordinateSpace.value?.getBoundingClientRect() ?? { left: 0, top: 0 }
  await open({ x: event.clientX - spaceOffset.left + 8, y: event.clientY - spaceOffset.top + 8 })
}

message.$onAction(({ name }) => {
  if (name == "closeAllContextMenus") {
    opened.value = false
  }
})

defineExpose({
  open,
  openByEvent,
})
</script>

<style scoped>
</style>