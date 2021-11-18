import { describe, it } from 'mocha'
import { expect } from 'chai'
import {
  parseFrcsSurveyFile,
  parseFrcsTripSummaryFile,
} from '@speleotica/frcsdata/node'
import { writeWallsProject } from '@speleotica/walls/node'
import { convertToWalls } from '.'
import dedent from 'dedent-js'
import fs from 'fs-extra'
import Path from 'path'
import iconv from 'iconv-lite'
import { fixDirective } from '@speleotica/walls/srv/WallsSrvFile'
import { Unitize } from '@speleotica/unitized'
import { DisplayLatLongFormat } from '@speleotica/walls/wpj'

type DirContents = { [entry: string]: string | DirContents }

describe(`convertToWalls`, function () {
  let testDir = ''

  async function readDirContents(dir: string): Promise<DirContents> {
    const entries = await fs.readdir(dir)
    const result: DirContents = {}
    await Promise.all(
      entries.map(async (entry) => {
        const path = Path.resolve(dir, entry)
        if ((await fs.stat(path)).isDirectory()) {
          result[entry] = await readDirContents(path)
        } else {
          result[entry] = iconv.decode(await fs.readFile(path), 'win1252')
        }
      })
    )
    return result
  }

  function expectDirContents(
    actual: DirContents,
    expected: DirContents,
    path = '/'
  ): void {
    expect(Object.keys(actual), `entries of ${path}`).to.have.members(
      Object.keys(expected)
    )
    for (const entry in actual) {
      const subpath = Path.resolve(path, entry)
      const actualEntry = actual[entry]
      const expectedEntry = expected[entry]
      if (typeof actualEntry === 'string') {
        if (typeof expectedEntry !== 'string') {
          throw new Error(`expected ${subpath} to be a directory`)
        }
        expect(actualEntry, `contents of ${subpath}`).to.equal(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dedent([expectedEntry] as any).replace(/\n/gm, '\r\n') + '\r\n'
        )
      } else {
        if (typeof expectedEntry === 'string') {
          throw new Error(`expected ${subpath} not to be a directory`)
        }
        expectDirContents(actualEntry, expectedEntry, subpath)
      }
    }
  }

  beforeEach(async function () {
    testDir = Path.resolve(
      __dirname,
      '..',
      'test',
      this.currentTest?.fullTitle?.() || ''
    )
    await fs.remove(testDir).catch(() => {
      /* no-op */
    })
    await fs.mkdirp(testDir)
  })
  afterEach(async function () {
    if (this.currentTest?.state !== 'failed') {
      await fs.remove(testDir).catch(() => {
        /* no-op */
      })
    }
  })
  it(`basic test`, async function () {
    const survey = await parseFrcsSurveyFile(require.resolve('./cdata.fr'))
    const summaries = await parseFrcsTripSummaryFile(
      require.resolve('./STAT_sum.txt')
    )

    await writeWallsProject(
      Path.resolve(testDir, 'test.wpj'),
      convertToWalls({
        title: 'FRCS and Surrounding Caves',
        name: 'FRCS',
        caves: [
          {
            subdir: 'fr',
            survey,
            summaries,
            georeference: {
              displayLatLongFormat: DisplayLatLongFormat.Degrees,
              utmZone: 14,
              utmNorthing: Unitize.meters(0),
              utmEasting: Unitize.meters(0),
              utmConvergenceAngle: Unitize.degrees(0),
              elevation: Unitize.meters(0),
              latitude: Unitize.degrees(0),
              longitude: Unitize.degrees(0),
              wallsDatumIndex: 0,
              datum: 'WGS1984',
            },
            fixedStations: [
              fixDirective(
                'A20',
                Unitize.meters(50),
                Unitize.meters(40),
                Unitize.meters(80)
              ),
            ],
          },
        ],
      })
    )
    expectDirContents(await readDirContents(testDir), {
      'test.wpj': `
        .BOOK	FRCS and Surrounding Caves
        .NAME	FRCS
        .PATH	fr
        .STATUS	17
        .REF	0.000 0.000 14 0.000 0 0 0 0 0.000 0 0 0.000 0 "WGS1984"
        .SURVEY	Fixed Stations
        .NAME	fix
        .STATUS	0
        .SURVEY	1 ENTRANCE DROPS, JOE'S "I LOVE MY WIFE TRAVERSE", TRICKY TRAVERSE
        .NAME	1
        .STATUS	24
        .SURVEY	2 TRICKY TRAVERSE AND THEN FIRST SURVEY IN UPPER CROWLWAY
        .NAME	2
        .STATUS	24
        .SURVEY	3 CONNECT UPPER HILTON TO FISHER AVE AND SURVEY IN PRESSURE PASSAGE.
        .NAME	3
        .STATUS	24
        .SURVEY	4 Hunky-Dory Mopup:  Q19-PD7 loop (Quap Passage), Q1 Side Lead, Others.
        .NAME	4
        .STATUS	24
        .SURVEY	5 DOUG'S DEMISE (50 FT DROP), CHRIS CROSS, CRAWL ABOVE DROP
        .NAME	5
        .STATUS	24
        .SURVEY	6 CONTINUATION OF E SURVEY TO WEST ROOM
        .NAME	6
        .STATUS	24
        .ENDBOOK
      `,
      fr: {
        'fix.srv': `
          #FIX	A20	50	40	80
        `,
        '1.srv': `
          ;1 ENTRANCE DROPS, JOE'S "I LOVE MY WIFE TRAVERSE", TRICKY TRAVERSE
          ;Peter Quick, Keith Ortiz
          #DATE	1981-02-15
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=C,2
          AE20	<1,3,0,2>
          AE20	AE19	9.3	60/60	-36	<2,12,0,20>	;AE20     0        0        0        Bug-can't put before so put after-so can't make 2 fixed 10/28/12
          AE19	AE18	24.5	0/0	-90	<6,10,25,0>
          AE18	AE17	8	350.5/350.5	17	<3,5,0,0>
          AE17	AE16	6.7	0/0	-90	<3,5,6,1>
          AE16	AE15	12.6	70.5/71	-18	<4,0,2,1>
          AE15	AE14	10	21.5/20	6	<5,5,0,3>
          AE14	AE13	26.8	288/286	-50	<0,7,20,5>
          AE13	AE12	20.7	236/236	34	<3,5,4,4>	;SHORT CANYON AT THE BASE OF THE SECOND DROP
          #[
          Multiline
          Comment
          Test
          #]
          AE12	AE11	26.8	--	-90	<--,7,20,5>
        `,
        '2.srv': `
          ;2 TRICKY TRAVERSE AND THEN FIRST SURVEY IN UPPER CROWLWAY
          ;Dan Crowl, Keith Ortiz, Chip Hopper, Peter Quick, Larry Bean
          #DATE	1981-02-14
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=N,2
          A1	<2,7,3,4.5>
          A1	A2	48i10	292/110	-42	<5,10,35,5>
          A2	A3	12i5	333.5/153.5	35	<3,1,15,5>
          A3	A4	4i2	0/0	90	<3,1,10,10>
        `,
        '3.srv': `
          ;3 CONNECT UPPER HILTON TO FISHER AVE AND SURVEY IN PRESSURE PASSAGE.
          ;J.SAUNDERS, NANCY COLTER, TOM JOHENGEN, C SANTERRE, LINDA JAGGER
          #DATE	1982-05-16
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=N,2 TYPEVB=N,2
          J6	ML$1	50	124/303.5	11/-11	<12,12,35,15>
          ML$1	ML$2	32	157/337	53/-53	<30,2,16,5>
          ML$2	ML$3	25.1	142.5/324	-5/5	<0,4,5,7>
          ML$3	ML$4	6	--	-90/90	<0,4,11,1>
        `,
        '4.srv': `
          ;4 Hunky-Dory Mopup:  Q19-PD7 loop (Quap Passage), Q1 Side Lead, Others.
          ;PETER QUICK, CHIP HOPPER
          #DATE	1983-03-05
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=C,2 TYPEVB=C,2
          Q19	QAP1	25	49.5/49.5	-12/-11	<3,3,1,7>	;Quap Passage short cut from the Hunky-Dory access crawl.
          QAP1	QAP2	27.2	100.5/100	2.5/2.5	<2,3,0,10>
          QAP2	QAP3	14.8	39.5/39.5	-11/-10.5	<1,4,1,12>
          QAP3	QAP4	21.1	355/354	2/2.5	<4,4,2,12>
          QAP4	QAP5	43.6	343/341.5	-5/-4.5	<2,7,5,12>
          QAP5	QAP6	23	39.5/39	9/9.5	<3,4,0,15>
          QAP6	QAP7	35.1	11.5/11	0.5/1	<3,6,1,25>
          QAP7	QAP8	5.8	--	-90/-90	<2,4,6,20>
        `,
        '5.srv': `
          ;5 DOUG'S DEMISE (50 FT DROP), CHRIS CROSS, CRAWL ABOVE DROP
          ;PETER QUICK, CHIP HOPPER
          #DATE	1981-03-06
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=C,2
          B29	B30	29.5	320/321	0	--	-0.5	<2,3,4,2>
          B30	B31	13.7	0/0	40	<2,4,6,9>
          B30	B30sp	13.7	0/0	40	<2,4,6,-->
          B32	B33	0	0	-1	<6,7,8,9>
        `,
        '6.srv': `
          ;6 CONTINUATION OF E SURVEY TO WEST ROOM
          ;PETER QUICK, CHIP HOPPER
          #DATE	1983-03-05
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=C,2
          #UNITS TAPE=IS
          E36	E37	31.6	231/232	0	--	-2	<3,10,20,32>
          E37	E38	19.2	258.5/259	0	--	1	<10,5,20,30>
          #UNITS TAPE=IT
          E38	E39	36.5	227/228	0	--	1	<10,4,12,30>
          E39	E40	27	0/0	-90	<10,4,29,3>
          #UNITS TAPE=IS
          E40	E41	18.5	260/261.5	0	--	-2.2	<3,3,15,3>
        `,
      },
    })
  })
  it(`multicave mode`, async function () {
    const survey = await parseFrcsSurveyFile(require.resolve('./cdata.fr'))
    const summaries = await parseFrcsTripSummaryFile(
      require.resolve('./STAT_sum.txt')
    )

    await writeWallsProject(
      Path.resolve(testDir, 'test.wpj'),
      convertToWalls({
        title: 'FRCS and Surrounding Caves',
        name: 'FRCS',
        caves: [
          {
            subdir: 'fr',
            survey,
            summaries,
            georeference: {
              displayLatLongFormat: DisplayLatLongFormat.Degrees,
              utmZone: 14,
              utmNorthing: Unitize.meters(0),
              utmEasting: Unitize.meters(0),
              utmConvergenceAngle: Unitize.degrees(0),
              elevation: Unitize.meters(0),
              latitude: Unitize.degrees(0),
              longitude: Unitize.degrees(0),
              wallsDatumIndex: 0,
              datum: 'WGS1984',
            },
            fixedStations: [
              fixDirective(
                'A20',
                Unitize.meters(50),
                Unitize.meters(40),
                Unitize.meters(80)
              ),
            ],
          },
          {
            subdir: 'cr',
            survey: { trips: [] },
          },
        ],
      })
    )
    expectDirContents(await readDirContents(testDir), {
      'test.wpj': `
        .BOOK	FRCS and Surrounding Caves
        .NAME	FRCS
        .STATUS	17
        .BOOK	Fisher Ridge Cave System
        .OPTIONS	PREFIX=fr
        .PATH	fr
        .STATUS	17
        .REF	0.000 0.000 14 0.000 0 0 0 0 0.000 0 0 0.000 0 "WGS1984"
        .SURVEY	Fixed Stations
        .NAME	frfix
        .STATUS	0
        .SURVEY	1 ENTRANCE DROPS, JOE'S "I LOVE MY WIFE TRAVERSE", TRICKY TRAVERSE
        .NAME	fr1
        .STATUS	24
        .SURVEY	2 TRICKY TRAVERSE AND THEN FIRST SURVEY IN UPPER CROWLWAY
        .NAME	fr2
        .STATUS	24
        .SURVEY	3 CONNECT UPPER HILTON TO FISHER AVE AND SURVEY IN PRESSURE PASSAGE.
        .NAME	fr3
        .STATUS	24
        .SURVEY	4 Hunky-Dory Mopup:  Q19-PD7 loop (Quap Passage), Q1 Side Lead, Others.
        .NAME	fr4
        .STATUS	24
        .SURVEY	5 DOUG'S DEMISE (50 FT DROP), CHRIS CROSS, CRAWL ABOVE DROP
        .NAME	fr5
        .STATUS	24
        .SURVEY	6 CONTINUATION OF E SURVEY TO WEST ROOM
        .NAME	fr6
        .STATUS	24
        .ENDBOOK
        .BOOK	cr
        .OPTIONS	PREFIX=cr
        .PATH	cr
        .STATUS	17
        .ENDBOOK
        .ENDBOOK
      `,
      fr: {
        'frfix.srv': `
          #FIX	A20	50	40	80
        `,
        'fr1.srv': `
          ;1 ENTRANCE DROPS, JOE'S "I LOVE MY WIFE TRAVERSE", TRICKY TRAVERSE
          ;Peter Quick, Keith Ortiz
          #DATE	1981-02-15
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=C,2
          AE20	<1,3,0,2>
          AE20	AE19	9.3	60/60	-36	<2,12,0,20>	;AE20     0        0        0        Bug-can't put before so put after-so can't make 2 fixed 10/28/12
          AE19	AE18	24.5	0/0	-90	<6,10,25,0>
          AE18	AE17	8	350.5/350.5	17	<3,5,0,0>
          AE17	AE16	6.7	0/0	-90	<3,5,6,1>
          AE16	AE15	12.6	70.5/71	-18	<4,0,2,1>
          AE15	AE14	10	21.5/20	6	<5,5,0,3>
          AE14	AE13	26.8	288/286	-50	<0,7,20,5>
          AE13	AE12	20.7	236/236	34	<3,5,4,4>	;SHORT CANYON AT THE BASE OF THE SECOND DROP
          #[
          Multiline
          Comment
          Test
          #]
          AE12	AE11	26.8	--	-90	<--,7,20,5>
        `,
        'fr2.srv': `
          ;2 TRICKY TRAVERSE AND THEN FIRST SURVEY IN UPPER CROWLWAY
          ;Dan Crowl, Keith Ortiz, Chip Hopper, Peter Quick, Larry Bean
          #DATE	1981-02-14
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=N,2
          A1	<2,7,3,4.5>
          A1	A2	48i10	292/110	-42	<5,10,35,5>
          A2	A3	12i5	333.5/153.5	35	<3,1,15,5>
          A3	A4	4i2	0/0	90	<3,1,10,10>
        `,
        'fr3.srv': `
          ;3 CONNECT UPPER HILTON TO FISHER AVE AND SURVEY IN PRESSURE PASSAGE.
          ;J.SAUNDERS, NANCY COLTER, TOM JOHENGEN, C SANTERRE, LINDA JAGGER
          #DATE	1982-05-16
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=N,2 TYPEVB=N,2
          J6	ML$1	50	124/303.5	11/-11	<12,12,35,15>
          ML$1	ML$2	32	157/337	53/-53	<30,2,16,5>
          ML$2	ML$3	25.1	142.5/324	-5/5	<0,4,5,7>
          ML$3	ML$4	6	--	-90/90	<0,4,11,1>
        `,
        'fr4.srv': `
          ;4 Hunky-Dory Mopup:  Q19-PD7 loop (Quap Passage), Q1 Side Lead, Others.
          ;PETER QUICK, CHIP HOPPER
          #DATE	1983-03-05
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=C,2 TYPEVB=C,2
          Q19	QAP1	25	49.5/49.5	-12/-11	<3,3,1,7>	;Quap Passage short cut from the Hunky-Dory access crawl.
          QAP1	QAP2	27.2	100.5/100	2.5/2.5	<2,3,0,10>
          QAP2	QAP3	14.8	39.5/39.5	-11/-10.5	<1,4,1,12>
          QAP3	QAP4	21.1	355/354	2/2.5	<4,4,2,12>
          QAP4	QAP5	43.6	343/341.5	-5/-4.5	<2,7,5,12>
          QAP5	QAP6	23	39.5/39	9/9.5	<3,4,0,15>
          QAP6	QAP7	35.1	11.5/11	0.5/1	<3,6,1,25>
          QAP7	QAP8	5.8	--	-90/-90	<2,4,6,20>
        `,
        'fr5.srv': `
          ;5 DOUG'S DEMISE (50 FT DROP), CHRIS CROSS, CRAWL ABOVE DROP
          ;PETER QUICK, CHIP HOPPER
          #DATE	1981-03-06
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=C,2
          B29	B30	29.5	320/321	0	--	-0.5	<2,3,4,2>
          B30	B31	13.7	0/0	40	<2,4,6,9>
          B30	B30sp	13.7	0/0	40	<2,4,6,-->
          B32	B33	0	0	-1	<6,7,8,9>
        `,
        'fr6.srv': `
          ;6 CONTINUATION OF E SURVEY TO WEST ROOM
          ;PETER QUICK, CHIP HOPPER
          #DATE	1983-03-05
          #UNITS Feet A=Degrees V=Degrees LRUD=TB TYPEAB=C,2
          #UNITS TAPE=IS
          E36	E37	31.6	231/232	0	--	-2	<3,10,20,32>
          E37	E38	19.2	258.5/259	0	--	1	<10,5,20,30>
          #UNITS TAPE=IT
          E38	E39	36.5	227/228	0	--	1	<10,4,12,30>
          E39	E40	27	0/0	-90	<10,4,29,3>
          #UNITS TAPE=IS
          E40	E41	18.5	260/261.5	0	--	-2.2	<3,3,15,3>
        `,
      },
    })
  })
})
