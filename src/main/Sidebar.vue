<!-- NOTE: This component must be a child of MainScreen -->

<template>  
  <div style="height: 100%">
    <div id="sidebar-above">
      <div v-if="$parent.stationSelection.selected == -1 && $parent.lineSelection.selectedLine == -1">
        <div>
          <label>Month length:</label>
          <TimeInputControl :model-value="store.monthLength" @update:model-value="value => changeMonthLength(value)"></TimeInputControl>
        </div>
        <div>
          <label>Shift divisor:</label>
          <input type="number" min="1" :value="store.shiftDivisor" @input="changeShiftDivisor(Math.max(Math.floor(Number($event.target.value)), 1))">
        </div>
      </div>
      <div v-if="$parent.stationSelection.selected >= 0">
        <div>Name: {{ currentStation.name }}</div>
        <div>
          <button @click="$parent.insertStationAboveSelected($parent.stationSelection.selected)">Insert station above</button>
          <button @click="$parent.insertStationBelowSelected($parent.stationSelection.selected)">Insert station below</button>
          <button @click="$parent.deleteSelectedStation($parent.stationSelection.selected)">Delete station</button>
        </div>
      </div>
      <div v-if="$parent.lineSelection.selectedLine >= 0 && $parent.lineSelection.selectedSet == -1">
        <div>
          <input type="checkbox" :checked="currentLine.visible" @change="changeLine('visible', $event.target.checked)">
          <label>Visible</label>
        </div>
        <div>
          <label>Name:</label>
          <input type="text" :value="currentLine.name" @change="changeLine('name', $event.target.value)">
        </div>
        <div>
          <label>Departures/month:</label>
          <input type="number" min="1" :value="currentLine.divisor" @input="changeLine('divisor', Math.max(Math.floor(Number($event.target.value)), 1))">
        </div>
        <div>
          <label>Line width:</label>
          <input type="number" min="1" :value="currentLine.lineWidth" @input="changeLine('lineWidth', Math.max(Number($event.target.value), 1))">
        </div>
        <div>
          <label>Color:</label>
          <input type="color" min="1" :value="currentLine.color" @input="changeLine('color', $event.target.value)">
        </div>
        <div>
          <label>Default loading time:</label>
          <TimeInputControl :model-value="currentLine.defaultLoadingTime" @update:model-value="value => changeLine('defaultLoadingTime', value)"></TimeInputControl>
        </div>
        <div>
          <label>Reversing time:</label>
          <TimeInputControl :model-value="currentLine.reversingTime" @update:model-value="value => changeLine('reversingTime', value)"></TimeInputControl>
        </div>
        <div>
          <button @click="$parent.copySelectedLine($parent.lineSelection.selectedLine)">Copy line</button>
          <button @click="$parent.deleteSelectedLine($parent.lineSelection.selectedLine)">Delete line</button>
        </div>
      </div>
      <div v-if="$parent.lineSelection.selectedHalt >= 0">
        <div v-if="$parent.lineSelection.selectedType == 0">
          <div>From: {{ stationName }}</div>
          <div>To: {{ nextStationName }}</div>
          <div>
            <input type="checkbox" :checked="currentHalt.skip" @change="changeHalt('skip', $event.target.checked)">
            <label>Skip</label>
          </div>
          <div v-if="!currentHalt.skip">
            <label>Journey time:</label>
            <TimeInputControl :model-value="currentHalt.time" @update:model-value="value => changeHalt('time', value)"></TimeInputControl>
          </div>
        </div>
        <div v-if="$parent.lineSelection.selectedType == 1">
          <div>Stops at: {{ stationName }}</div>
          <div>
            <input type="checkbox" :checked="currentHalt.skip" @change="changeHalt('skip', $event.target.checked)">
            <label>Skip</label>
          </div>
          <div v-if="!currentHalt.skip">
            <div>
              <input type="checkbox" :checked="currentHalt.wait" @change="changeHalt('wait', $event.target.checked)">
              <label>Wait:</label>
              <TimeInputControl :disabled="!currentHalt.wait" :model-value="currentHalt.waitTime" @update:model-value="value => changeHalt('waitTime', value)"></TimeInputControl>
            </div>
            <div>
              <input type="checkbox" :checked="currentHalt.reverse" @change="changeHalt('reverse', $event.target.checked)">
              <label>Reverse</label>
            </div>
            <div>
              <input type="checkbox" :checked="currentHalt.overrideLoadingTime" @change="changeHalt('overrideLoadingTime', $event.target.checked)">
              <label>Override loading:</label>
              <TimeInputControl :disabled="!currentHalt.overrideLoadingTime" :model-value="currentHalt.loadingTime" @update:model-value="value => changeHalt('loadingTime', value)"></TimeInputControl>
            </div>
            <div>
              <input type="checkbox" :checked="currentHalt.scheduled" @change="changeHalt('scheduled', $event.target.checked)">
              <label>Schedule departure:</label>
              <TimeInputControl :disabled="!currentHalt.scheduled" :model-value="currentHalt.departureTime" @update:model-value="value => changeHalt('departureTime', value)"></TimeInputControl>
              <div>
                <label>In-game shift:</label>
                <input :disabled="!currentHalt.scheduled" type="number" min="0" :value="departureTimeShift(currentHalt.departureTime)" @input="changeHalt('departureTime', shiftToTime(Number($event.target.value)))">
              </div>
            </div>
          </div>
          <div>
            <button @click="$parent.insertHaltToSelectedLine($parent.lineSelection.selectedHalt)">Insert halt</button>
            <button @click="$parent.deleteHaltFromSelectedLine($parent.lineSelection.selectedHalt)" :disabled="store.lines[$parent.lineSelection.selectedLine].halts.length < 3">Delete halt</button>
          </div>
        </div>
      </div>
    </div>
    <div id="sidebar-below">
      <div v-if="$parent.lineSelection.selectedLine == -1">
        <div v-for="(line, lineIndex) in store.lines">
          <div :class="{ 'hovered-line': $parent.lineSelection.hoveredLine == lineIndex }" :style="{ borderBottom: '2px solid ' + line.color }" @mouseenter="$parent.$refs.lineDefs.hoverLine(lineIndex, $event)" @mouseleave="$parent.$refs.lineDefs.unhoverLine(lineIndex, $event)" @click.prevent.stop="$parent.$refs.lineDefs.clickLine(lineIndex, $event)" @contextmenu.prevent.stop="$parent.$refs.lineDefs.contextLine(lineIndex, $event)">
            <input type="checkbox" :checked="line.visible" @change="changeLineVisibility(lineIndex, $event.target.checked)" @click.stop=""><span>{{ line.name }}</span>
          </div>
        </div>
      </div>
      <div v-if="$parent.lineSelection.selectedLine >= 0 && $parent.lineSelection.selectedSet == -1">
        <div v-for="line in lineInfoString">{{ line }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref } from "vue"
