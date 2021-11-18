# @speleotica/frcs2walls

[![CircleCI](https://circleci.com/gh/speleotica/frcs2walls.svg?style=svg)](https://circleci.com/gh/speleotica/frcs2walls)
[![Coverage Status](https://codecov.io/gh/speleotica/frcs2walls/branch/master/graph/badge.svg)](https://codecov.io/gh/speleotica/frcs2walls)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![npm version](https://badge.fury.io/js/%40speleotica%2Ffrcs2walls.svg)](https://badge.fury.io/js/%40speleotica%2Ffrcs2walls)

converts cave survey data in FRCS format to Walls format

# API

## `convertToWalls({ title: string, caves: InputCave[] }): WallsWpjFile`

```js
import { convertToWalls } from '@speleotica/frcs2walls'
```
