<template>  
  <v-text-field type="text" v-model="model" :rules="[rule]" @change="onChange" @update:focused="onFocusChanged" ref="textField">
    <v-tooltip v-if="hints != null && hints.length > 0" v-model="focused" activator="parent" :open-on-focus="false" :open-on-hover="false" location="bottom">
      <v-list density="compact" style="pointer-events: initial;" bg-color="transparent">
        <v-list-item v-for="e in hints" @click.prevent.stop="setFromHint(e.time)">
          <div class="hint-container">
            <div class="hint-time">{{ TimeUtil.joinString(e.time) }}</div>
            <div class="hint-spacer"></div>
            <div class="hint-source">{{ e.source }}</div>
          </div>
        </v-list-item>
      </v-list>
    </v-tooltip>
  </v-text-field>
</template>

<script setup lang="ts">
import { ref, toRefs, watch } from "vue"
import * as TimeUtil from "../time-util"

export type Hint = {
  time: number,
  source: string,
}

const props = withDefaults(defineProps<{
  modelValue: number,
  omitHour?: boolean,
  hints?: Hint[],
}>(), {
  omitHour: false,
})

const textField = ref(null)

const emit = defineEmits<{
  "update:modelValue": [newValue: number],
  "selectedFromHints": [newValue: number],
}>()

const model = ref("")
const update = (modelValue: number) => {
  model.value = TimeUtil.joinString(modelValue, props.omitHour)
}
update(props.modelValue)

const modelRefs = toRefs(props)
watch(modelRefs.modelValue, (newValue) => {
  update(newValue)
})

const rule = (value: string) => {
  return TimeUtil.isValidTimeInput(value)
}

const onChange = () => {
  if (rule(model.value)) {
    let parsed = TimeUtil.parse(model.value)
    if (isNaN(parsed)) parsed = 0
    emit("update:modelValue", parsed)
    update(parsed)
  } else {
    emit("update:modelValue", props.modelValue)
    update(props.modelValue)
  }
}

const focused = ref(false)
const onFocusChanged = (newFocused) => {
  focused.value = newFocused
}

const setFromHint = (time: number) => {
  emit("update:modelValue", time)
  update(time)
  emit("selectedFromHints", time)
}
</script>

<style scoped>
.hint-container {
  display: flex;
  align-items: baseline;
}

.hint-time {
}

.hint-spacer {
  flex-grow: 1;
  min-width: 12px;
}

.hint-source {
  font-size: 85%;
  opacity: 0.7;
}
</style>

