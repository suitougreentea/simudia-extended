<template>
  <div style="height: 100%">
    <v-container id="sidebar-above">
      <SelectionNavigator></SelectionNavigator>
      <GlobalInspector v-if="gui.resolvedSelectedStations.length == 0 && gui.lineSelection.selectedLine == -1"></GlobalInspector>
      <StationInspector v-if="gui.resolvedSelectedStations.length > 0"></StationInspector>
      <LineInspector v-if="gui.lineSelection.selectedLine >= 0 && gui.lineSelection.selectedSet == -1"></LineInspector>
      <JourneyInspector v-if="gui.lineSelection.selectedHalt >= 0 && gui.lineSelection.selectedType == 0"></JourneyInspector>
      <HaltInspector v-if="gui.lineSelection.selectedHalt >= 0 && gui.lineSelection.selectedType == 1"></HaltInspector>
    </v-container>
    <v-container id="sidebar-below">
      <LineList v-if="gui.lineSelection.selectedLine == -1"></LineList>
      <LineInfo v-if="gui.lineSelection.selectedLine >= 0 && gui.lineSelection.selectedSet == -1"></LineInfo>
      <SetInfo v-if="gui.lineSelection.selectedLine >= 0 && gui.lineSelection.selectedSet >= 0 && gui.lineSelection.selectedHalt == -1"></SetInfo>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { useGuiStore } from "../stores/gui"
import SelectionNavigator from "./SelectionNavigator.vue"
import GlobalInspector from "../inspectors/GlobalInspector.vue"
import StationInspector from "../inspectors/StationInspector.vue"
import LineInspector from "../inspectors/LineInspector.vue"
import JourneyInspector from "../inspectors/JourneyInspector.vue"
import HaltInspector from "../inspectors/HaltInspector.vue"
import LineList from "./LineList.vue"
import LineInfo from "./LineInfo.vue"
import SetInfo from "./SetInfo.vue"

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
