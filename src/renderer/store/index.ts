import * as Vuex from "vuex";
import VuexUndoRedo from "vuex-undo-redo";

//import Counter, { CounterState } from "./modules/Counter";

import Time from "../../time"

import Vue from "vue";

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
    addLine(state, data: { stationIndices: Array<number>, times: Array<Time>, firstTime: Time }) {
      const halts: Array<LineHalt> = []
      const size = data.stationIndices.length - 1
      for (let i = 0; i < size; i++) {
        const prev = data.stationIndices[(i + size - 1) % size]
        const curr = data.stationIndices[i]
        const next = data.stationIndices[(i + 1) % size]
        const reverse = (curr - prev) * (curr - next) > 0
        const stationId = state.stations[curr].id
        halts.push({ stationId, time: data.times[i], reverse })
      }
      halts[0].schedule = data.firstTime
      state.lines.push({ name: "New Line", divisor: 1, lineWidth: 1, color: "#000000", halts })
    },
    modifyLine(state, data: { index: number, key: string, value: any }) {
      Vue.set(state.lines[data.index], data.key, data.value)
    }
  },
  getters: {
    findStationIndex(state) {
      return function (id: number): number {
        return state.stations.findIndex(e => id == e.id)
      }
    }
  },
  strict: process.env.NODE_ENV !== "production"
});
