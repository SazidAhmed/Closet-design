<script setup lang="ts">
import { computed } from "vue";
import { useRoomStore } from "../stores/useRoomStore";
import { useSelectionStore } from "../stores/useSelectionStore";
import { useClosetStore } from "../stores/useClosetStore";
import type {
  PlacedItem,
  PlacedItemCategory,
} from "../features/closet/domain/types/room";

const roomStore = useRoomStore();
const selectionStore = useSelectionStore();
const closetStore = useClosetStore();

const GRID_SIZE = 10;

/** Compute all wall vertices */
const wallVertices = computed((): [number, number][] => {
  const walls = roomStore.walls;
  if (walls.length === 0) return [];
  const verts: [number, number][] = [];
  for (const wall of walls) {
    verts.push([wall.position[0], wall.position[1]]);
  }
  const last = walls[walls.length - 1]!;
  verts.push(wallEndPoint(last));
  return verts;
});

const viewBox = computed(() => {
  const verts = wallVertices.value;
  if (verts.length === 0) return "-240 -240 480 480";
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of verts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const pad = 80;
  const w = Math.max(maxX - minX + pad * 2, 220);
  const h = Math.max(maxY - minY + pad * 2, 220);
  return `${minX - pad} ${minY - pad} ${w} ${h}`;
});

function wallEndPoint(wall: {
  position: [number, number];
  angle: number;
  length: number;
}): [number, number] {
  return [
    wall.position[0] + Math.cos(wall.angle) * wall.length,
    wall.position[1] + Math.sin(wall.angle) * wall.length,
  ];
}

function wallMidpoint(wall: {
  position: [number, number];
  angle: number;
  length: number;
}): [number, number] {
  return [
    wall.position[0] + (Math.cos(wall.angle) * wall.length) / 2,
    wall.position[1] + (Math.sin(wall.angle) * wall.length) / 2,
  ];
}

function wallPolygonPoints(wall: {
  position: [number, number];
  angle: number;
  length: number;
  thickness: number;
}) {
  const t = wall.thickness / 2;
  const perpAngle = wall.angle + Math.PI / 2;
  const cos = Math.cos(perpAngle) * t;
  const sin = Math.sin(perpAngle) * t;
  const end = wallEndPoint(wall);
  const p1 = [wall.position[0] + cos, wall.position[1] + sin];
  const p2 = [wall.position[0] - cos, wall.position[1] - sin];
  const p3 = [end[0] - cos, end[1] - sin];
  const p4 = [end[0] + cos, end[1] + sin];
  return `${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]} ${p4[0]},${p4[1]}`;
}

function formatLength(cm: number): string {
  return `${Math.round(cm / 2.54)}"`;
}

function dimLinePoints(wall: {
  position: [number, number];
  angle: number;
  length: number;
}) {
  const offset = 20;
  const perpAngle = wall.angle - Math.PI / 2;
  const cos = Math.cos(perpAngle) * offset;
  const sin = Math.sin(perpAngle) * offset;
  const end = wallEndPoint(wall);
  return {
    x1: wall.position[0] + cos,
    y1: wall.position[1] + sin,
    x2: end[0] + cos,
    y2: end[1] + sin,
    tx: (wall.position[0] + end[0]) / 2 + cos * 1.6,
    ty: (wall.position[1] + end[1]) / 2 + sin * 1.6,
  };
}

function selectWall(id: string) {
  selectionStore.selectWall(id);
}

// ── Tower plan rendering ─────────────────────────────────────────────────────

/**
 * For each placed tower, compute the four corners of its plan-space footprint.
 * The tower is centred along the wall at `positionAlongWall` and extruded
 * inward (perpendicular into the room) by `tower.depth`.
 */
