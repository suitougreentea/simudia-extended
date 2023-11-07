import { defineStore } from "pinia"
import { type Time } from "./main"

export const useGuiMessageStore = defineStore("gui-message", () => {
  const resetInput = (args: {}) => {}
  const addLineInputPoint = (args: { stationIndex: number, time: Time, skip: boolean }) => {}
  const setLineInputTerminal = (args: { stationIndex: number }) => {}
  const startTimeInput = (args: { rubberbands: any }) => {} // TODO: typing
  const enterKeyPressed = (args: { event: KeyboardEvent }) => {}

  return {
    resetInput,
    addLineInputPoint,
    setLineInputTerminal,
    startTimeInput,
    enterKeyPressed,
  }
})