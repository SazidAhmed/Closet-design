import { describe, expect, it } from 'vitest'
import {
  wallInsideEdgeLine,
  wallInsideGuideAreaPoints,
} from '../src/features/closet/domain/geometry/insideWallSide'

const EPS = 1e-6

function expectClose(a: number, b: number, epsilon = EPS): void {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(epsilon)
}

function parsePoints(points: string): Array<[number, number]> {
  return points
    .split(' ')
    .map((pair) => pair.split(',').map(Number) as [number, number])
}

describe('inside wall side indicator geometry', () => {
  it('left-to-right wall has inside on the lower side', () => {
    const line = wallInsideEdgeLine({
      position: [0, 0],
      angle: 0,
      length: 100,
      thickness: 10,
    })

    expect(line.y1).toBeGreaterThan(0)
    expect(line.y2).toBeGreaterThan(0)
    expectClose(line.x1, 0)
    expectClose(line.x2, 100)
  })

  it('right-to-left wall has inside on the upper side', () => {
    const line = wallInsideEdgeLine({
      position: [100, 0],
      angle: Math.PI,
      length: 100,
      thickness: 10,
    })

    expect(line.y1).toBeLessThan(0)
    expect(line.y2).toBeLessThan(0)
    expectClose(line.x1, 100)
    expectClose(line.x2, 0)
  })

  it('bottom-to-top wall has inside on the right side', () => {
    const line = wallInsideEdgeLine({
      position: [0, 100],
      angle: -Math.PI / 2,
      length: 100,
      thickness: 10,
    })

    expect(line.x1).toBeGreaterThan(0)
    expect(line.x2).toBeGreaterThan(0)
    expectClose(line.y1, 100)
    expectClose(line.y2, 0)
  })

  it('top-to-bottom wall has inside on the left side', () => {
    const line = wallInsideEdgeLine({
      position: [0, 0],
      angle: Math.PI / 2,
      length: 100,
      thickness: 10,
    })

    expect(line.x1).toBeLessThan(0)
    expect(line.x2).toBeLessThan(0)
    expectClose(line.y1, 0)
    expectClose(line.y2, 100)
  })

  it('inside guide area extends to right side for left-to-right wall', () => {
    const points = parsePoints(
      wallInsideGuideAreaPoints({
        position: [0, 0],
        angle: 0,
        length: 100,
        thickness: 10,
      }, 'right', 0, 60),
    )

    // p1,p2 are on inside edge; p3,p4 extend further into the inside area.
    expect(points[0]![1]).toBeGreaterThan(0)
    expect(points[1]![1]).toBeGreaterThan(0)
    expect(points[2]![1]).toBeGreaterThan(points[1]![1])
    expect(points[3]![1]).toBeGreaterThan(points[0]![1])
  })

  it('inside guide area extends to left side for top-to-bottom wall', () => {
    const points = parsePoints(
      wallInsideGuideAreaPoints({
        position: [0, 0],
        angle: Math.PI / 2,
        length: 100,
        thickness: 10,
      }, 'right', 0, 60),
    )

    expect(points[0]![0]).toBeLessThan(0)
    expect(points[1]![0]).toBeLessThan(0)
    expect(points[2]![0]).toBeLessThan(points[1]![0])
    expect(points[3]![0]).toBeLessThan(points[0]![0])
  })
})
