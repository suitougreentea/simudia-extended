import { Time, PrettifiedTime } from "./types"
export const SECOND_DIVISOR = 360

export default {
  getPrettifiedTime(time: Time): PrettifiedTime {
    const hour = Math.floor(time / (SECOND_DIVISOR * 60 * 60))
    const minute = Math.floor(time / (SECOND_DIVISOR * 60)) % 60
    const secondUnrounded = (time / SECOND_DIVISOR) % 60
    return {
      hour,
      minute,
      second: Math.floor(secondUnrounded),
      secondUnrounded
    }
  },
  joinStringSimple(time: Time): string {
    const { hour, minute, second } = this.getPrettifiedTime(time)
    return ((hour > 0) ? String(hour) : "") + String(minute).padStart(2, "0") + String(second).padStart(2, "0")
  },
  joinString(time: Time, omitHour: boolean = true): string {
    const { hour, minute, second } = this.getPrettifiedTime(time)
    return ((hour > 0 || !omitHour) ? (String(hour) + ":") : "") + String(minute).padStart(2, "0") + ":" + String(second).padStart(2, "0")
  },
  fromHMS(hour: number, minute: number, second: number): Time {
    return ((((hour * 60) + minute) * 60) + second) * SECOND_DIVISOR
  },
  parse(text: string): Time {
    // TODO: parse hmmss-hmmss
    const length = text.length
    const hour = Number(text.substring(0, length - 4))
    const minute = Number(text.substring(length - 4, length - 2))
    const second = Number(text.substring(length - 2))
    return this.fromHMS(hour, minute, second)
  },
  isValidTimeInput(text: string): boolean {
    return /^[0-9]*[0-5][0-9][0-5][0-9](-[0-9]*[0-5][0-9][0-5][0-9])?$/.test(text)
  }
}