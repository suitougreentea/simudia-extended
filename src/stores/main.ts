import { defineStore } from "pinia"

import * as TimeUtil from "../time-util"
import { computed, ref } from "vue"

export type Time = number

export type Station = {
  name: string
  id: number
}

export type Line = {
  name: string
  divisor: number
  lineWidth: number
  color: string
  defaultLoadingTime: Time
  reversingTime: Time
  halts: LineHalt[]
  visible: boolean
}

export type LineHalt = {
  stationId: number
  time: Time
  overrideLoadingTime: boolean
  loadingTime: Time
  reverse: boolean
  wait: boolean
  waitTime: Time
  scheduled: boolean
  departureTime: Time
  skip: boolean
}

type ComputedLineTime = {
  haltTimes: ComputedHaltTime[]
  setOffset: number
}

type ComputedHaltTime = {
  arrival: number
  wait: number
  departure: number
  journey: number
  scheduled: boolean
}

export type State = {
  monthLength: Time
  shiftDivisor: number
  stations: Station[]
  lines: Line[]
}

const getEmptyState = (): State => {
  return {
    monthLength: TimeUtil.fromHMS(6, 24, 0),
    shiftDivisor: 1440,
    stations: [],
    lines: [],
  }
}

const getEmptyLineHalt = (defaultLoadingTime: number): LineHalt => {
  return {
    stationId: -1,
    time: -1,
    overrideLoadingTime: false,
    loadingTime: defaultLoadingTime,
    reverse: false,
    wait: false,
    waitTime: 0,
    scheduled: false,
    departureTime: 0,
    skip: false,
  }
}

