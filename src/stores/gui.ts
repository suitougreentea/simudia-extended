import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { useMainStore } from "./main"
import { useGuiMessageStore } from "./gui-message"
import { NewFileHandle, OpenFileHandle, createNewFileHandle } from "../file-api"

const MARGIN = 20
const HEADER_HEIGHT = 20

const applyZoomX = (input: number, zoom: number) => input / (7200 * Math.pow(2, -zoom / 2))
const applyZoomXInverse = (input: number, zoom: number) => input * (7200 * Math.pow(2, -zoom / 2))
const applyZoomY = (input: number, zoom: number) => input / (3600 * Math.pow(2, -zoom / 2))
const applyZoomYInverse = (input: number, zoom: number) => input * (3600 * Math.pow(2, -zoom / 2))

export const useGuiStore = defineStore("gui", () => {
  const data = useMainStore()
  const message = useGuiMessageStore()

  const currentFileHandle = ref<OpenFileHandle | NewFileHandle>(createNewFileHandle())
  const newFile = () => {
    data.emptyState()
    currentFileHandle.value = createNewFileHandle()
    modified.value = false
  }

  const modified = ref(false)
  data.$subscribe(() => {
    modified.value = true
  })

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

  const stationsWidth = ref(110)

  const layout = computed(() => {
    const monthLength = data.monthLength
    const width = MARGIN + stationsWidth.value + applyZoomX(monthLength, zoom.value.horizontal) + MARGIN

    let height
    if (stations.value.length === 0) height = MARGIN + HEADER_HEIGHT + MARGIN
    else height = MARGIN + HEADER_HEIGHT + applyZoomY(stations.value[stations.value.length - 1].accumulatedTime, zoom.value.vertical) + MARGIN

    return {
      top: MARGIN,
      left: MARGIN,
      right: width - MARGIN,
      bottom: height - MARGIN,
      width,
      height,
      headerHeight: HEADER_HEIGHT,
      stationsWidth: stationsWidth.value,
    }
  })

  const hiddenStationIds = ref<number[]>([])
  const stations = computed(() => {
    const visibleStations = data.stations.filter(e => hiddenStationIds.value.indexOf(e.id) == -1)

    const result: { id: number, name: string, accumulatedTime: number }[] = []
    let accum = MARGIN + 20
    for (let i = 0; i < data.stations.length; i++) {
      const from = data.stations[i]
      const to = data.stations[(i + 1) % data.stations.length]

      result.push({ id: from.id, name: from.name, accumulatedTime: accum })

      const times = data.timeList
        .filter(e => (e.fromStationId == from.id && e.toStationId == to.id) || (e.toStationId == from.id && e.fromStationId == to.id))
        .map(e => e.time)

      const slowestTime = (times.length > 0) ? Math.max(...times) : 20 * 3600
      accum += slowestTime
    }
    return result
  })

  const x = (tick) => {
    return layout.value.left + layout.value.stationsWidth + applyZoomX(tick, zoom.value.horizontal)
  }

  const xi = (x) => {
    return applyZoomXInverse(x - layout.value.left - layout.value.stationsWidth, zoom.value.horizontal)
  }

  const y = (tick) => {
    return layout.value.top + layout.value.headerHeight + applyZoomY(tick, zoom.value.vertical)
  }

  const resetInput = () => {
    lineInsertOrigin.value = {
      line: -1,
      halt: -1
    }
    inputtingTime.value = false
    mode.value = "edit"

    message.resetInput({})
  }

  const hoverLine = (index) => {
    lineSelection.value.hoveredLine = index
    lineSelection.value.hoveredSet = -1
    lineSelection.value.hoveredHalt = -1
    lineSelection.value.hoveredType = -1
  }

  const unhoverLine = (index) => {
    if (lineSelection.value.hoveredLine === index) {
      lineSelection.value.hoveredLine = -1
    }
  }

  const clickLine = (index) => {
    resetInput() // needed by Sidebar
    unselectStation()
    lineSelection.value.selectedLine = index
    lineSelection.value.selectedSet = -1
    lineSelection.value.selectedHalt = -1
    lineSelection.value.selectedType = -1
    lineSelection.value.hoveredLine = index
    lineSelection.value.hoveredSet = -1
    lineSelection.value.hoveredHalt = -1
    lineSelection.value.hoveredType = -1
  }

  const hoverSet = (index) => {
    lineSelection.value.hoveredLine = -1
    lineSelection.value.hoveredSet = index
    lineSelection.value.hoveredHalt = -1
    lineSelection.value.hoveredType = -1
  }

  const unhoverSet = (index) => {
    if (lineSelection.value.hoveredSet === index) {
      lineSelection.value.hoveredLine = -1
      lineSelection.value.hoveredSet = -1
    }
  }

  const clickSet = (index) => {
    unselectStation()
    lineSelection.value.selectedSet = index
    lineSelection.value.selectedHalt = -1
    lineSelection.value.selectedType = -1
    lineSelection.value.hoveredSet = index
    lineSelection.value.hoveredHalt = -1
    lineSelection.value.hoveredType = -1
  }

  const hoverSegment = (haltIndex, type) => {
    lineSelection.value.hoveredHalt = haltIndex
    lineSelection.value.hoveredType = type
  }

  const unhoverSegment = (haltIndex, type) => {
    if (lineSelection.value.hoveredHalt === haltIndex && lineSelection.value.hoveredType === type) {
      lineSelection.value.hoveredLine = -1
      lineSelection.value.hoveredSet = -1
      lineSelection.value.hoveredHalt = -1
      lineSelection.value.hoveredType = -1
    }
  }

  const clickSegment = (haltIndex, type) => {
    unselectStation()
    lineSelection.value.selectedHalt = haltIndex
    lineSelection.value.selectedType = type
    lineSelection.value.hoveredHalt = haltIndex
    lineSelection.value.hoveredType = type
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
    })
    stationSelection.value.selected = stationIndex
  }

  const insertStationBelowSelected = (stationIndex) => {
    data.addStation({
      pos: stationIndex + 1,
      name: "New station",
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

  const insertHaltToSelectedLine = (haltIndex) => {
    const lineIndex = lineSelection.value.selectedLine
    const setIndex = lineSelection.value.selectedSet
    const line = data.lines[lineIndex]

    const monthLength = data.monthLength
    const halts = data.lines[lineIndex].halts
    const halt = halts[haltIndex]
    const nextHalt = halts[(haltIndex + 1)%halts.length]
    const stationIndex = data.findStationIndex(halt.stationId)
    const nextStationIndex = data.findStationIndex(nextHalt.stationId)
    const time = (data.computedTimes[lineIndex].haltTimes[haltIndex].departure + monthLength / line.divisor * setIndex) % monthLength

    lineInsertOrigin.value = {
      line: lineIndex,
      halt: haltIndex,
    }
    mode.value = "input"

    message.setLineInputTerminal({ stationIndex: nextStationIndex })
    message.addLineInputPoint({ stationIndex, time, skip: false })
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
    modified,
    currentFileHandle,
    newFile,
    mode,
    inputtingTime,
    lineSelection,
    stationSelection,
    hoveredTime,
    modifierStates,
    lineInsertOrigin,
    zoom,
    stationsWidth,
    layout,
    hiddenStationIds,
    stations,
    x,
    xi,
    y,
    resetInput,
    hoverLine,
    unhoverLine,
    clickLine,
    hoverSet,
    unhoverSet,
    clickSet,
    hoverSegment,
    unhoverSegment,
    clickSegment,
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