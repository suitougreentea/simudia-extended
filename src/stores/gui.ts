import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { useMainStore } from "./main"

const MARGIN = 20
const HEADER_HEIGHT = 20

export const useGuiStore = defineStore("gui", () => {
  const data = useMainStore()

  const mode = ref("edit")
  const inputtingTime = ref(false)
  const lineSelection = ref({
    hoveredLine: -1,
    hoveredSet: -1,
    hoveredHalt: -1,
    hoveredType: -1,
    selectedLine: -1,
    selectedSet: -1,
    selectedHalt: -1,
    selectedType: -1
  })
  const stationSelection = ref({
    hovered: -1,
    selected: -1
  })
  const hoveredTime = ref(-1)
  const modifierStates = ref({
    control: false,
    shift: false
  })
  const lineInsertOrigin = ref({
    line: -1,
    halt: -1
  })
  const zoom = ref({
    horizontal: 0,
    vertical: 0
  })

  const layout = computed(() => {
    const stationsWidth = Math.max(100, ...stations.value.map(e => e.width)) + 10

    const monthLength = data.monthLength
    const width = MARGIN + stationsWidth + monthLength / (7200 * Math.pow(2, -zoom.value.horizontal / 2)) + MARGIN

    const ys = accumulatedStationY.value
    let height
    if (ys.length === 0) height = 60
    else height = ys[ys.length - 1] + MARGIN

    return {
      top: MARGIN,
      left: MARGIN,
      right: width - MARGIN,
      bottom: height - MARGIN,
      width,
      height,
      headerHeight: HEADER_HEIGHT,
      stationsWidth
    }
  })

  const stations = computed(() => { return data.stations })

  const accumulatedStationY = computed(() => { return data.accumulatedStationTimes.map(e => (MARGIN + 20 + e / (3600 * Math.pow(2, -zoom.value.vertical / 2)))) })

  const x = (tick) => {
    return layout.value.left + layout.value.stationsWidth + tick / (7200 * Math.pow(2, -zoom.value.horizontal / 2))
  }

  const xi = (x) => {
    return (x - layout.value.left - layout.value.stationsWidth) * (7200 * Math.pow(2, -zoom.value.horizontal / 2))
  }

  const resetInput = (timeInput, lineInputDefs) => {
    timeInput.reset()
    lineInputDefs.reset()
    lineInsertOrigin.value = {
      line: -1,
      halt: -1
    }
    inputtingTime.value = false
    mode.value = "edit"
  }

  const unselectLine = () => {
    lineSelection.value = {
      hoveredLine: -1,
      hoveredSet: -1,
      hoveredHalt: -1,
      hoveredType: -1,
      selectedLine: -1,
      selectedSet: -1,
      selectedHalt: -1,
      selectedType: -1
    }
  }

  const unselectStation = () => {
    stationSelection.value = {
      hovered: -1,
      selected: -1
    }
  }

  const unselectAll = () => {
    unselectLine()
    unselectStation()
  }

  const insertStationAboveSelected = (stationIndex) => {
    data.addStation({
      pos: stationIndex,
      name: "New station",
      width: 100
    })
    stationSelection.value.selected = stationIndex
  }

  const insertStationBelowSelected = (stationIndex) => {
    data.addStation({
      pos: stationIndex + 1,
      name: "New station",
      width: 100
    })
    stationSelection.value.selected = stationIndex + 1
  }

  const deleteSelectedStation = (stationIndex) => {
    const prevSelectedLine = data.lines[lineSelection.value.selectedLine]
    data.deleteStation({
      pos: stationIndex,
    })
    if (stationSelection.value.selected == stationIndex) {
      stationSelection.value.selected = -1
    }
    const selectedLine = data.lines[lineSelection.value.selectedLine]
    if (prevSelectedLine !== selectedLine) {
      lineSelection.value.selectedLine = -1
      lineSelection.value.selectedSet = -1
      lineSelection.value.selectedHalt = -1
      lineSelection.value.selectedType = -1
    }
  }

  const insertHaltToSelectedLine = (haltIndex, lineInputDefs) => {
    const lineIndex = lineSelection.value.selectedLine
    const setIndex = lineSelection.value.selectedSet
    const line = data.lines[lineIndex]

    const monthLength = data.monthLength
    const halts = data.lines[lineIndex].halts
    const halt = halts[haltIndex]
    const nextHalt = halts[(haltIndex + 1)%halts.length]
    const stationIndex = data.findStationIndex(halt.stationId)
    const nextStationIndex = data.findStationIndex(nextHalt.stationId)
    const time = (data.computedTimes[lineIndex][haltIndex].departure + monthLength / line.divisor * setIndex) % monthLength

    lineInsertOrigin.value = {
      line: lineIndex,
      halt: haltIndex,
    }
    mode.value = "input"
    lineInputDefs.setTerminal(nextStationIndex)
    lineInputDefs.addPoint({ station: stationIndex, time: time, skip: false })
  }

  const deleteHaltFromSelectedLine = (haltIndex) => {
    const lineIndex = lineSelection.value.selectedLine

    lineSelection.value.selectedHalt = -1
    lineSelection.value.selectedType = -1
    data.deleteHalt({ lineIndex, haltIndex })
  }

  const copySelectedLine = (index) => {
    data.copyLine(index)
    lineSelection.value.selectedLine = data.lines.length - 1
  }

  const deleteSelectedLine = (index) => {
    lineSelection.value.selectedLine = -1
    data.deleteLine(index)
  }

  return {
    mode,
    inputtingTime,
    lineSelection,
    stationSelection,
    hoveredTime,
    modifierStates,
    lineInsertOrigin,
    zoom,
    layout,
    stations,
    accumulatedStationY,
    x,
    xi,
    resetInput,
    unselectLine,
    unselectStation,
    unselectAll,
    insertStationAboveSelected,
    insertStationBelowSelected,
    deleteSelectedStation,
    insertHaltToSelectedLine,
    deleteHaltFromSelectedLine,
    copySelectedLine,
    deleteSelectedLine,
  }
})