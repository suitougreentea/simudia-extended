import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { useMainStore } from "./main"
import { useGuiMessageStore } from "./gui-message"
import { type NewFileHandle, type OpenFileHandle, createNewFileHandle } from "../file-api"

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
  // TODO: refactor incomplete
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
    unselectStations()
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
    unselectStations()
    lineSelection.value.selectedSet = index
    lineSelection.value.selectedHalt = -1
    lineSelection.value.selectedType = -1
    lineSelection.value.hoveredLine = -1
    lineSelection.value.hoveredSet = -1
    lineSelection.value.hoveredHalt = -1
    lineSelection.value.hoveredType = -1
  }

  const hoverSegment = (lineIndex: number, setIndex: number, haltIndex: number, type: number) => {
    lineSelection.value.hoveredLine = lineIndex
    lineSelection.value.hoveredSet = setIndex
    lineSelection.value.hoveredHalt = haltIndex
    lineSelection.value.hoveredType = type
  }

  const unhoverSegment = (lineIndex: number, setIndex: number, haltIndex: number, type: number) => {
    if (lineSelection.value.hoveredHalt === haltIndex && lineSelection.value.hoveredType === type) {
      lineSelection.value.hoveredLine = -1
      lineSelection.value.hoveredSet = -1
      lineSelection.value.hoveredHalt = -1
      lineSelection.value.hoveredType = -1
    }
  }

  const clickSegment = (lineIndex: number, setIndex: number, haltIndex: number, type: number) => {
    unselectStations()
    lineSelection.value.selectedLine = lineIndex
    lineSelection.value.selectedSet = setIndex
    lineSelection.value.selectedHalt = haltIndex
    lineSelection.value.selectedType = type
    lineSelection.value.hoveredLine = lineIndex
    lineSelection.value.hoveredSet = setIndex
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

  const unselectAll = () => {
    unselectLine()
    unselectStations()
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

  // station selections

  const hoveredStationIds = ref<number[]>([])
  const selectedStationIds = ref<number[]>([])

  const resolvedHoveredStations = computed(() => hoveredStationIds.value
    .map(id => stations.value.find(station => station.id == id))
    .filter(station => station != null))
  const resolvedSelectedStations = computed(() => selectedStationIds.value
    .map(id => stations.value.find(station => station.id == id))
    .filter(station => station != null))
  const isSingleStationHovered = computed(() => hoveredStationIds.value.length == 1)
  const isSingleStationSelected = computed(() => selectedStationIds.value.length == 1)

  const hoverStation = (id: number) => {
    hoveredStationIds.value = [id]
  }

  const unhoverStation = (id: number) => {
    if (hoveredStationIds.value.length == 1 && hoveredStationIds.value[0] == id) {
      hoveredStationIds.value = []
    }
  }

  const selectStation = (id: number) => {
    selectedStationIds.value = [id]
  }

  const unselectStations = () => {
    selectedStationIds.value = []
  }

  const toggleAppendStationSelection = (id: number) => {
    if (selectedStationIds.value.findIndex(e => e == id) >= 0) {
      selectedStationIds.value = selectedStationIds.value.filter(e => e != id)
    } else {
      selectedStationIds.value.push(id)
    }
  }

  const selectStationRelativeTo = (id: number, relativeTo: number) => {
    const stationIndex = stations.value.findIndex(e => e.id == id)
    if (stationIndex == -1) return
    selectedStationIds.value = [stations.value[(stationIndex + relativeTo + stations.value.length) % stations.value.length].id]
  }

  const insertStationRelativeTo = (id: number, relativeTo: number) => {
    const stationIndex = stations.value.findIndex(e => e.id == id)
    if (stationIndex == -1) return
    data.addStation({
      pos: stationIndex + relativeTo,
      name: "New station",
    })
    selectedStationIds.value = [stations.value[stationIndex + relativeTo].id]
  }

  const deleteStations = (ids: number[]) => {
    unselectLine()
    ids.forEach(id => {
      const stationIndex = stations.value.findIndex(e => e.id == id)
      if (stationIndex == -1) return
      data.deleteStation({
        pos: stationIndex,
      })
    })
  }

  // journey times

  const getJourneyTimesAmong = (stationIds: number[]) => {
    if (stationIds.length < 2) return []
    stationIds = [...stationIds]
    stationIds.sort((a, b) => data.findStationIndex(a) - data.findStationIndex(b))
    const result: { lineIndex: number, haltIndex: number, fromId: number, toId: number, time: number }[] = []

    for (let i = 0; i < stationIds.length; i++) {
      for (let j = i + 1; j < stationIds.length; j++) {
        const a = stationIds[i]
        const b = stationIds[j]

        ;[[a, b], [b, a]].map(([from, to]) => {
          data.lines.forEach((line, lineIndex) => {
            for (let k = 0; k < line.halts.length; k++) {
              const fromHalt = line.halts[k]
              const toHalt = line.halts[(k + 1) % line.halts.length]
              if (fromHalt.skip) continue
              if (fromHalt.stationId == from && toHalt.stationId == to) {
                result.push({
                  lineIndex,
                  haltIndex: k,
                  fromId: from,
                  toId: to,
                  time: fromHalt.time,
                })
              }
            }
          })
        })
      }
    }

    return result
  }

  return {
    modified,
    currentFileHandle,
    newFile,
    mode,
    inputtingTime,
    lineSelection,
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
    unselectAll,
    insertHaltToSelectedLine,
    deleteHaltFromSelectedLine,
    copySelectedLine,
    deleteSelectedLine,

    // station selections
    hoveredStationIds,
    selectedStationIds,
    resolvedHoveredStations,
    resolvedSelectedStations,
    isSingleStationHovered,
    isSingleStationSelected,
    hoverStation,
    unhoverStation,
    selectStation,
    unselectStations,
    toggleAppendStationSelection,
    selectStationRelativeTo,
    insertStationRelativeTo,
    deleteStations,

    // journey times
    getJourneyTimesAmong,
  }
})