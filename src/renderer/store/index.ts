import * as Vuex from "vuex";
//import VuexUndoRedo from "vuex-undo-redo";

//import Counter, { CounterState } from "./modules/Counter";

import { Time } from "../../types"
import TimeUtil, { SECOND_DIVISOR } from "../../time-util"

import Vue from "vue";

const fs = require("fs")
const path = require("path")

Vue.use(Vuex);
//Vue.use(VuexUndoRedo);

const fileVersion = 0

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

const getEmptyState = () => {
  return {
    monthLength: TimeUtil.fromHMS(6, 24, 0),
    shiftDivisor: 1440,
    stations: new Array<Station>(),
    lines: new Array<Line>(),

    currentFile: "",
    modified: false
  }
}

const ignoredMutations = ["emptyState"]

const findStationIndex = (state: { stations: Array<Station> }) => {
  return function (id: number): number {
    return state.stations.findIndex(e => id == e.id)
  }
}

const getEmptyLineHalt = (defaultLoadingTime: Time) => {
  return {
    //stationId: number
    //time: Time
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
        if (type == "setModified") return
        if (type == "loadFromFile" || type == "saveToFile") {
          store.commit("setModified", false)
        }
        else if (ignoredMutations.every((e) => mutation.type != e)) {
          store.commit("setModified", true)
        }
      })
    }
  ],
  state: getEmptyState(),
  getters: {
    accumulatedStationTimes(state): Array<any> {
      const stations = state.stations
      const lines: Array<Line> = state.lines
      const length = stations.length
      const result: Array<any> = []
      let time = 0
      for (let i = 0; i < length; i++) {
        const curr = stations[i]
        result.push(time)
        if (i == length - 1) continue
        const next = stations[(i+1) % length]
        const id1 = curr.id
        const id2 = next.id
        const found: Array<number> = []
        lines.forEach(line => {
          const halts = line.halts
          const haltsLength = halts.length
          for (let j = 0; j < haltsLength; j++) {
            const currHalt = halts[j]
            const nextHalt = halts[(j+1) % haltsLength]
            if (id1 == currHalt.stationId && id2 == nextHalt.stationId ||
                id1 == nextHalt.stationId && id2 == currHalt.stationId) {
              found.push(currHalt.time)
            }
          }
        });
        //const averageTime = (found.length > 0) ? found.reduce((a, b) => a + b) / found.length : 20 * 3600
        const slowestTime = (found.length > 0) ? Math.max(...found) : 20 * 3600
        time += slowestTime
      }
      return result
    },
    findStationIndex,
    findStation(state, getters) {
      return function (id: number): Station {
        return state.stations[getters.findStationIndex(id)]
      }
    },
    computedTimes(state): Array<Array<any>> {
      const lines: Array<Line> = state.lines
      return lines.map(line => {
        const halts = line.halts
        const result: Array<any> = Array.from({length: halts.length}, _ => { return {arrival: null, wait: null, departure: null} })
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
            let resultingWait: number
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
    baseName(state): string {
      if (state.currentFile != "") {
        return path.basename(state.currentFile)
      }
      return "New File"
    },
    /*modified(state): boolean { 
      return true
    }*/
  },
  mutations: {
    emptyState() {
      this.replaceState(getEmptyState(), null)
    },
    modifyGlobal(state, data: { key: string, value: any }) {
      Vue.set(state, data.key, data.value)
    },
    addStation(state, data: {pos: number, name: string, width: number}) {
      let pos: number
      if (data.pos == null) pos = state.stations.length
      else pos = data.pos 
      // get unused ID
      let id: number
      do { id = Math.floor(Math.random() * 4294967296) } while(state.stations.some(e => e.id == id))
      state.stations.splice(pos, 0, { name: data.name, width: data.width, id: id })
    },
    modifyStation(state, data: { pos: number, name: string, width: number }) {
      const old = state.stations[data.pos]
      Vue.set(state.stations, data.pos, { name: data.name, width: data.width, id: old.id } )
    },
    deleteStation(state, data: { pos: number }) {
      state.stations.splice(data.pos, 1)
    },
    addLine(state, data: { stationIndices: Array<number>, times: Array<number>, firstTime: Time }) {
      const halts: Array<LineHalt> = []
      const size = data.stationIndices.length - 1
      for (let i = 0; i < size; i++) {
        const prev = data.stationIndices[(i + size - 1) % size]
        const curr = data.stationIndices[i]
        const next = data.stationIndices[(i + 1) % size]
        const reverse = (curr - prev) * (curr - next) > 0
        const stationId = state.stations[curr].id
        halts.push({ ...getEmptyLineHalt(30 * SECOND_DIVISOR), stationId, time: data.times[i], reverse })
      }
      halts[0].scheduled = true
      halts[0].departureTime = data.firstTime
      state.lines.push({ name: "New Line", divisor: 1, lineWidth: 1, color: "#000000", halts, defaultLoadingTime: 30 * SECOND_DIVISOR, reversingTime: 60 * SECOND_DIVISOR, visible: true })
    },
    deleteLine(state, index: number) {
      state.lines.splice(index, 1)
    },
    modifyLine(state, data: { index: number, key: string, value: any }) {
      Vue.set(state.lines[data.index], data.key, data.value)
    },
    modifyLineHalt(state, data: { lineIndex: number, haltIndex: number, key: string, value: any }) {
      Vue.set(state.lines[data.lineIndex].halts[data.haltIndex], data.key, data.value)
    },
    insertHalts(state, data: { lineIndex: number, haltIndex: number, stationIndices: Array<number>, times: Array<number> }) {
      const line = state.lines[data.lineIndex]
      const halts = line.halts
      const insertingHalts = []
      for (let i = 0; i < data.stationIndices.length - 1; i++) {
        insertingHalts.push({
          ...getEmptyLineHalt(line.defaultLoadingTime),
          stationId: state.stations[data.stationIndices[i]].id,
          time: data.times[i],
          reverse: false  // reverses are set later
        })
      }
      const newHalts = halts.map(e => e)
      insertingHalts[0] = {...newHalts[data.haltIndex], ...insertingHalts[0]}
      newHalts.splice(data.haltIndex, 1, ...insertingHalts)

      // update reverses
      const size = newHalts.length
      for (let i = data.haltIndex; i < data.haltIndex + data.stationIndices.length; i++) {
        const prev = findStationIndex(state)(newHalts[(i+size-1) % size].stationId)
        const curr = findStationIndex(state)(newHalts[i % size].stationId)  // because i == size when inserting at tail
        const next = findStationIndex(state)(newHalts[(i+1) % size].stationId)

        const reverse = (curr - prev) * (curr - next) > 0
        newHalts[i % size].reverse = reverse
      }
      Vue.set(state.lines[data.lineIndex], "halts", newHalts)
    },
    deleteHalt(state, data: { lineIndex: number, haltIndex: number }) {
      const halts = state.lines[data.lineIndex].halts
      halts.splice(data.haltIndex, 1)
      const size = halts.length
      if (size <= 1) return
      if (halts[(data.haltIndex+size-1)%size].stationId == halts[data.haltIndex%size].stationId) {
        // v
        halts.splice((data.haltIndex+size-1)%size, 1)
        const newSize = halts.length
        Vue.set(halts[(data.haltIndex+newSize-1)%newSize], "reverse", true)
      } else {
        // / or \
        const newTime = halts[(data.haltIndex+size-1)%size].time + halts[data.haltIndex%size].time
        Vue.set(halts[(data.haltIndex+size-1)%size], "time", newTime)
      }
    },
    saveToFile(state, data: { path: string }) {
      fs.writeFileSync(data.path, JSON.stringify({
        fileVersion,
        monthLength: state.monthLength,
        shiftDivisor: state.shiftDivisor,
        stations: state.stations,
        lines: state.lines,
      }, null, 2), "utf8")
      state.currentFile = data.path
    },
    loadFromFile(state, data: { path: string }) {
      const result = fs.readFileSync(data.path, "utf8")
      const json = JSON.parse(result)
      this.replaceState({
        ...state,
        ...json,
        currentFile: data.path
      }, null)
    },
    setModified(state, modified: boolean) {
      state.modified = modified
    }
  },
  actions: {
    deleteStation({ state, commit }, data: { pos: number }) {
      const station = state.stations[data.pos]
      const id = station.id
      commit("deleteStation", data)
      state.lines.forEach((line, lineIndex) => {
        let i = 0
        while (i < line.halts.length) {
          if (line.halts[i].stationId == id) {
            commit("deleteHalt", { lineIndex, haltIndex: i })
          } else i ++
        }
        if (line.halts.length == 0) {
          commit("deleteLine", lineIndex)
        }
      })
    }

  },
  strict: process.env.NODE_ENV !== "production"
});
