import * as Vuex from "vuex";
import VuexUndoRedo from "vuex-undo-redo";

//import Counter, { CounterState } from "./modules/Counter";

import Time, {SECOND_DIVISOR} from "../../time"

import Vue from "vue";

const fs = require("fs")

Vue.use(Vuex);
Vue.use(VuexUndoRedo);

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
  halts: Array<LineHalt>
}

type LineHalt = {
  stationId: number
  time: Time
  loadingTime?: Time
  reverse: boolean
  reversingTime?: Time
  wait?: Time
  schedule?: Time
}

const getEmptyState = () => {
  return {
    month_length: Time.fromHMS(6, 24, 0),
    shift_divisor: 1440,
    zoom_level: 0,
    stations: new Array<Station>(),
    lines: new Array<Line>()
  }
}

/*const set = (obj: any, values: object) => {
  for (let key in values) {
    console.log(key)
  }
}*/

export default new Vuex.Store({
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
              found.push(currHalt.time.tick)
            }
          }
        });
        //const averageTime = (found.length > 0) ? found.reduce((a, b) => a + b) / found.length : 20 * 3600
        const slowestTime = (found.length > 0) ? Math.max(...found) : 20 * 3600
        time += slowestTime
      }
      return result
    },
    findStationIndex(state) {
      return function (id: number): number {
        return state.stations.findIndex(e => id == e.id)
      }
    },
    computedTimes(state): Array<Array<any>> {
      const lines: Array<Line> = state.lines
      return lines.map(e => {
        const halts = e.halts
        const result: Array<any> = Array.from({length: halts.length}, _ => { return {arrival: null, wait: null, departure: null} })
        const length = halts.length
        let accum = 0
        let firstScheduledIndex = halts.findIndex(e => e.schedule != null)
        if (firstScheduledIndex >= 0) {
          accum = halts[firstScheduledIndex].schedule!.tick
        } else {
          firstScheduledIndex = 0
        }
        // TODO: firstScheduledIndexから回す
        for (let i = 0; i < halts.length; i++) {
          result[i].departure = accum
          accum += halts[i].time.tick
          result[(i+1) % length].arrival = accum
          const wait = 30 * SECOND_DIVISOR
          result[(i+1) % length].wait = wait
          accum += wait
        }
        const divisor = e.divisor
        const lastArrival = result[0].arrival
        let firstDeparture = result[0].departure
        const minWait = 30 * SECOND_DIVISOR
        while (firstDeparture < lastArrival + minWait) firstDeparture += state.month_length.tick / divisor
        result[0].wait = firstDeparture - lastArrival

        return result
      })
    },
  },
  mutations: {
    emptyState() {
      this.replaceState(getEmptyState(), null)
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
      const station = state.stations[data.pos]
      const id = station.id
      state.lines.forEach(line => {
        const newHalts = line.halts.filter(e => e.stationId != id)
        Vue.set(line, "halts", newHalts)
      })
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
        halts.push({ stationId, time: new Time(data.times[i]), reverse })
      }
      halts[0].schedule = data.firstTime
      state.lines.push({ name: "New Line", divisor: 1, lineWidth: 1, color: "#000000", halts })
    },
    modifyLine(state, data: { index: number, key: string, value: any }) {
      Vue.set(state.lines[data.index], data.key, data.value)
    },
    modifyLineHalt(state, data: { lineIndex: number, haltIndex: number, key: string, value: any }) {
      Vue.set(state.lines[data.lineIndex].halts[data.haltIndex], data.key, data.value)
    },
    saveToFile(state, data: { path: string }) {
      fs.writeFile(data.path, JSON.stringify({
        month_length: state.month_length,
        shift_divisor: state.shift_divisor,
        stations: state.stations,
        lines: state.lines,
      }, null, 2), "utf8")
    },
    loadFromFile(state, data: { path: string }) {

    }
  },
  strict: process.env.NODE_ENV !== "production"
});
