import { type LineHalt, type State } from "./stores/main"
import * as TimeUtil from "./time-util"

export class ImportError extends Error {
  constructor(line: number, message: string) {
    super(`ImportError at line ${line}: ${message}`);
  }
}

class ImportContext {
  lineNumber: number

  throw(message: string) {
    this.throwAt(this.lineNumber, message)
  }

  throwAt(at: number, message: string) {
    throw new ImportError(at, message)
  }
}

const parseInteger = (ctx: ImportContext, input: string) => {
  const parsed = parseInt(input)
  if (isNaN(parsed)) ctx.throw(`Invalid number format: expected integer, found ${input}`)
  return parsed
}

const parseFloatingPoint = (ctx: ImportContext, input: string) => {
  const parsed = parseFloat(input)
  if (isNaN(parsed)) ctx.throw(`Invalid number format: expected float, found ${input}`)
  return parsed
}

const parseColor = (ctx: ImportContext, input: string) => {
  if (!input.match(/#[(0-9a-fA-F){6}]/)) ctx.throw(`Invalid color format: ${input}`)
  return input
}

const parseTime = (ctx: ImportContext, input: string) => {
  if (!TimeUtil.isValidTimeInput(input)) ctx.throw(`Invalid time format: ${input}`)
  return TimeUtil.parse(input)
}

const parseOffsetTime = (ctx: ImportContext, input: string) => {
  if (input[0] == "+") {
    return parseTime(ctx, input.slice(1))
  }
  if (input[0] == "-") {
    return -parseTime(ctx, input.slice(1))
  }
  return parseTime(ctx, input)
}

const parseStation = (ctx: ImportContext, input: string) => {
  if (input.indexOf("@") >= 0) {
    const split = input.match(/(.*)@\s*([0-9]*)/)
    if (split == null) ctx.throw(`Invalid station format: ${input}`)
    const name = split[1].trim()
    const id = parseInteger(ctx, split[2])
    return { name, id }
  }
  return { name: input, id: 0 }
}

const parseOption = (ctx: ImportContext, input: string) => {
  if (input.indexOf("=") >= 0) {
    const split = input.match(/(.*)=(.*)/)
    if (split == null) ctx.throw(`Invalid option format: ${input}`)
    const key = split[1].trim()
    const value = split[2].trim()
    return { key, value }
  }
  return { key: input, value: null }
}

const parseInlineOptions = (ctx: ImportContext, input: string) => {
  return input.split(",").map(e => parseOption(ctx, e.trim()))
}

const parseEntryWithInlineOptions = (ctx: ImportContext, input: string) => {
  if (input.startsWith("<")) {
    const split = input.match(/<(.*?)>(.*)/)
    if (split == null) ctx.throw(`Invalid entry formmat: ${input}`)
    const options = parseInlineOptions(ctx, split[1].trim())
    const entry = split[2].trim()
    return { options, entry }
  }
  return { options: [], entry: input }
}

const parseRawTimes = (ctx: ImportContext, input: string, monthLength: number) => {
  const { options, entry } = parseEntryWithInlineOptions(ctx, input)
  let timeId = 0
  options.forEach(e => {
    if (e.key == "time_id") timeId = parseInteger(ctx, e.value)
  })

  const split = entry.match(/(.*)->(.*):(.*)/)
  if (split == null) ctx.throw(`Invalid raw time format: ${input}`)
  const fromStation = parseStation(ctx, split[1].trim())
  const toStation = parseStation(ctx, split[2].trim())
  const rawTimesInput = split[3].trim()
  return rawTimesInput.split(",").map(e => {
    const trimmed = e.trim()
    if (trimmed.indexOf("-") >= 0) {
      const multipleTimeSplit = trimmed.match(/(.*)-(.*)/)
      if (multipleTimeSplit == null) ctx.throw(`Invalid time format: ${trimmed}`)
      const fromTime = parseTime(ctx, multipleTimeSplit[1].trim())
      const toTime = parseTime(ctx, multipleTimeSplit[2].trim())
      let time = toTime - fromTime
      while (time < 0) time += monthLength
      return time
    }
    return parseTime(ctx, trimmed)
  }).map(time => ({ fromStation, toStation, timeId, time }))
}

export const importLegacyData = (data: string): State => {
  data = data.replace(/\r\n/g, "\n")
  const dataLines = data.split("\n")

  const ctx = new ImportContext()

  const getInitialLineData = () => ({
    width: 1,
    color: "#000000",
    stations: [],
  })

  let mode = "Top"
  let monthLength: number | null = null
  let shiftDivisor: number | null = null
  let defaultLoadingTime: number | null = null
  let defaultReversingTime: number | null = null
  const stations: { name: string, id: number }[] = []
  const rawTimes: {
    lineNumber: number,
    fromStation: typeof stations[number],
    toStation: typeof stations[number],
    timeId: number,
    time: number,
  }[] = []
  let currentLineData: {
    name?: string,
    divisor?: number,
    width: number,
    color: string,
    defaultLoadingTime?: number,
    defaultReversingTime?: number,
    defaultTimeId?: number,
    stations: {
      lineNumber: number,
      station: typeof stations[number],
      options: {
        shiftTime?: number,
        shiftNum?: number,
        waitingTime?: number,
        loadingTime?: number,
        reverse: boolean,
        reversingTime?: number,
        timeId?: number,
        tripTime?: number,
        tripTimeOffset?: number,
      },
    }[],
  } = getInitialLineData()
  const lines: (typeof currentLineData)[] = []

  const putCurrentLineData = (ctx: ImportContext) => {
    if (currentLineData.divisor == null) ctx.throw("Line cannot end without specifying divisor")
    lines.push(currentLineData)
  }

  dataLines.forEach((line, i) => {
    ctx.lineNumber = i + 1

    line = line.trim()
    if (line == "") return
    if (line.startsWith("#")) return

    if (line.startsWith("[")) {
      if (mode == "General") {
        if (monthLength == null) ctx.throw("month_length must be specified")
        if (shiftDivisor == null) ctx.throw("shift_divisor must be specified")
      }
      const type = line.match(/\[(.*)\]/)?.[1]
      if (type == null) throw new ImportError(i, "Invalid [] syntax")
      if (mode == "Top" && type != "General") ctx.throw("[General] must come first")
      if (mode == "General" && type != "Stations") ctx.throw("[Stations] must come after [General]")
      if (mode == "Stations" && type != "RawTimes") ctx.throw("[RawTimes] must come after [Stations]")
      if (mode == "RawTimes" && type != "Lines") ctx.throw("[Lines] must come after [RawTimes]")
      if (mode == "Lines") ctx.throw("[Lines] must be last")
      mode = type
    } else {
      if (mode == "General") {
        const { key, value } = parseOption(ctx, line)
        if (key == "month_length") monthLength = parseTime(ctx, value)
        if (key == "shift_divisor") shiftDivisor = parseInteger(ctx, value)
        if (key == "default_loading_time") defaultLoadingTime = parseTime(ctx, value)
        if (key == "default_reversing_time") defaultReversingTime = parseTime(ctx, value)
      }
      if (mode == "Stations") {
        stations.push(parseStation(ctx, line))
      }
      if (mode == "RawTimes") {
        parseRawTimes(ctx, line, monthLength).forEach(e => rawTimes.push({ lineNumber: ctx.lineNumber, ...e }))
      }
      if (mode == "Lines") {
        if (line.startsWith("-")) {
          putCurrentLineData(ctx)
          currentLineData = getInitialLineData()
        } else if (!line.startsWith("<") && line.indexOf("=") >= 0) {
          const { key, value } = parseOption(ctx, line)
          if (key == "name") currentLineData.name = value
          if (key == "divisor") currentLineData.divisor = parseInteger(ctx, value)
          if (key == "divisor_by_every" && currentLineData.divisor == null) currentLineData.divisor = Math.floor(monthLength / parseTime(ctx, value))
          if (key == "width") currentLineData.width = parseFloatingPoint(ctx, value)
          if (key == "color") currentLineData.color = parseColor(ctx, value)
          if (key == "default_loading_time") currentLineData.defaultLoadingTime = parseTime(ctx, value)
          if (key == "default_reversing_time") currentLineData.defaultReversingTime = parseTime(ctx, value)
          if (key == "default_time_id") currentLineData.defaultTimeId = parseInteger(ctx, value)
        } else {
          const options: typeof currentLineData["stations"][number]["options"] = { reverse: false }

          const { options: parsedOptions, entry } = parseEntryWithInlineOptions(ctx, line)
          parsedOptions.forEach(e => {
            const { key, value } = e
            if (key == "shift") options.shiftTime = parseTime(ctx, value)
            if (key == "shift_num") options.shiftNum = parseInteger(ctx, value)
            if (key == "wait") options.waitingTime = parseTime(ctx, value)
            if (key == "load") options.loadingTime = parseTime(ctx, value)
            if (key == "time_id") options.timeId = parseInteger(ctx, value)
            if (key == "trip") options.tripTime = parseTime(ctx, value)
            if (key == "trip_offset") options.tripTimeOffset = parseOffsetTime(ctx, value)
            if (key == "reverse") {
              options.reverse = true
              if (value != null) options.reversingTime = parseTime(ctx, value)
            }
          })

          const station = parseStation(ctx, entry)
          currentLineData.stations.push({ lineNumber: ctx.lineNumber, station, options })
        }
      }
    }
  })
  putCurrentLineData(ctx)

  const result: Partial<State> = {}
  if (monthLength == null) ctx.throw("Assertion failed")
  if (shiftDivisor == null) ctx.throw("Assertion failed")

  const stationEquals = (a: typeof stations[number], b: typeof stations[number]) => {
    return a.name == b.name && a.id == b.id
  }

  const findStationIndex = (station: typeof stations[number], lineNumber: number) => {
    const stationIndex = stations.findIndex(e => stationEquals(e, station))
    if (stationIndex == -1) ctx.throwAt(lineNumber, `Undefined station: ${station.name}`)
    return stationIndex
  }

  const expandStations = (from: typeof stations[number], to: typeof stations[number]) => {
    const fromStationIndex = findStationIndex(from, -1)
    const toStationIndex = findStationIndex(to, -1)
    if (fromStationIndex < toStationIndex) return stations.slice(fromStationIndex, toStationIndex + 1)
    else if (fromStationIndex > toStationIndex) return stations.slice(toStationIndex, fromStationIndex + 1).reverse()
    else ctx.throw("Assertion failed")
  }

  const calculateTripTime = (from: typeof stations[number], to: typeof stations[number], timeId: number) => {
    return calculateTripTimeInternal(from, to, timeId) ?? calculateTripTimeInternal(to, from, timeId) ?? 0
  }
  const calculateTripTimeInternal = (from: typeof stations[number], to: typeof stations[number], timeId: number) => {
    const matchedTimes = rawTimes.filter(e => stationEquals(e.fromStation, from) && stationEquals(e.toStation, to) && e.timeId == timeId)
    if (matchedTimes.length > 0) {
      return Math.floor(matchedTimes.map(e => e.time).reduce((a, b) => a + b) / matchedTimes.length)
    } else if (from.name == to.name) {
      return 0
    } else {
      const expanded = expandStations(from, to)
      let time = 0
      for (let i = 1; i < expanded.length; i++) {
        const expandedFrom = expanded[i - 1]
        const expandedTo = expanded[i]
        const matchedExpendedTimes = rawTimes.filter(e => stationEquals(e.fromStation, expandedFrom) && stationEquals(e.toStation, expandedTo) && e.timeId == timeId)
        if (matchedExpendedTimes.length > 0) {
          time += Math.floor(matchedExpendedTimes.map(e => e.time).reduce((a, b) => a + b) / matchedExpendedTimes.length)
        } else {
          return null
        }
      }
      return time
    }
  }

  result.monthLength = monthLength
  result.shiftDivisor = shiftDivisor
  result.stations = []
  stations.forEach(e => {
    // get unused ID
    let id
    do { id = Math.floor(Math.random() * 4294967296) } while (result.stations.some(e => e.id === id))
    const name = e.name
    const width = 1
    result.stations.push({ id, name, width })
  })
  result.lines = []
  lines.forEach(e => {
    const name = e.name ?? ""
    const divisor = e.divisor!
    const lineWidth = e.width
    const color = e.color
    const resolvedDefaultLoadingTime = e.defaultLoadingTime ?? defaultLoadingTime ?? TimeUtil.fromHMS(0, 0, 30)
    const allReversingTimes = e.stations.map(s => s.options.reversingTime).filter(t => t != null)
    const resolvedReversingTime = allReversingTimes.length > 0
      ? allReversingTimes.reduce((a, b) => a + b) / allReversingTimes.length
      : e.defaultReversingTime ?? defaultReversingTime ?? TimeUtil.fromHMS(0, 1, 0)
    const halts: LineHalt[] = []
    for (let i = 0; i < e.stations.length; i++) {
      const fromStation = e.stations[i]
      const fromStationIndex = findStationIndex(fromStation.station, fromStation.lineNumber)
      const fromStationId = result.stations[fromStationIndex].id
      const toStation = e.stations[(i + 1) % e.stations.length]
      // const toStationIndex = findStationIndex(toStation.station, toStation.lineNumber)
      // const toStationId = result.stations[toStationIndex].id
      let time = fromStation.options.tripTime ?? calculateTripTime(fromStation.station, toStation.station, fromStation.options.timeId ?? e.defaultTimeId ?? 0)
      if (fromStation.options.tripTimeOffset != null) time += fromStation.options.tripTimeOffset
      const overrideLoadingTime = fromStation.options.loadingTime != null
      const loadingTime = fromStation.options.loadingTime ?? resolvedDefaultLoadingTime
      const reverse = fromStation.options.reverse
      const wait = fromStation.options.waitingTime != null
      const waitTime = fromStation.options.waitingTime ?? 0
      const scheduled = fromStation.options.shiftNum != null || fromStation.options.shiftTime != null
      const departureTime = fromStation.options.shiftNum != null
        ? fromStation.options.shiftNum / shiftDivisor * monthLength
        : fromStation.options.shiftTime ?? 0
      const skip = fromStation.station.name == toStation.station.name

      halts.push({
        stationId: fromStationId,
        time,
        overrideLoadingTime,
        loadingTime,
        reverse,
        wait,
        waitTime,
        scheduled,
        departureTime,
        skip,
      })
    }

    result.lines.push({
      name,
      divisor,
      lineWidth,
      color,
      defaultLoadingTime: resolvedDefaultLoadingTime,
      reversingTime: resolvedReversingTime,
      halts,
      visible: true,
    })
  })

  return result as State
}