import type { ComputedLineTime, Line, Station, Time } from "./lib"

type Coordinates = { x: number, y: number }
type SingleLine = { sx: number, sy: number, dx: number, dy: number }

export type SingleLinePathData = {
  path: string
  center: Coordinates
  dashArray: string
}

export type MultipleLinesPathData = {
  path: string
  dashArray: string
}

export type PathData = {
  merged: string
  list: MultipleLinesPathData[] // currently fixed [normal, dashed (skip)]
}

export type LineRenderData = {
  lineIndex: number
  entireLinePath: PathData
  sets: {
    entireSetPath: PathData
    segments: {
      haltPaths: SingleLinePathData[]
      journeyPaths: SingleLinePathData[]
    }[]
  }[]
  color: string
  width: number
}

export type RenderOptions = {
  stations: { id: number, accumulatedTime: Time }[]
  x: (time: Time) => number
  y: (time: Time) => number
}

const dashArrays = ["", "5 5"]
  
const createPathStringFromSingleLine = (singleLine: SingleLine): string => {
  return `M ${singleLine.sx} ${singleLine.sy} L ${singleLine.dx} ${singleLine.dy}`
}

const createSingleLinePathData = (index: number, singleLine: SingleLine): SingleLinePathData => ({
  path: createPathStringFromSingleLine(singleLine),
  center: { x: (singleLine.sx + singleLine.dx) / 2, y: (singleLine.sy + singleLine.dy) / 2 },
  dashArray: dashArrays[index],
})

const createPathDataBuilder = () => {
  const merged: string[] = []
  const list: string[][] = [[], []]
  return {
    push: (index: number, path: string) => {
      merged.push(path)
      list[index].push(path)
    },
    build: () => ({
      merged: merged.join(" "),
      list: list.map((e, i) => ({ path: e.join(" "), dashArray: dashArrays[i] })),
    } as PathData)
  }
}

export const getLineRenderData = (lines: { line: Line, times: ComputedLineTime }[], monthLength: Time, renderOptions: RenderOptions): LineRenderData[] => {
  const idToStationTimeLookup: { [key: number]: number } = {}
  renderOptions.stations.forEach((e, i) => {
    idToStationTimeLookup[e.id] = renderOptions.stations[i].accumulatedTime
  })

  const getSingleLines = (
    fromStationTime: number, fromTime: Time,
    toStationTime: number, toTime: Time,
  ): SingleLine[] => {
    if (fromTime < 0) {
      return getSingleLines(fromStationTime, fromTime + monthLength, toStationTime, toTime + monthLength)
    }
    if (fromTime > monthLength) {
      return getSingleLines(fromStationTime, fromTime - monthLength, toStationTime, toTime - monthLength)
    }
    if (toTime > monthLength) {
      const split = (monthLength - fromTime) / (toTime - fromTime)
      const splitTime = fromTime + split * (toTime - fromTime)
      const splitStationTime = fromStationTime + split * (toStationTime - fromStationTime)
      const a = getSingleLines(fromStationTime, fromTime, splitStationTime, splitTime)
      const b = getSingleLines(splitStationTime, splitTime - monthLength, toStationTime, toTime - monthLength)
      return [...a, ...b]
    }

    const fromX = renderOptions.x(fromTime)
    const fromY = renderOptions.y(fromStationTime)
    const toX = renderOptions.x(toTime)
    const toY = renderOptions.y(toStationTime)
    return [{ sx: fromX, sy: fromY, dx: toX, dy: toY }]
  }

  const result: LineRenderData[] = []
  lines.forEach((e, lineIndex) => {
    const { line, times } = e
    if (!line.visible) return

    const entireLinePathBuilder = createPathDataBuilder()
    const sets: LineRenderData["sets"][number][] = []

    for (let setIndex = 0; setIndex < line.divisor; setIndex++) {
      const entireSetPathBuilder = createPathDataBuilder()
      const segments: LineRenderData["sets"][number]["segments"][number][] = []

      const offsetTime = setIndex * (monthLength / line.divisor)
      for (let currIndex = 0; currIndex < line.halts.length; currIndex++) {
        const nextIndex = (currIndex + 1) % line.halts.length
        const currHalt = line.halts[currIndex]
        const nextHalt = line.halts[nextIndex]
        const currTime = times.haltTimes[currIndex]
        const nextTime = times.haltTimes[nextIndex]
        const currHaltStationTime = idToStationTimeLookup[currHalt.stationId]
        const nextHaltStationTime = idToStationTimeLookup[nextHalt.stationId]

        const currArrTime = currTime.departure - currTime.wait + offsetTime
        const currDepTime = currTime.departure + offsetTime
        const nextArrTime = nextTime.arrival + offsetTime

        const targetIndex = currHalt.skip ? 1 : 0
        const haltLines = getSingleLines(currHaltStationTime, currArrTime, currHaltStationTime, currDepTime)
        const journeyLines = getSingleLines(currHaltStationTime, currDepTime, nextHaltStationTime, nextArrTime)
        const haltPaths = haltLines.map(createPathStringFromSingleLine)
        const journeyPaths = journeyLines.map(createPathStringFromSingleLine)
        haltPaths.forEach(path => {
          entireLinePathBuilder.push(targetIndex, path)
          entireSetPathBuilder.push(targetIndex, path)
        })
        journeyPaths.forEach(path => {
          entireLinePathBuilder.push(targetIndex, path)
          entireSetPathBuilder.push(targetIndex, path)
        })
        const segment = {
          haltPaths: haltLines.map(line => createSingleLinePathData(targetIndex, line)),
          journeyPaths: journeyLines.map(line => createSingleLinePathData(targetIndex, line)),
        }
        segments.push(segment)
      }

      sets.push({ entireSetPath: entireSetPathBuilder.build(), segments })
    }

    result.push({
      lineIndex,
      entireLinePath: entireLinePathBuilder.build(),
      sets,
      color: line.color,
      width: line.lineWidth,
    })
  })
  return result
}