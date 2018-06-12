export const SECOND_DIVISOR = 360

export default class Time {
  tick: number

  constructor(tick: number) {
    this.tick = tick
  }

  getTick(): number { return this.tick }
  getHour(): number { return Math.floor(this.tick / (SECOND_DIVISOR * 60 * 60)) }
  getMinute(): number { return Math.floor(this.tick / (SECOND_DIVISOR * 60)) % 60 }
  getSecond(): number { return Math.floor(this.tick / SECOND_DIVISOR) % 60 }
  getSecondUnrounded(): number { return (this.tick / SECOND_DIVISOR) % 60 }

  joinStringSimple(): string {
    const hour = this.getHour()
    const minute = this.getMinute()
    const second = this.getSecond()
    return ((hour > 0) ? String(hour) : "") + String(minute).padStart(2, "0") + String(second).padStart(2, "0")
  }

  static fromHMS(hour: number, minute: number, second: number): Time {
    return new Time(((((hour * 60) + minute) * 60) + second) * SECOND_DIVISOR)
  }

  static parse(text: string): Time {
    // TODO: parse hmmss-hmmss
    const length = text.length
    const hour = Number(text.substring(0, length - 4))
    const minute = Number(text.substring(length - 4, length - 2))
    const second = Number(text.substring(length - 2))
    return this.fromHMS(hour, minute, second)
  }
  static isValidTimeInput(text: string): boolean {
    return /^[0-9]*[0-5][0-9][0-5][0-9](-[0-9]*[0-5][0-9][0-5][0-9])?$/.test(text)
  }
}