import { useMainStore } from "../stores/main"
import * as TimeUtil from "../time-util"
import TimeInputControl from "../components/TimeInputControl.vue"
import { type ExposedType } from "./MainScreen.vue";

// TODO: remove
const instance: { parent: { exposed: ExposedType } } = getCurrentInstance()

const store = useMainStore()

const errorTime = ref(false)

const currentStation = computed(() => { return store.stations[instance.parent.exposed.stationSelection.value.selected] })
const currentLine = computed(() => { return store.lines[instance.parent.exposed.lineSelection.value.selectedLine] })
const currentHalt = computed(() => { return store.lines[instance.parent.exposed.lineSelection.value.selectedLine].halts[instance.parent.exposed.lineSelection.value.selectedHalt] })

const nextHalt = computed(() => {
  const halts = store.lines[instance.parent.exposed.lineSelection.value.selectedLine].halts
  return halts[(instance.parent.exposed.lineSelection.value.selectedHalt+1) % halts.length]
})

const stationName = computed(() => {
  return store.stations[store.findStationIndex(currentHalt.value.stationId)].name
})

const nextStationName = computed(() => {
  return store.stations[store.findStationIndex(nextHalt.value.stationId)].name
})

const lineInfoString = computed(() => {
  const result = []
  const monthLength = store.monthLength
  const shiftDivisor = store.shiftDivisor
  const line = store.lines[instance.parent.exposed.lineSelection.value.selectedLine]
  const halts = line.halts
  const times = store.computedTimes[instance.parent.exposed.lineSelection.value.selectedLine]
  for (let i = 0; i < halts.length; i++) {
    const halt = halts[i]
    const station = store.findStation(halt.stationId)
    if (i !== 0) result.push(TimeUtil.joinString(times[i].arrival, false))
    const scheduleInfo = times[i].scheduled ? "Scheduled: " + Math.round((times[i].departure % monthLength) / monthLength * shiftDivisor) : ""
    result.push(`[${station.name}] ${scheduleInfo}`)
    result.push(TimeUtil.joinString(times[i].departure, false))
    result.push("↓ " + TimeUtil.joinString(halt.time))
  }
  const firstHalt = halts[0]
  const firstStation = store.findStation(firstHalt.stationId)
  result.push(TimeUtil.joinString(times[0].arrival, false))
  result.push(`[${firstStation.name}]`)
  return result
})

const changeLine = (key, value) => {
  store.modifyLine({ index: instance.parent.exposed.lineSelection.value.selectedLine, key, value })
}

const changeLineVisibility = (index, value) => {
  store.modifyLine({ index: index, key: "visible", value })
}

const changeHalt = (key, value) => {
  store.modifyLineHalt({ lineIndex: instance.parent.exposed.lineSelection.value.selectedLine, haltIndex: instance.parent.exposed.lineSelection.value.selectedHalt, key, value })
}

const changeMonthLength = (value) => {
  store.modifyMonthLength({ value })
}

const changeShiftDivisor = (value) => {
  store.modifyShiftDivisor({ value })
}

const departureTimeShift = (time) => {
  const monthLength = store.monthLength
  const shiftDivisor = store.shiftDivisor
  return Math.round((time % monthLength) / monthLength * shiftDivisor)
}

const shiftToTime = (shift) => {
  const monthLength = store.monthLength
  const shiftDivisor = store.shiftDivisor
  return shift / shiftDivisor * monthLength
}
</script>

<style>
#sidebar-above {
  height: 50%;
  overflow: scroll;
  border-bottom: 2px solid black;
}

#sidebar-below {
  height: 50%;
  overflow: scroll;
}

.hovered-line {
  background-color: #EEE;
}
</style>
