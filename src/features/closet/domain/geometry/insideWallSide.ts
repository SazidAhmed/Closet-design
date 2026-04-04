import type { Vec2 } from '../types/room'

export type InsideSide = 'right' | 'left'

export type WallInsideSegment = {
  position: Vec2
  angle: number
  length: number
  thickness: number
}

export type LineSegment = {
  x1: number
  y1: number
  x2: number
  y2: number
}

function sideOffsetVector(angle: number, magnitude: number, side: InsideSide): Vec2 {
  const sideSign = side === 'right' ? 1 : -1
  return [
    Math.cos(angle + Math.PI / 2) * magnitude * sideSign,
    Math.sin(angle + Math.PI / 2) * magnitude * sideSign,
  ]
}

export function wallInsideEdgeLine(
  wall: WallInsideSegment,
  side: InsideSide = 'right',
  edgeInset = 0,
): LineSegment {
  const halfThickness = Math.max(0, wall.thickness / 2)
  const inset = Math.max(0, edgeInset)
  const offsetMagnitude = Math.max(0, halfThickness - inset)

  // In SVG screen coordinates (y grows downward), +90deg from direction points
  // to the wall's right-hand side.
  const [offsetX, offsetY] = sideOffsetVector(wall.angle, offsetMagnitude, side)

  const endX = wall.position[0] + Math.cos(wall.angle) * wall.length
  const endY = wall.position[1] + Math.sin(wall.angle) * wall.length

  return {
    x1: wall.position[0] + offsetX,
    y1: wall.position[1] + offsetY,
    x2: endX + offsetX,
    y2: endY + offsetY,
  }
}

export function wallInsideGuideAreaPoints(
  wall: WallInsideSegment,
  side: InsideSide = 'right',
  edgeInset = 0,
  guideDepth = 60,
): string {
  const edge = wallInsideEdgeLine(wall, side, edgeInset)
  const depth = Math.max(1, guideDepth)
  const [dx, dy] = sideOffsetVector(wall.angle, depth, side)

  const p1: Vec2 = [edge.x1, edge.y1]
  const p2: Vec2 = [edge.x2, edge.y2]
  const p3: Vec2 = [edge.x2 + dx, edge.y2 + dy]
  const p4: Vec2 = [edge.x1 + dx, edge.y1 + dy]

  return `${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]} ${p4[0]},${p4[1]}`
}
