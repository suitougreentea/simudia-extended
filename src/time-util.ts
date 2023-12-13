export const SECOND_DIVISOR = 360

export type PretiffiedTime = {
  hour: number
  second: number
  minute: number
  secondUnrounded: number
}

export function getPrettifiedTime(time: number): PretiffiedTime {
  const hour = Math.floor(time / (SECOND_DIVISOR * 60 * 60))
  const minute = Math.floor(time / (SECOND_DIVISOR * 60)) % 60
  const secondUnrounded = (time / SECOND_DIVISOR) % 60
  return {
    hour,
    minute,
    second: Math.floor(secondUnrounded),
    secondUnrounded,
  }
}

export function joinStringSimple(time: number): string {
  const { hour, minute, second } = getPrettifiedTime(time)
  return (hour > 0 ? String(hour) : "") + String(minute).padStart(2, "0") + String(second).padStart(2, "0")
}

export function joinString(time: number, omitHour: boolean = true): string {
  const { hour, minute, second } = getPrettifiedTime(time)
  return (hour > 0 || !omitHour ? String(hour) + ":" : "") + String(minute).padStart(2, "0") + ":" + String(second).padStart(2, "0")
}

export function fromHMS(hour: number, minute: number, second: number): number {
  return ((hour * 60 + minute) * 60 + second) * SECOND_DIVISOR
}

const simpleTestWithHour = /^([0-9]*)([0-5][0-9])([0-5][0-9])$/
const simpleTestWithoutHour = /^([0-5]?[0-9])([0-5][0-9])$/
const prettyTestWithHour = /^([0-9]+):([0-5]?[0-9]):([0-5]?[0-9])$/
const prettyTestWithoutHour = /^([0-5]?[0-9]):([0-5]?[0-9])$/

export function parse(text: string): number {
  const trimmed = text.trim()
  let hour = 0
  let minute = 0
  let second = 0
  const simpleMatchWithHour = trimmed.match(simpleTestWithHour)
  const simpleMatchWithoutHour = trimmed.match(simpleTestWithoutHour)
  const prettyMatchWithHour = trimmed.match(prettyTestWithHour)
  const prettyMatchWithoutHour = trimmed.match(prettyTestWithoutHour)
  if (simpleMatchWithHour) {
    hour = Number(simpleMatchWithHour[1])
    minute = Number(simpleMatchWithHour[2])
    second = Number(simpleMatchWithHour[3])
  } else if (simpleMatchWithoutHour) {
    minute = Number(simpleMatchWithoutHour[1])
    second = Number(simpleMatchWithoutHour[2])
  } else if (prettyMatchWithHour) {
    hour = Number(prettyMatchWithHour[1])
    minute = Number(prettyMatchWithHour[2])
    second = Number(prettyMatchWithHour[3])
  } else if (prettyMatchWithoutHour) {
    minute = Number(prettyMatchWithoutHour[1])
    second = Number(prettyMatchWithoutHour[2])
  } else {
    return NaN
  }
  return fromHMS(hour, minute, second)
}

export function isValidTimeInput(text: string): boolean {
  const trimmed = text.trim()
  return simpleTestWithHour.test(trimmed) || simpleTestWithoutHour.test(trimmed) || prettyTestWithHour.test(trimmed) || prettyTestWithoutHour.test(trimmed)
}