export const useMainStore = defineStore("main", () => {
  const initialState = getEmptyState()
  const monthLength = ref(initialState.monthLength)
  const shiftDivisor = ref(initialState.shiftDivisor)
  const stations = ref<Station[]>(initialState.stations)
  const lines = ref<Line[]>(initialState.lines)

  const clear = () => {
    const emptyState = getEmptyState()
    monthLength.value = emptyState.monthLength
    shiftDivisor.value = emptyState.shiftDivisor
    stations.value = emptyState.stations
    lines.value = emptyState.lines
  }

  const timeList = computed(() => {
    const result: { fromStationId: number; toStationId: number; lineIndex: number; haltIndex: number; time: number }[] = []

    lines.value.forEach((line, lineIndex) => {
      for (let i = 0; i < line.halts.length; i++) {
        if (line.halts[i].skip) continue
        const from = line.halts[i]
        const to = line.halts[(i + 1) % line.halts.length]

        result.push({
          fromStationId: from.stationId,
          toStationId: to.stationId,
          lineIndex,
          haltIndex: i,
          time: from.time,
        })
      }
    })
    return result
  })

  const findStationIndex = (id: number) => stations.value.findIndex((e) => id === e.id)
  const findStation = (id: number) => stations.value[findStationIndex(id)]

  const computedTimes = computed(() => {
    return lines.value.map((line) => {
      const halts = line.halts
      const haltTimes: ComputedHaltTime[] = Array.from({ length: halts.length }, () => {
        return { arrival: 0, wait: 0, departure: 0, journey: 0, scheduled: false }
      })
      const length = halts.length
      let accum = 0
      let firstScheduledIndex = halts.findIndex((e) => e.scheduled && !e.skip)
      if (firstScheduledIndex >= 0) {
        accum = halts[firstScheduledIndex].departureTime
      } else {
        firstScheduledIndex = 0
      }
      for (let j = 0; j < length; j++) {
        const i = (j + firstScheduledIndex) % length
        const halt = halts[i]
        const nextHalt = halts[(i + 1) % length]
        haltTimes[i].departure = accum
        haltTimes[i].journey = halt.skip ? 0 : halt.time
        accum += halt.skip ? 0 : halt.time
        haltTimes[(i + 1) % length].arrival = accum
        if (nextHalt.skip) {
          haltTimes[(i + 1) % length].scheduled = false
          haltTimes[(i + 1) % length].wait = 0
        } else {
          const waitTime = nextHalt.wait ? nextHalt.waitTime : 0
          const loadingTime = nextHalt.overrideLoadingTime ? nextHalt.loadingTime : line.defaultLoadingTime
          const reversingTime = nextHalt.reverse ? line.reversingTime : 0
          const wait = Math.max(waitTime, loadingTime, reversingTime)
          let resultingWait
          if (nextHalt.scheduled) {
            const interval = monthLength.value / line.divisor
            let dep = nextHalt.departureTime % interval
            while (accum + wait > dep) dep += interval
            resultingWait = dep - accum
          } else {
            resultingWait = wait
          }
          haltTimes[(i + 1) % length].scheduled = nextHalt.scheduled || nextHalt.wait
          haltTimes[(i + 1) % length].wait = resultingWait
          accum += resultingWait
        }
      }

      const firstHaltTime = haltTimes[0]
      const setOffset = Math.round((firstHaltTime.arrival - (firstHaltTime.departure - firstHaltTime.wait)) / (monthLength.value / line.divisor))

      return {
        haltTimes,
        setOffset,
      } as ComputedLineTime
    })
  })

  const modifyMonthLength = ({ value }: { value: number }) => {
    monthLength.value = value
  }
  const modifyShiftDivisor = ({ value }: { value: number }) => {
    shiftDivisor.value = value
  }
  const addStation = ({ pos: _pos, name }: { pos?: number; name: string }) => {
    const pos = _pos == null ? stations.value.length : _pos
    // get unused ID
    let id: number
    do {
      id = Math.floor(Math.random() * 4294967296)
    } while (stations.value.some((e) => e.id === id))
    stations.value.splice(pos, 0, { name, id })
  }
  const modifyStation = ({ pos, name }: { pos: number; name: string }) => {
    const old = stations.value[pos]
    stations.value[pos] = { name, id: old.id }
  }
  const deleteStation = ({ pos }: { pos: number }) => {
    const station = stations.value[pos]
    const id = station.id
    stations.value.splice(pos, 1)
    lines.value.forEach((line, lineIndex) => {
      let i = 0
      while (i < line.halts.length) {
        if (line.halts[i].stationId === id) {
          deleteHalt({ lineIndex, haltIndex: i })
        } else i++
      }
      if (line.halts.length === 0) {
        deleteLine(lineIndex)
      }
    })
  }
  const addLine = ({ stationIndices, times, firstTime }: { stationIndices: number[]; times: Time[]; firstTime: Time }) => {
    const halts: LineHalt[] = []
    const size = stationIndices.length - 1
    for (let i = 0; i < size; i++) {
      const prev = stationIndices[(i + size - 1) % size]
      const curr = stationIndices[i]
      const next = stationIndices[(i + 1) % size]
      const reverse = (curr - prev) * (curr - next) > 0
      const stationId = stations.value[curr].id
      halts.push({ ...getEmptyLineHalt(30 * TimeUtil.SECOND_DIVISOR), stationId, time: times[i], reverse })
    }
    halts[0].scheduled = true
    halts[0].departureTime = firstTime
    lines.value.push({
      name: "New Line",
      divisor: 1,
      lineWidth: 1,
      color: "#000000",
      halts,
      defaultLoadingTime: 30 * TimeUtil.SECOND_DIVISOR,
      reversingTime: 60 * TimeUtil.SECOND_DIVISOR,
      visible: true,
    })
  }
  const copyLine = (index: number) => {
    lines.value.push({
      ...lines.value[index],
      halts: lines.value[index].halts.map((e) => ({ ...e })),
      name: `Copy of ${lines.value[index].name}`,
    })
  }
  const deleteLine = (index: number) => {
    lines.value.splice(index, 1)
  }
  const modifyLine = <TKey extends keyof Line>({ index, key, value }: { index: number; key: TKey; value: Line[TKey] }) => {
    lines.value[index][key] = value
  }
  const modifyLineHalt = <TKey extends keyof LineHalt>({ lineIndex, haltIndex, key, value }: { lineIndex: number; haltIndex: number; key: TKey; value: LineHalt[TKey] }) => {
    lines.value[lineIndex].halts[haltIndex][key] = value
  }
  const insertHalts = ({ lineIndex, haltIndex, stationIndices, times }: { lineIndex: number; haltIndex: number; stationIndices: number[]; times: Time[] }) => {
    const line = lines.value[lineIndex]
    const halts = line.halts
    const insertingHalts: LineHalt[] = []
    for (let i = 0; i < stationIndices.length - 1; i++) {
      insertingHalts.push({
        ...getEmptyLineHalt(line.defaultLoadingTime),
        stationId: stations.value[stationIndices[i]].id,
        time: times[i],
        reverse: false, // reverses are set later
      })
    }
    const newHalts = halts.map((e) => e)
    insertingHalts[0] = { ...newHalts[haltIndex], ...insertingHalts[0] }
    newHalts.splice(haltIndex, 1, ...insertingHalts)

    // update reverses
    const size = newHalts.length
    for (let i = haltIndex; i < haltIndex + stationIndices.length; i++) {
      const prev = findStationIndex(newHalts[(i + size - 1) % size].stationId)
      const curr = findStationIndex(newHalts[i % size].stationId) // because i == size when inserting at tail
      const next = findStationIndex(newHalts[(i + 1) % size].stationId)

      const reverse = (curr - prev) * (curr - next) > 0
      newHalts[i % size].reverse = reverse
    }
    lines.value[lineIndex].halts = newHalts
  }
  const deleteHalt = ({ lineIndex, haltIndex }: { lineIndex: number; haltIndex: number }) => {
    const halts = lines.value[lineIndex].halts
    halts.splice(haltIndex, 1)
    const size = halts.length
    if (size <= 1) return
    if (halts[(haltIndex + size - 1) % size].stationId === halts[haltIndex % size].stationId) {
      // v
      halts.splice((haltIndex + size - 1) % size, 1)
      const newSize = halts.length
      halts[(haltIndex + newSize - 1) % newSize].reverse = true
    } else {
      // / or \
      const newTime = halts[(haltIndex + size - 1) % size].time + halts[haltIndex % size].time
      halts[(haltIndex + size - 1) % size].time = newTime
    }
  }

  return {
    monthLength,
    shiftDivisor,
    stations,
    lines,
    clear,
    timeList,
    findStationIndex,
    findStation,
    computedTimes,
    modifyMonthLength,
    modifyShiftDivisor,
    addStation,
    modifyStation,
    deleteStation,
    addLine,
    copyLine,
    deleteLine,
    modifyLine,
    modifyLineHalt,
    insertHalts,
    deleteHalt,
  }
})
