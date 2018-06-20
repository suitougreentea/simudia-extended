import * as Vuex from "vuex"
// import VuexUndoRedo from "vuex-undo-redo";

import TimeUtil, { SECOND_DIVISOR } from "../../time-util"

import Vue from "vue"

const fs = require("fs")
const path = require("path")

Vue.use(Vuex)
// Vue.use(VuexUndoRedo);

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

const ignoredMutations = ["emptyState"]

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

export default new Vuex.Store({
  plugins: [
    (store) => {
      store.subscribe((mutation, state) => {
        const type = mutation.type
        if (type === "setModified") return
        if (type === "loadFromFile" || type === "saveToFile") {
          store.commit("setModified", false)
        } else if (ignoredMutations.every((e) => mutation.type !== e)) {
          store.commit("setModified", true)
        }
      })
    }
  ],
  state: getEmptyState(),
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
        return state.stations[getters.findStationIndex(id)]
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
        return path.basename(state.currentFile)
      }
      return "New File"
    },
    /* modified(state): boolean {
      return true
    } */
  },
  mutations: {
    emptyState() {
      this.replaceState(getEmptyState(), null)
    },
    modifyGlobal(state, { key, value }) {
      Vue.set(state, key, value)
    },
    addStation(state, { pos: _pos, name, width }) {
      const pos = (_pos == null) ? state.stations.length : _pos
      // get unused ID
      let id
      do { id = Math.floor(Math.random() * 4294967296) } while (state.stations.some(e => e.id === id))
      state.stations.splice(pos, 0, { name, width, id })
    },
    modifyStation(state, { pos, name, width }) {
      const old = state.stations[pos]
      Vue.set(state.stations, pos, { name, width, id: old.id })
    },
    deleteStation(state, { pos }) {
      state.stations.splice(pos, 1)
    },
    addLine(state, { stationIndices, times, firstTime }) {
      const halts = []
      const size = stationIndices.length - 1
      for (let i = 0; i < size; i++) {
        const prev = stationIndices[(i + size - 1) % size]
        const curr = stationIndices[i]
        const next = stationIndices[(i + 1) % size]
        const reverse = (curr - prev) * (curr - next) > 0
        const stationId = state.stations[curr].id
        halts.push({ ...getEmptyLineHalt(30 * SECOND_DIVISOR), stationId, time: times[i], reverse })
      }
      halts[0].scheduled = true
      halts[0].departureTime = firstTime
      state.lines.push({ name: "New Line", divisor: 1, lineWidth: 1, color: "#000000", halts, defaultLoadingTime: 30 * SECOND_DIVISOR, reversingTime: 60 * SECOND_DIVISOR, visible: true })
    },
    deleteLine(state, index) {
      state.lines.splice(index, 1)
    },
    modifyLine(state, { index, key, value }) {
      Vue.set(state.lines[index], key, value)
    },
    modifyLineHalt(state, { lineIndex, haltIndex, key, value }) {
      Vue.set(state.lines[lineIndex].halts[haltIndex], key, value)
    },
    insertHalts(state, { lineIndex, haltIndex, stationIndices, times }) {
      const line = state.lines[lineIndex]
      const halts = line.halts
      const insertingHalts = []
      for (let i = 0; i < stationIndices.length - 1; i++) {
        insertingHalts.push({
          ...getEmptyLineHalt(line.defaultLoadingTime),
          stationId: state.stations[stationIndices[i]].id,
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
        const prev = findStationIndex(state)(newHalts[(i+size-1) % size].stationId)
        const curr = findStationIndex(state)(newHalts[i % size].stationId) // because i == size when inserting at tail
        const next = findStationIndex(state)(newHalts[(i+1) % size].stationId)

        const reverse = (curr - prev) * (curr - next) > 0
        newHalts[i % size].reverse = reverse
      }
      Vue.set(state.lines[lineIndex], "halts", newHalts)
    },
    deleteHalt(state, { lineIndex, haltIndex }) {
      const halts = state.lines[lineIndex].halts
      halts.splice(haltIndex, 1)
      const size = halts.length
      if (size <= 1) return
      if (halts[(haltIndex+size-1)%size].stationId === halts[haltIndex%size].stationId) {
        // v
        halts.splice((haltIndex+size-1)%size, 1)
        const newSize = halts.length
        Vue.set(halts[(haltIndex+newSize-1)%newSize], "reverse", true)
      } else {
        // / or \
        const newTime = halts[(haltIndex+size-1)%size].time + halts[haltIndex%size].time
        Vue.set(halts[(haltIndex+size-1)%size], "time", newTime)
      }
    },
    saveToFile(state, { path }) {
      fs.writeFileSync(path, JSON.stringify({
        fileVersion,
        monthLength: state.monthLength,
        shiftDivisor: state.shiftDivisor,
        stations: state.stations,
        lines: state.lines,
      }, null, 2), "utf8")
      state.currentFile = path
    },
    loadFromFile(state, { path }) {
      const result = fs.readFileSync(path, "utf8")
      const json = JSON.parse(result)
      this.replaceState({
        ...state,
        ...json,
        currentFile: path
      }, null)
    },
    setModified(state, modified) {
      state.modified = modified
    }
  },
  actions: {
    deleteStation({ state, commit }, { pos }) {
      const station = state.stations[pos]
      const id = station.id
      commit("deleteStation", { pos })
      state.lines.forEach((line, lineIndex) => {
        let i = 0
        while (i < line.halts.length) {
          if (line.halts[i].stationId === id) {
            commit("deleteHalt", { lineIndex, haltIndex: i })
          } else i++
        }
        if (line.halts.length === 0) {
          commit("deleteLine", lineIndex)
        }
      })
    }

  },
  strict: process.env.NODE_ENV !== "production"
})
