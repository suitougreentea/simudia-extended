<template>
  <div style="height: 100%">
    <v-container id="sidebar-above">
      <GlobalInspector v-if="gui.stationSelection.selected == -1 && gui.lineSelection.selectedLine == -1"></GlobalInspector>
      <StationInspector v-if="gui.stationSelection.selected >= 0"></StationInspector>
      <LineInspector v-if="gui.lineSelection.selectedLine >= 0 && gui.lineSelection.selectedSet == -1"></LineInspector>
      <JourneyInspector v-if="gui.lineSelection.selectedHalt >= 0 && gui.lineSelection.selectedType == 0"></JourneyInspector>
      <HaltInspector v-if="gui.lineSelection.selectedHalt >= 0 && gui.lineSelection.selectedType == 1"></HaltInspector>
    </v-container>
    <v-container id="sidebar-below">
      <LineList v-if="gui.lineSelection.selectedLine == -1"></LineList>
      <LineInfo v-if="gui.lineSelection.selectedLine >= 0 && gui.lineSelection.selectedSet == -1"></LineInfo>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { useGuiStore } from "../stores/gui";
import GlobalInspector from "../inspectors/GlobalInspector.vue"
import StationInspector from "../inspectors/StationInspector.vue"
import LineInspector from "../inspectors/LineInspector.vue"
import JourneyInspector from "../inspectors/JourneyInspector.vue"
import HaltInspector from "../inspectors/HaltInspector.vue"
import LineList from "./LineList.vue"
import LineInfo from "./LineInfo.vue"

const gui = useGuiStore()
</script>

<style scoped>
#sidebar-above {
  height: 50%;
  overflow-y: scroll;
  border-bottom: 2px solid dimgrey;
}

#sidebar-below {
  height: 50%;
  overflow-y: scroll;
}
</style>
