import {
  FrcsShotKind,
  FrcsSurveyFile,
  FrcsTrip,
  FrcsTripSummary,
  FrcsTripSummaryFile,
} from '@speleotica/frcsdata'
import { Angle, Length, Unitize } from '@speleotica/unitized'
import {
  backsightAzimuthTypeOption,
  backsightInclinationTypeOption,
  comment as commentLine,
  compassAndTapeShot,
  dateDirective,
  distanceUnitOption,
  FixDirective,
  frontsightAzimuthUnitOption,
  frontsightInclinationUnitOption,
  LrudStyle,
  lrudStyleOption,
  stationLruds,
  TapingMethod,
  tapingMethodOption,
  unitsDirective,
  UnitsOption,
  WallsSrvFile,
} from '@speleotica/walls/srv/WallsSrvFile'
import {
  WallsWpjFile,
  wallsProjectBook,
  wallsProjectSurvey,
  WallsProjectBook,
  WallsProjectSurvey,
  Georeference,
} from '@speleotica/walls/wpj'

export type InputCave = {
  subdir: string
  namePrefix?: string
  survey: FrcsSurveyFile
  summaries?: FrcsTripSummaryFile
  fixedStations?: FixDirective[]
  georeference?: Georeference
}

export default function convertToWalls({
  title,
  name,
  caves,
}: {
  title: string
  name?: string
  caves: InputCave[]
}): WallsWpjFile {
  if (caves.length === 1) {
    const root = convertCave(caves[0])
    root.title = title
    root.name = name
    return { root }
  }
  const root = wallsProjectBook(title, name)
  root.reviewDistanceUnit = Length.feet
  for (const cave of caves) {
    root.children.push(convertCave(cave, { multicave: true }))
  }
  return { root }
}

function convertCave(
  {
    subdir,
    namePrefix,
    survey,
    summaries,
    fixedStations,
    georeference,
  }: InputCave,
  { multicave }: { multicave?: boolean } = {}
): WallsProjectBook {
  if (namePrefix == null) namePrefix = multicave ? subdir : ''
  const book = wallsProjectBook(survey.cave || subdir, null, subdir, [], {
    reviewDistanceUnit: Length.feet,
    georeference,
    ...(multicave && { options: `PREFIX=${subdir}` }),
  })
  if (fixedStations) {
    book.children.push(
      wallsProjectSurvey('Fixed Stations', `${namePrefix}fix`, null, {
        content: {
          lines: fixedStations,
        },
      })
    )
  }
  for (let tripIndex = 0; tripIndex < survey.trips.length; tripIndex++) {
    const trip = survey.trips[tripIndex]
    if (trip == null) continue
    const summary = summaries?.tripSummaries[tripIndex]
    book.children.push(
      convertTrip({
        tripIndex,
        trip,
        summary,
        namePrefix,
      })
    )
  }
  return book
}

function convertTrip({
  tripIndex,
  trip,
  summary,
  namePrefix,
}: {
  tripIndex: number
  trip: FrcsTrip
  summary?: FrcsTripSummary
  namePrefix: string
}): WallsProjectSurvey {
  const tripNum = summary?.tripNumber ?? tripIndex + 1
  const {
    name,
    azimuthUnit,
    inclinationUnit,
    backsightAzimuthCorrected,
    backsightInclinationCorrected,
    hasBacksightAzimuth,
    hasBacksightInclination,
  } = trip.header
  const team = trip.header.team || summary?.team
  let { distanceUnit } = trip.header
  if (distanceUnit === Length.inches) distanceUnit = Length.feet
  const date = summary?.date || trip.header.date

  const srv: WallsSrvFile = {
    lines: [commentLine(`${tripNum} ${name}`)],
  }

  if (team) {
    srv.lines.push(
      commentLine(team.join(team.find((t) => /,/.test(t)) ? '; ' : ', '))
    )
  }
  if (date) srv.lines.push(dateDirective(date))

  const unitsOptions: UnitsOption[] = [
    distanceUnitOption(distanceUnit),
    frontsightAzimuthUnitOption(azimuthUnit),
    frontsightInclinationUnitOption(inclinationUnit),
    lrudStyleOption(LrudStyle.ToStationBisector),
  ]
  if (hasBacksightAzimuth) {
    unitsOptions.push(
      backsightAzimuthTypeOption(
        Boolean(backsightAzimuthCorrected),
        Unitize.degrees(2),
        false
      )
    )
  }
  if (hasBacksightInclination) {
    unitsOptions.push(
      backsightInclinationTypeOption(
        Boolean(backsightInclinationCorrected),
        Unitize.degrees(2),
        false
      )
    )
  }
  srv.lines.push(unitsDirective(unitsOptions))

  let lastTapingMethod: TapingMethod = TapingMethod.InstrumentToTarget

  for (const shot of trip.shots) {
    let { distance } = shot
    const {
      kind,
      from,
      to,
      horizontalDistance,
      verticalDistance,
      backsightAzimuth,
      frontsightInclination,
      backsightInclination,
      fromLruds,
      toLruds,
      comment,
    } = shot
    let { frontsightAzimuth } = shot
    if (
      frontsightAzimuth == null &&
      backsightAzimuth == null &&
      ((frontsightInclination != null &&
        frontsightInclination.abs().get(Angle.degrees) !== 90) ||
        (backsightInclination != null &&
          backsightInclination.abs().get(Angle.degrees) !== 90))
    ) {
      frontsightAzimuth = Unitize.degrees(0)
    }
    if (kind === FrcsShotKind.Horizontal) {
      if (!horizontalDistance) {
        throw new Error(
          `horizontalDistance must be provided when kind is horizontal`
        )
      }
      distance = horizontalDistance
    }

    const tapingMethod =
      kind === FrcsShotKind.Diagonal
        ? TapingMethod.InstrumentToStation
        : TapingMethod.InstrumentToTarget
    if (tapingMethod !== lastTapingMethod) {
      srv.lines.push(unitsDirective([tapingMethodOption(tapingMethod)]))
      lastTapingMethod = tapingMethod
    }
    if (from && fromLruds) {
      const { left, right, up, down } = fromLruds
      srv.lines.push(stationLruds(from, [left, right, up, down]))
    }
    if (from && to) {
      const wallsShot = compassAndTapeShot(
        from,
        to,
        distance,
        backsightAzimuth
          ? [frontsightAzimuth, backsightAzimuth]
          : frontsightAzimuth,
        kind === FrcsShotKind.Normal
          ? backsightInclination
            ? [frontsightInclination, backsightInclination]
            : frontsightInclination
          : Unitize.degrees(0),
        toLruds
          ? [toLruds.left, toLruds.right, toLruds.up, toLruds.down]
          : undefined,
        {
          ...(kind !== FrcsShotKind.Normal && {
            targetHeight: verticalDistance?.negate?.(),
          }),
        }
      )
      if (comment && /\n/m.test(comment)) {
        srv.lines.push(commentLine(comment))
      } else {
        wallsShot.comment = comment
      }
      srv.lines.push(wallsShot)
    }
  }
  return wallsProjectSurvey(
    `${tripNum} ${name}`,
    `${namePrefix}${tripNum}`,
    null,
    {
      content: srv,
      nameDefinesSegment: true,
      reviewDistanceUnit: Length.feet,
    }
  )
}
