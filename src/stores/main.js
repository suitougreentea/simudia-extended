import { defineStore } from "pinia"

import TimeUtil, { SECOND_DIVISOR } from "../time-util"

const fileVersion = 0

/*
type Station = {
  name: string
  width: number
  id: number
}

export type Line = {
  name: string
  divisor: number
  lineWidth: number
  color: string
  defaultLoadingTime: Time
  reversingTime: Time
  halts: Array<LineHalt>
  visible: boolean
}

type LineHalt = {
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
*/

const getEmptyState = () => {
  return {
    monthLength: TimeUtil.fromHMS(6, 24, 0),
    shiftDivisor: 1440,
    stations: [],
    lines: [],

    currentFile: "",
    modified: false
  }
}

const findStationIndex = (state) => {
  return function(id) {
    return state.stations.findIndex(e => id === e.id)
  }
}

const getEmptyLineHalt = (defaultLoadingTime) => {
  return {
    // stationId: number
    // time: Time
    overrideLoadingTime: false,
    loadingTime: defaultLoadingTime,
    reverse: false,
    wait: false,
    waitTime: 0,
    scheduled: false,
    departureTime: 0,
    skip: false
  }
}

export const useMainStore = defineStore("main", {
  state: () => getEmptyState(),
  getters: {
    accumulatedStationTimes(state) {
      const stations = state.stations
      const lines = state.lines
      const length = stations.length
      const result = []
      let time = 0
      for (let i = 0; i < length; i++) {
        const curr = stations[i]
        result.push(time)
        if (i === length - 1) continue
        const next = stations[(i+1) % length]
        const id1 = curr.id
        const id2 = next.id
        const found = []
        lines.forEach(line => {
          const halts = line.halts
          const haltsLength = halts.length
          for (let j = 0; j < haltsLength; j++) {
            const currHalt = halts[j]
            const nextHalt = halts[(j+1) % haltsLength]
            if ((id1 === currHalt.stationId && id2 === nextHalt.stationId) ||
                (id1 === nextHalt.stationId && id2 === currHalt.stationId)) {
              found.push(currHalt.time)
            }
          }
        })
        // const averageTime = (found.length > 0) ? found.reduce((a, b) => a + b) / found.length : 20 * 3600
        const slowestTime = (found.length > 0) ? Math.max(...found) : 20 * 3600
        time += slowestTime
      }
      return result
    },
    findStationIndex,
    findStation(state, getters) {
      return function(id) {
        return state.stations[this.findStationIndex(id)]
      }
    },
    computedTimes(state) {
      const lines = state.lines
      return lines.map(line => {
        const halts = line.halts
        const result = Array.from({length: halts.length}, _ => { return {arrival: null, wait: null, departure: null} })
        const length = halts.length
        let accum = 0
        let firstScheduledIndex = halts.findIndex(e => e.scheduled && !e.skip)
        if (firstScheduledIndex >= 0) {
          accum = halts[firstScheduledIndex].departureTime
        } else {
          firstScheduledIndex = 0
        }
        for (let j = 0; j < length; j++) {
          const i = (j + firstScheduledIndex) % length
          const halt = halts[i]
          const nextHalt = halts[(i+1) % length]
          result[i].departure = accum
          accum += halt.skip ? 0 : halt.time
          result[(i+1) % length].arrival = accum
          if (nextHalt.skip) {
            result[(i + 1) % length].scheduled = false
            result[(i + 1) % length].wait = 0
          } else {
            const waitTime = nextHalt.wait ? nextHalt.waitTime : 0
            const loadingTime = nextHalt.overrideLoadingTime ? nextHalt.loadingTime : line.defaultLoadingTime
            const reversingTime = nextHalt.reverse ? line.reversingTime : 0
            const wait = Math.max(waitTime, loadingTime, reversingTime)
            let resultingWait
            if (nextHalt.scheduled) {
              const interval = state.monthLength / line.divisor
              let dep = nextHalt.departureTime % interval
              while (accum + wait > dep) dep += interval
              resultingWait = dep - accum
            } else {
              resultingWait = wait
            }
            result[(i + 1) % length].scheduled = nextHalt.scheduled || nextHalt.wait
            result[(i + 1) % length].wait = resultingWait
            accum += resultingWait
          }
        }

        return result
      })
    },
    baseName(state) {
      if (state.currentFile !== "") {
        return state.currentFile
      }
      return "New File"
    },
    jsonString(state) {
      return JSON.stringify({
        fileVersion,
        monthLength: state.monthLength,
        shiftDivisor: state.shiftDivisor,
        stations: state.stations,
        lines: state.lines,
      }, null, 2)
    },
    /* modified(state): boolean {
      return true
    } */
  },
  actions: {
    emptyState() {
      this.$patch(getEmptyState())
    },
    modifyMonthLength({ value }) {
      this.monthLength = value
      this.setModified(true)
    },
    modifyShiftDivisor({ value }) {
      this.shiftDivisor = value
      this.setModified(true)
    },
    addStation({ pos: _pos, name, width }) {
      const pos = (_pos == null) ? this.stations.length : _pos
      // get unused ID
      let id
      do { id = Math.floor(Math.random() * 4294967296) } while (this.stations.some(e => e.id === id))
      this.stations.splice(pos, 0, { name, width, id })
      this.setModified(true)
    },
    modifyStation({ pos, name, width }) {
      const old = this.stations[pos]
      this.stations[pos] = { name, width, id: old.id }
      this.setModified(true)
    },
    deleteStation({ pos }) {
      const station = this.stations[pos]
      const id = station.id
      this.stations.splice(pos, 1)
      this.lines.forEach((line, lineIndex) => {
        let i = 0
        while (i < line.halts.length) {
          if (line.halts[i].stationId === id) {
            this.deleteHalt({ lineIndex, haltIndex: i })
          } else i++
        }
        if (line.halts.length === 0) {
          this.deleteLine(lineIndex)
        }
      })
      this.setModified(true)
    },
    addLine({ stationIndices, times, firstTime }) {
      const halts = []
      const size = stationIndices.length - 1
      for (let i = 0; i < size; i++) {
        const prev = stationIndices[(i + size - 1) % size]
        const curr = stationIndices[i]
        const next = stationIndices[(i + 1) % size]
        const reverse = (curr - prev) * (curr - next) > 0
        const stationId = this.stations[curr].id
        halts.push({ ...getEmptyLineHalt(30 * SECOND_DIVISOR), stationId, time: times[i], reverse })
      }
      halts[0].scheduled = true
      halts[0].departureTime = firstTime
      this.lines.push({ name: "New Line", divisor: 1, lineWidth: 1, color: "#000000", halts, defaultLoadingTime: 30 * SECOND_DIVISOR, reversingTime: 60 * SECOND_DIVISOR, visible: true })
      this.setModified(true)
    },
    deleteLine(index) {
      this.lines.splice(index, 1)
      this.setModified(true)
    },
    modifyLine({ index, key, value }) {
      this.lines[index][key] = value
      this.setModified(true)
    },
    modifyLineHalt({ lineIndex, haltIndex, key, value }) {
      this.lines[lineIndex].halts[haltIndex][key] = value
      this.setModified(true)
    },
    insertHalts({ lineIndex, haltIndex, stationIndices, times }) {
      const line = this.lines[lineIndex]
      const halts = line.halts
      const insertingHalts = []
      for (let i = 0; i < stationIndices.length - 1; i++) {
        insertingHalts.push({
          ...getEmptyLineHalt(line.defaultLoadingTime),
          stationId: this.stations[stationIndices[i]].id,
          time: times[i],
          reverse: false // reverses are set later
        })
      }
      const newHalts = halts.map(e => e)
      insertingHalts[0] = {...newHalts[haltIndex], ...insertingHalts[0]}
      newHalts.splice(haltIndex, 1, ...insertingHalts)

      // update reverses
      const size = newHalts.length
      for (let i = haltIndex; i < haltIndex + stationIndices.length; i++) {
        const prev = findStationIndex(this)(newHalts[(i+size-1) % size].stationId)
        const curr = findStationIndex(this)(newHalts[i % size].stationId) // because i == size when inserting at tail
        const next = findStationIndex(this)(newHalts[(i+1) % size].stationId)

        const reverse = (curr - prev) * (curr - next) > 0
        newHalts[i % size].reverse = reverse
      }
      this.lines[lineIndex].halts = newHalts
      this.setModified(true)
    },
    deleteHalt({ lineIndex, haltIndex }) {
      const halts = this.lines[lineIndex].halts
      halts.splice(haltIndex, 1)
      const size = halts.length
      if (size <= 1) return
      if (halts[(haltIndex+size-1)%size].stationId === halts[haltIndex%size].stationId) {
        // v
        halts.splice((haltIndex+size-1)%size, 1)
        const newSize = halts.length
        halts[(haltIndex+newSize-1)%newSize].reverse = true
      } else {
        // / or \
        const newTime = halts[(haltIndex+size-1)%size].time + halts[haltIndex%size].time
        halts[(haltIndex+size-1)%size].time = newTime
      }
      this.setModified(true)
    },
    setSaved(filename) {
      this.currentFile = filename
      this.setModified(false)
    },
    loadFromJsonString(filename, text) {
      const json = JSON.parse(text)
      this.$patch({
        ...json,
        currentFile: filename
      })
      this.setModified(false)
    },
    setModified(modified) {
      this.modified = modified
    },
  },
})
