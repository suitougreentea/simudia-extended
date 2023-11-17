import { importLegacyData } from "./legacy-importer"
import { State } from "./stores/main"

export type Time = number

export type StationV0 = {
  name: string
  id: number
  width: number
}

export type StationV1 = {
  name: string
  id: number
}

export type LineV0 = {
  name: string
  divisor: number
  lineWidth: number
  color: string
  defaultLoadingTime: Time
  reversingTime: Time
  halts: LineHaltV0[]
  visible: boolean
}

export type LineHaltV0 = {
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

type FileFormatV0 = {
  fileVersion: 0,
  monthLength: Time,
  shiftDivisor: number,
  stations: StationV0[],
  lines: LineV0[],
}

type FileFormatV1 = {
  fileVersion: 1,
  monthLength: Time,
  shiftDivisor: number,
  stations: StationV1[],
  lines: LineV0[],
}

type FileFormatLatest = FileFormatV1

class FileContext {
  warnings: string[] = []
}

class FileError extends Error {
  name = "FileError"
}

const detectFileType = (input: string): "standard" | "legacy" | null => {
  try {
    const parsed = JSON.parse(input)
    if (parsed.fileVersion != null) return "standard"
  } catch {
    // not json
    if (input.indexOf("[General]") >= 0) return "legacy"
  }
  return null
}

export const deserialize = (input: string, type: "standard" | "legacy" | null): { result?: State, type?: "standard" | "legacy", errors: string[], warnings: string[] } => {
  const error = (message: string) => ({
    errors: [message],
    warnings: [],
  })

  type ??= detectFileType(input)
  if (type == null) {
    return error("Unsupported format")
  }

  if (type == "standard") {
    try {
      let json: any
      try {
        json = JSON.parse(input)
      } catch (e) {
        return error("Invalid format (failed to parse as JSON)")
      }
      try {
        const ctx = new FileContext()
        const result = fromFileFormat(ctx, json)
        return {
          result,
          type,
          errors: [],
          warnings: ctx.warnings,
        }
      } catch (e) {
        if (e instanceof FileError) {
          return error(e.message)
        }
      }
    } catch (e) {
      return error(`Uncaught error: ${e}`)
    }
  }
  if (type == "legacy") {
    try {
      const { state, warnings } = importLegacyData(input)
      return {
        result: state,
        type,
        errors: [],
        warnings,
      }
    } catch (e) {
      return error(`Uncaught error: ${e}`)
    }
  }
}

export const serialize = (input: State): { result?: string, errors: string[], warnings: string[] } => {
  const error = (message: string) => ({
    errors: [message],
    warnings: [],
  })

  const ctx = new FileContext()
  try {
    const result = JSON.stringify(toFileFormat(ctx, input))
    return {
      result,
      errors: [],
      warnings: ctx.warnings,
    }
  } catch (e) {
    if (e instanceof FileError) {
      return error(e.message)
    } else {
      return error(`Uncaught error: ${e}`)
    }
  }
}

const convertToV1 = (ctx: FileContext, input: FileFormatV0): FileFormatV1 => {
  return {
    ...input,
    fileVersion: 1,
    stations: input.stations.map(e => ({ ...e, width: undefined }))
  }
}

const fromFileFormatV1 = (ctx: FileContext, input: FileFormatV1): State => {
  return {
    monthLength: input.monthLength,
    shiftDivisor: input.shiftDivisor,
    stations: input.stations.map(e => ({
      id: e.id,
      name: e.name,
    })),
    lines: input.lines.map(e => ({
      name: e.name,
      divisor: e.divisor,
      lineWidth: e.lineWidth,
      color: e.color,
      defaultLoadingTime: e.defaultLoadingTime,
      reversingTime: e.reversingTime,
      halts: e.halts.map(h => ({
        stationId: h.stationId,
        time: h.time,
        overrideLoadingTime: h.overrideLoadingTime,
        loadingTime: h.loadingTime,
        reverse: h.reverse,
        wait: h.wait,
        waitTime: h.waitTime,
        scheduled: h.scheduled,
        departureTime: h.departureTime,
        skip: h.skip,
      })),
      visible: e.visible
    })),
  }
}

const fromFileFormat = (ctx: FileContext, input: any): State => {
  if (input.fileVersion == null) throw new FileError("No fileVersion entry found")
  if (input.fileVersion == 0) input = convertToV1(ctx, input)
  if (input.fileVersion == 1) return fromFileFormatV1(ctx, input)
  throw new FileError(`Unsupported fileVersion: ${input.fileVersion}`)
}

const toFileFormat = (ctx: FileContext, input: State): FileFormatLatest => {
  return {
    fileVersion: 1,
    monthLength: input.monthLength,
    shiftDivisor: input.shiftDivisor,
    stations: input.stations.map(e => ({
      id: e.id,
      name: e.name,
    })),
    lines: input.lines.map(e => ({
      name: e.name,
      divisor: e.divisor,
      lineWidth: e.lineWidth,
      color: e.color,
      defaultLoadingTime: e.defaultLoadingTime,
      reversingTime: e.reversingTime,
      halts: e.halts.map(h => ({
        stationId: h.stationId,
        time: h.time,
        overrideLoadingTime: h.overrideLoadingTime,
        loadingTime: h.loadingTime,
        reverse: h.reverse,
        wait: h.wait,
        waitTime: h.waitTime,
        scheduled: h.scheduled,
        departureTime: h.departureTime,
        skip: h.skip,
      })),
      visible: e.visible
    })),
  }
}