const placedTowerPolygons = computed(() => {
  return closetStore.towers
    .filter((t) => t.wallId)
    .map((tower) => {
      const wall = roomStore.walls.find((w) => w.id === tower.wallId);
      if (!wall) return null;

      const pos = tower.positionAlongWall ?? 0.5;
      const halfW = tower.width / 2;
      const cx = wall.position[0] + Math.cos(wall.angle) * wall.length * pos;
      const cy = wall.position[1] + Math.sin(wall.angle) * wall.length * pos;

      // Wall direction unit vector
      const wx = Math.cos(wall.angle);
      const wy = Math.sin(wall.angle);
      // Perpendicular pointing inward (left of wall direction = into room)
      const px = -Math.sin(wall.angle);
      const py = Math.cos(wall.angle);

      // Offset by half wall thickness so the back edge of the tower sits on the wall's inside face
      const tHalf = (wall.thickness ?? 6) / 2;
      const cx_inner = cx + px * tHalf;
      const cy_inner = cy + py * tHalf;

      const d = tower.depth;
      const corners: [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
      ] = [
        [cx_inner - wx * halfW, cy_inner - wy * halfW],
        [cx_inner + wx * halfW, cy_inner + wy * halfW],
        [cx_inner + wx * halfW + px * d, cy_inner + wy * halfW + py * d],
        [cx_inner - wx * halfW + px * d, cy_inner - wy * halfW + py * d],
      ];

      return {
        id: tower.id,
        label: tower.label,
        points: corners.map((c) => c.join(",")).join(" "),
        labelX: cx_inner + (px * d) / 2,
        labelY: cy_inner + (py * d) / 2,
        selected: selectionStore.selectedTowerId === tower.id,
        corners,
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);
});

function selectTowerInPlan(towerId: string) {
  selectionStore.selectTower(towerId);
}

// ── Placed door/window item rendering ────────────────────────────────────────

/** Compute SVG x,y for the CENTER of a placed item along its wall. */
function itemSvgPos(item: PlacedItem): { x: number; y: number } {
  const wall = roomStore.walls.find((w) => w.id === item.wallId);
  if (!wall) {
    const b = roomStore.planBounds;
    return { x: b.centerX, y: b.centerY };
  }
  const end = wallEndPoint(wall);
  const t = Math.max(0, Math.min(1, item.positionAlongWall));
  return {
    x: wall.position[0] + (end[0] - wall.position[0]) * t,
    y: wall.position[1] + (end[1] - wall.position[1]) * t,
  };
}

/** Wall angle in degrees for SVG rotate() transform. */
function itemRotateDeg(item: PlacedItem): number {
  const wall = roomStore.walls.find((w) => w.id === item.wallId);
  if (!wall) return 0;
  return (wall.angle * 180) / Math.PI;
}

/** Wall thickness to size the item band (same as FloorPlan.vue). */
function itemBandThickness(item: PlacedItem): number {
  const wall = roomStore.walls.find((w) => w.id === item.wallId);
  return wall ? Math.max(1, wall.thickness - 1) : 6;
}

/** Color per category. */
function itemColor(category: PlacedItemCategory): string {
  switch (category) {
    case "door":
      return "#f97316";
    case "wall_decorator":
      return "#06b6d4";
    default:
      return "#8b5cf6";
  }
}

function isDoorOrWindowItem(item: PlacedItem): boolean {
  return item.category === "door" || item.type === "window";
}

/** All items that have a wallId and are door/window types. */
const placedDoorWindowItems = computed(() =>
  roomStore.items.filter(
    (item) => item.wallId !== null && isDoorOrWindowItem(item),
  ),
);

// ── Drag-to-move/resize tower along wall ─────────────────────────────────────

/**
 * Returns the clamped positionAlongWall (0-1) for a tower centre, ensuring
 * the tower [centerCm - halfW, centerCm + halfW] does not overlap any door or
 * window interval on the same wall.
 *
 * Key invariant: the returned position, after normal wall-boundary clamping
 * (min = halfW/wallLength, max = 1 - halfW/wallLength), must still be clear
 * of all obstructions. So we only accept an escape direction when the tower
 * actually fits on that side within the wall bounds.
 *
 * @param proposed   proposed fractional position (0..1)
 * @param halfW      half of the tower width in cm
 * @param wallLength wall length in cm
 * @param wallId     ID of the wall the tower is on
 * @param prevPos    last known good position (returned if no room on either side)
 */
function clampTowerAwayFromObstructions(
  proposed: number,
  halfW: number,
  wallLength: number,
  wallId: string,
  prevPos: number,
): number {
  if (wallLength <= 0) return proposed;

  // Collect blocked intervals in cm from all doors/windows on the same wall
  const blocked: Array<[number, number]> = roomStore.items
    .filter((item) => item.wallId === wallId && isDoorOrWindowItem(item))
    .map((item) => {
      const centerCm = item.positionAlongWall * wallLength;
      const hw = item.width / 2;
      return [centerCm - hw, centerCm + hw] as [number, number];
    });

  if (blocked.length === 0) return proposed;

  const proposedCm = proposed * wallLength;
  const towerLeft = proposedCm - halfW;
  const towerRight = proposedCm + halfW;

  for (const [bLeft, bRight] of blocked) {
    // Check if the tower overlaps this interval
    if (towerRight > bLeft && towerLeft < bRight) {
      // Candidate escape positions (cm for the tower centre)
      const pushLeftCm = bLeft - halfW; // right edge touches bLeft
      const pushRightCm = bRight + halfW; // left  edge touches bRight

      // Validate: the escape must fit within the wall
      const leftFits = pushLeftCm >= halfW; // tower start >= 0
      const rightFits = pushRightCm <= wallLength - halfW; // tower end   <= wallLength

      if (leftFits && rightFits) {
        // Both fit — pick the side that needs less movement
        const distLeft = Math.abs(proposedCm - pushLeftCm);
        const distRight = Math.abs(proposedCm - pushRightCm);
        return (distLeft <= distRight ? pushLeftCm : pushRightCm) / wallLength;
      } else if (leftFits) {
        return pushLeftCm / wallLength;
      } else if (rightFits) {
        return pushRightCm / wallLength;
      } else {
        // Tower is wider than any available gap — block the move
        return prevPos;
      }
    }
  }

  return proposed;
}

let dragState: {
  mode: "move" | "depth" | "width-start" | "width-end";
  towerId: string;
  wallLength: number;
  startSvgX: number;
  startSvgY: number;
  startPos: number;
  startWidth: number;
  startDepth: number;
  wallAngle: number;
  wallThickness: number;
} | null = null;

function onTowerPointerDown(e: PointerEvent, towerId: string) {
  e.stopPropagation();
  selectionStore.selectTower(towerId);
  const tower = closetStore.towers.find((t) => t.id === towerId);
  const wall = tower?.wallId
    ? roomStore.walls.find((w) => w.id === tower.wallId)
    : null;
  if (!wall || !tower) return;

  const svg = (e.currentTarget as SVGElement).closest(
    "svg",
  ) as SVGSVGElement | null;
  if (!svg) return;

  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());

  dragState = {
    mode: "move",
    towerId,
    wallLength: wall.length,
    startSvgX: svgPt.x,
    startSvgY: svgPt.y,
    startPos: tower.positionAlongWall ?? 0.5,
    startWidth: tower.width,
    startDepth: tower.depth,
    wallAngle: wall.angle,
    wallThickness: wall.thickness ?? 6,
  };
  (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
}

function onHandlePointerDown(
  e: PointerEvent,
  towerId: string,
  mode: "depth" | "width-start" | "width-end",
) {
  e.stopPropagation();
  selectionStore.selectTower(towerId);
  const tower = closetStore.towers.find((t) => t.id === towerId);
  const wall = tower?.wallId
    ? roomStore.walls.find((w) => w.id === tower.wallId)
    : null;
  if (!wall || !tower) return;

  const svg = (e.currentTarget as SVGElement).closest(
    "svg",
  ) as SVGSVGElement | null;
  if (!svg) return;

  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());

  dragState = {
    mode,
    towerId,
    wallLength: wall.length,
    startSvgX: svgPt.x,
    startSvgY: svgPt.y,
    startPos: tower.positionAlongWall ?? 0.5,
    startWidth: tower.width,
    startDepth: tower.depth,
    wallAngle: wall.angle,
    wallThickness: wall.thickness ?? 6,
  };
  (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
}

function onSvgPointerMove(e: PointerEvent) {
  if (!dragState) return;
  const tower = closetStore.towers.find((t) => t.id === dragState!.towerId);
  const wall = tower?.wallId
    ? roomStore.walls.find((w) => w.id === tower.wallId)
    : null;
  if (!wall || !tower) return;

  const svg = e.currentTarget as SVGSVGElement;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());

  const dx = svgPt.x - dragState.startSvgX;
  const dy = svgPt.y - dragState.startSvgY;

  if (dragState.mode === "move") {
    const wallDx = Math.cos(dragState.wallAngle);
    const wallDy = Math.sin(dragState.wallAngle);
    const projected = dx * wallDx + dy * wallDy;
    const delta = projected / dragState.wallLength;

    const halfW = tower.width / 2;
    const halfRatio =
      dragState.wallLength > 0 ? halfW / dragState.wallLength : 0;
    const min = Math.max(0, halfRatio);
    const max = Math.min(1, 1 - halfRatio);
    const rawPos = Math.max(min, Math.min(max, dragState.startPos + delta));
    const prevPos = tower.positionAlongWall ?? 0.5;
    const clampedPos = clampTowerAwayFromObstructions(
      rawPos,
      halfW,
      dragState.wallLength,
      wall.id,
      prevPos,
    );
    closetStore.updateTower(tower.id, {
      positionAlongWall: Math.max(min, Math.min(max, clampedPos)),
    });
  } else if (dragState.mode === "depth") {
    const px = -Math.sin(dragState.wallAngle);
    const py = Math.cos(dragState.wallAngle);
    const projectedChange = dx * px + dy * py;
    const requestedDepth = dragState.startDepth + projectedChange;

    closetStore.setTowerDepth(tower.id, requestedDepth);
  } else if (dragState.mode === "width-start") {
    const wx = Math.cos(dragState.wallAngle);
    const wy = Math.sin(dragState.wallAngle);
    const projectedChange = dx * wx + dy * wy;

    const pinnedPosCm =
      dragState.startPos * dragState.wallLength + dragState.startWidth / 2;
    const draggedPosCm =
      dragState.startPos * dragState.wallLength -
      dragState.startWidth / 2 +
      projectedChange;
    const requestedWidth = pinnedPosCm - draggedPosCm;

    closetStore.setTowerWidth(tower.id, requestedWidth);
    const actualWidth = tower.width;

    const newCenterCm = pinnedPosCm - actualWidth / 2;
    const rawPos = newCenterCm / dragState.wallLength;

    const halfRatio =
      dragState.wallLength > 0 ? actualWidth / 2 / dragState.wallLength : 0;
    const min = Math.max(0, halfRatio);
    const max = Math.min(1, 1 - halfRatio);
    const prevPos = tower.positionAlongWall ?? 0.5;
    const clampedPos = clampTowerAwayFromObstructions(
      rawPos,
      actualWidth / 2,
      dragState.wallLength,
      wall.id,
      prevPos,
    );
    closetStore.updateTower(tower.id, {
      positionAlongWall: Math.max(min, Math.min(max, clampedPos)),
    });
  } else if (dragState.mode === "width-end") {
    const wx = Math.cos(dragState.wallAngle);
    const wy = Math.sin(dragState.wallAngle);
    const projectedChange = dx * wx + dy * wy;

    const pinnedPosCm =
      dragState.startPos * dragState.wallLength - dragState.startWidth / 2;
    const draggedPosCm =
      dragState.startPos * dragState.wallLength +
      dragState.startWidth / 2 +
      projectedChange;
    const requestedWidth = draggedPosCm - pinnedPosCm;

    closetStore.setTowerWidth(tower.id, requestedWidth);
    const actualWidth = tower.width;

    const newCenterCm = pinnedPosCm + actualWidth / 2;
    const rawPos = newCenterCm / dragState.wallLength;

    const halfRatio =
      dragState.wallLength > 0 ? actualWidth / 2 / dragState.wallLength : 0;
    const min = Math.max(0, halfRatio);
    const max = Math.min(1, 1 - halfRatio);
    const prevPos = tower.positionAlongWall ?? 0.5;
    const clampedPos = clampTowerAwayFromObstructions(
      rawPos,
      actualWidth / 2,
      dragState.wallLength,
      wall.id,
      prevPos,
    );
    closetStore.updateTower(tower.id, {
      positionAlongWall: Math.max(min, Math.min(max, clampedPos)),
    });
  }
}

function onSvgPointerUp() {
  dragState = null;
}
</script>

<template>
  <div class="room-preview-container">
    <svg
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      class="room-preview-svg"
      xmlns="http://www.w3.org/2000/svg"
      @pointermove="onSvgPointerMove"
      @pointerup="onSvgPointerUp"
      @pointerleave="onSvgPointerUp"
    >
      <!-- Grid pattern -->
      <defs>
        <pattern
          id="drawGrid"
          :width="GRID_SIZE"
          :height="GRID_SIZE"
          patternUnits="userSpaceOnUse"
        >
          <circle
            :cx="GRID_SIZE / 2"
            :cy="GRID_SIZE / 2"
            r="0.5"
            fill="rgba(148,163,184,0.15)"
          />
        </pattern>
        <!-- Arrow markers for dimensions -->
        <marker
          id="dimArrowR"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path
            d="M0,0 L8,4 L0,8"
            fill="none"
            stroke="#94a3b8"
            stroke-width="1"
          />
        </marker>
        <marker
          id="dimArrowL"
          markerWidth="8"
          markerHeight="8"
          refX="2"
          refY="4"
          orient="auto"
        >
          <path
            d="M8,0 L0,4 L8,8"
            fill="none"
            stroke="#94a3b8"
            stroke-width="1"
          />
        </marker>
      </defs>

      <!-- Background grid -->
      <rect
        x="-2000"
        y="-2000"
        width="4000"
        height="4000"
        fill="url(#drawGrid)"
      />

      <!-- Filled room polygon (floor) -->
      <polygon
        v-if="roomStore.walls.length >= 3"
        :points="wallVertices.map((v) => v.join(',')).join(' ')"
        fill="#d4c9b8"
        fill-opacity="0.15"
        stroke="none"
      />

      <!-- Drawn wall segments -->
      <g v-for="wall in roomStore.walls" :key="wall.id">
        <!-- Thick wall polygon -->
        <polygon
          :points="wallPolygonPoints(wall)"
          :fill="
            selectionStore.selectedWallId === wall.id ? '#e8c88a' : '#d4c9b8'
          "
          :stroke="
            selectionStore.selectedWallId === wall.id ? '#f59e0b' : '#8b7355'
          "
          :stroke-width="selectionStore.selectedWallId === wall.id ? 2 : 1"
          stroke-linejoin="round"
          stroke-linecap="round"
          class="wall-polygon"
          @click="selectWall(wall.id)"
        />

        <!-- Wall label (number) -->
        <g
          :transform="`translate(${wallMidpoint(wall)[0]}, ${wallMidpoint(wall)[1]})`"
        >
          <circle r="10" fill="#f59e0b" stroke="#0f172a" stroke-width="1.5" />
          <text
            text-anchor="middle"
            dominant-baseline="central"
            fill="#0f172a"
            font-size="9"
            font-weight="700"
          >
            {{ wall.label }}
          </text>
        </g>

        <!-- Dimension annotation -->
        <line
          :x1="dimLinePoints(wall).x1"
          :y1="dimLinePoints(wall).y1"
          :x2="dimLinePoints(wall).x2"
          :y2="dimLinePoints(wall).y2"
          stroke="#94a3b8"
          stroke-width="0.8"
          marker-start="url(#dimArrowL)"
          marker-end="url(#dimArrowR)"
          pointer-events="none"
        />
        <text
          :x="dimLinePoints(wall).tx"
          :y="dimLinePoints(wall).ty"
          text-anchor="middle"
          fill="#e2e8f0"
          font-size="9"
          font-weight="600"
        >
          {{ formatLength(wall.length) }}
        </text>
      </g>

      <!-- Placed door/window items -->
      <g
        v-for="item in placedDoorWindowItems"
        :key="item.id"
        :transform="`translate(${itemSvgPos(item).x}, ${itemSvgPos(item).y}) rotate(${itemRotateDeg(item)})`"
        pointer-events="none"
      >
        <!-- Wall-band gap / opening strip -->
        <rect
          :x="-item.width / 2"
          :y="-itemBandThickness(item) / 2"
          :width="item.width"
          :height="itemBandThickness(item)"
          :fill="item.category === 'door' ? '#07111f' : 'rgba(6,182,212,0.18)'"
          rx="1"
        />
        <!-- Door: hinge line -->
        <g v-if="item.category === 'door'">
          <line
            :x1="-item.width / 2"
            :y1="-itemBandThickness(item) / 2"
            :x2="-item.width / 2"
            :y2="itemBandThickness(item) / 2"
            :stroke="itemColor(item.category)"
            stroke-width="1.5"
          />
        </g>
        <!-- Window: glass lines -->
        <g v-else-if="item.type === 'window'">
          <line
            :x1="-item.width / 2"
            y1="0"
            :x2="item.width / 2"
            y2="0"
            :stroke="itemColor(item.category)"
            stroke-width="1.5"
          />
          <line
            :x1="-item.width / 4"
            :y1="-itemBandThickness(item) / 2"
            :x2="-item.width / 4"
            :y2="itemBandThickness(item) / 2"
            :stroke="itemColor(item.category)"
            stroke-width="0.8"
            opacity="0.6"
          />
          <line
            :x1="item.width / 4"
            :y1="-itemBandThickness(item) / 2"
            :x2="item.width / 4"
            :y2="itemBandThickness(item) / 2"
            :stroke="itemColor(item.category)"
            stroke-width="0.8"
            opacity="0.6"
          />
        </g>
        <!-- Label above the item -->
        <text
          x="0"
          :y="-itemBandThickness(item) / 2 - 5"
          text-anchor="middle"
          :fill="itemColor(item.category)"
          font-size="6"
          font-weight="700"
        >
          {{ item.type === "window" ? "WIN" : "DOOR" }}
        </text>
      </g>

      <!-- Placed towers (footprint rectangles) -->
      <g
        v-for="tower in placedTowerPolygons"
        :key="tower.id"
        class="tower-footprint-group"
        @pointerdown="(e) => onTowerPointerDown(e, tower.id)"
        @click.stop="selectTowerInPlan(tower.id)"
      >
        <polygon
          :points="tower.points"
          :fill="
            tower.selected ? 'rgba(251,191,36,0.35)' : 'rgba(251,191,36,0.15)'
          "
          :stroke="tower.selected ? '#fbbf24' : '#f59e0b'"
          :stroke-width="tower.selected ? 2 : 1"
          stroke-linejoin="round"
          class="tower-footprint"
        />
        <!-- Tower label at centre of footprint -->
        <text
          :x="tower.labelX"
          :y="tower.labelY"
          text-anchor="middle"
          dominant-baseline="central"
          fill="#fbbf24"
          font-size="7"
          font-weight="700"
          pointer-events="none"
        >
          {{ tower.label }}
        </text>

        <!-- Resize Handles (Only for selected tower) -->
        <g v-if="tower.selected" class="resize-edges-group">
          <!-- Width Start Edge Handle (Left) -->
          <line
            :x1="tower.corners[0][0]"
            :y1="tower.corners[0][1]"
            :x2="tower.corners[3][0]"
            :y2="tower.corners[3][1]"
            class="resize-edge width-edge"
            @pointerdown="
              (e) => onHandlePointerDown(e, tower.id, 'width-start')
            "
          />

          <!-- Width End Edge Handle (Right) -->
          <line
            :x1="tower.corners[1][0]"
            :y1="tower.corners[1][1]"
            :x2="tower.corners[2][0]"
            :y2="tower.corners[2][1]"
            class="resize-edge width-edge"
            @pointerdown="(e) => onHandlePointerDown(e, tower.id, 'width-end')"
          />

          <!-- Depth Edge Handle (Front) -->
          <line
            :x1="tower.corners[3][0]"
            :y1="tower.corners[3][1]"
            :x2="tower.corners[2][0]"
            :y2="tower.corners[2][1]"
            class="resize-edge depth-edge"
            @pointerdown="(e) => onHandlePointerDown(e, tower.id, 'depth')"
          />
        </g>
      </g>

      <!-- Vertices (dots at each corner) -->
      <circle
        v-for="(v, i) in wallVertices"
        :key="'v-' + i"
        class="vertex-dot"
        :cx="v[0]"
        :cy="v[1]"
        :r="4"
        fill="#fbbf24"
        stroke="#0f172a"
        stroke-width="1.5"
      />
    </svg>
    <div v-if="!selectionStore.selectedWallId" class="select-hint">
      Click a wall to select it for building.
    </div>
  </div>
</template>

<style scoped>
.room-preview-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
  max-height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.room-preview-svg {
  width: 100%;
  height: 100%;
  max-height: 100%;
}

.wall-polygon {
  cursor: pointer;
  transition:
    fill 0.2s,
    stroke 0.2s;
}

.wall-polygon:hover {
  fill: #e8c88a;
  opacity: 0.8;
}

.tower-footprint-group {
  cursor: grab;
}

.tower-footprint-group:active {
  cursor: grabbing;
}

.tower-footprint {
  transition:
    fill 0.15s,
    stroke 0.15s;
}

.tower-footprint-group:hover .tower-footprint {
  fill: rgba(251, 191, 36, 0.45);
}

.vertex-dot {
  pointer-events: none;
}

.select-hint {
  position: absolute;
  bottom: 12px;
  background: rgba(15, 23, 42, 0.8);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #94a3b8;
  pointer-events: none;
}

.resize-edge {
  fill: none;
  stroke: transparent;
  stroke-width: 8;
  transition: stroke 0.15s ease;
}

.resize-edge:hover {
  stroke: rgba(251, 191, 36, 0.45);
  cursor: pointer;
}

.resize-edge.width-edge {
  cursor: col-resize;
}

.resize-edge.depth-edge {
  cursor: row-resize;
}
</style>
