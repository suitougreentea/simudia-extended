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

export type JourneyTimeEntry = {
  fromStationId: number
  toStationId: number
  lineIndex: number
  haltIndex: number
  time: number
}

export const getAllJourneyTimes = (lines: Line[]): JourneyTimeEntry[] => {
  const result: JourneyTimeEntry[] = []

  lines.forEach((line, lineIndex) => {
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
}

export type ComputedLineTime = {
  haltTimes: ComputedHaltTime[]
  setOffset: number
}

export type ComputedHaltTime = {
  arrival: number
  wait: number
  departure: number
  journey: number
  scheduled: boolean
}

export const getLineComputedTimes = (line: Line, monthLength: Time): ComputedLineTime => {
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
        const interval = monthLength / line.divisor
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
  const setOffset = Math.round((firstHaltTime.arrival - (firstHaltTime.departure - firstHaltTime.wait)) / (monthLength / line.divisor))

  return {
    haltTimes,
    setOffset,
  } as ComputedLineTime
}
