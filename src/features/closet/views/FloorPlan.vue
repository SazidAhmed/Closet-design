<script setup lang="ts">
import TopToolbar from "../../../components/TopToolbar.vue";
import FooterBar from "../../../components/FooterBar.vue";
import { useRoomStore } from "../../../stores/useRoomStore";
import { useClosetStore } from "../../../stores/useClosetStore";
import { useAppStore } from "../../../stores/useAppStore";
import { onMounted, onUnmounted, computed, ref, reactive } from "vue";
import {
  FLOOR_MATERIALS,
  WALL_COLORS,
  TRIM_COLORS,
  HANDLE_STYLES,
  DOOR_MATERIALS,
} from "../domain/materials/catalog";
import { ROOM_CONSTRAINTS } from "../domain/constraints";
import { createDefaultRoom } from "../domain/types/room";
import { useHistoryStore } from "../../../stores/useHistoryStore";

const roomStore = useRoomStore();
const closet = useClosetStore();
const appStore = useAppStore();
const historyStore = useHistoryStore();

/** Width of the room (wall 0) */
const roomW = computed(() => roomStore.walls[0]?.length ?? 244);
/** Depth of the room (wall 1) */
const roomD = computed(() => roomStore.walls[1]?.length ?? 244);

/** Darken the wall color slightly for the 2D wall stroke */
function darkenHex(hex: string, amount = 40): string {
  const c = hex.replace("#", "");
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const wallStroke = computed(() => darkenHex(roomStore.colors.wallColor, 50));

// ───── Dynamic viewBox ─────────────────────────────────────────────────────
const viewPad = 80; // padding around room in SVG units
const svgViewBox = computed(() => {
  const w = roomW.value + viewPad * 2;
  const h = roomD.value + viewPad * 2;
  return `${-w / 2} ${-h / 2} ${w} ${h}`;
});

// ───── Drag-to-resize ──────────────────────────────────────────────────────
const svgRef = ref<SVGSVGElement | null>(null);

type DragAxis = "width" | "depth" | "both";

const drag = reactive<{
  active: boolean;
  axis: DragAxis;
  cornerIdx: number; // which corner (for sign calc)
  startMouseX: number;
  startMouseY: number;
  startW: number;
  startD: number;
}>({
  active: false,
  axis: "both",
  cornerIdx: 0,
  startMouseX: 0,
  startMouseY: 0,
  startW: 244,
  startD: 244,
});

/** Convert screen pixels to SVG units using the CTM */
function screenToSvg(
  svg: SVGSVGElement,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = screenX;
  pt.y = screenY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

// Corner cursors (TL, TR, BR, BL)
const cornerCursors = [
  "nwse-resize",
  "nesw-resize",
  "nwse-resize",
  "nesw-resize",
];
// Mid-wall cursors (Top, Right, Bottom, Left)
const midCursors = ["ns-resize", "ew-resize", "ns-resize", "ew-resize"];

function startCornerDrag(idx: number, e: PointerEvent) {
  if (!svgRef.value) return;
  e.preventDefault();
  (e.target as Element)?.setPointerCapture?.(e.pointerId);
  drag.active = true;
  drag.axis = "both";
  drag.cornerIdx = idx;
  drag.startMouseX = e.clientX;
  drag.startMouseY = e.clientY;
  drag.startW = roomW.value;
  drag.startD = roomD.value;
}

function startMidDrag(idx: number, e: PointerEvent) {
  if (!svgRef.value) return;
  e.preventDefault();
  (e.target as Element)?.setPointerCapture?.(e.pointerId);
  drag.active = true;
  // Top(0)/Bottom(2) = depth, Right(1)/Left(3) = width
  drag.axis = idx === 0 || idx === 2 ? "depth" : "width";
  drag.cornerIdx = idx;
  drag.startMouseX = e.clientX;
  drag.startMouseY = e.clientY;
  drag.startW = roomW.value;
  drag.startD = roomD.value;
}

function onPointerMove(e: PointerEvent) {
  if (!drag.active || !svgRef.value) return;

  const startSvg = screenToSvg(
    svgRef.value,
    drag.startMouseX,
    drag.startMouseY,
  );
  const nowSvg = screenToSvg(svgRef.value, e.clientX, e.clientY);

  const dx = nowSvg.x - startSvg.x;
  const dy = nowSvg.y - startSvg.y;

  // Determine sign based on which handle was grabbed
  // Corners: 0=TL(-x,-y) 1=TR(+x,-y) 2=BR(+x,+y) 3=BL(-x,+y)
  // Mid: 0=Top(y-) 1=Right(x+) 2=Bottom(y+) 3=Left(x-)
  let newW = drag.startW;
  let newD = drag.startD;

  if (drag.axis === "both") {
    const signX = drag.cornerIdx === 0 || drag.cornerIdx === 3 ? -1 : 1;
    const signY = drag.cornerIdx === 0 || drag.cornerIdx === 1 ? -1 : 1;
    newW = drag.startW + dx * signX * 2; // ×2 because room is centered
    newD = drag.startD + dy * signY * 2;
  } else if (drag.axis === "width") {
    const signX = drag.cornerIdx === 3 ? -1 : 1;
    newW = drag.startW + dx * signX * 2;
  } else {
    const signY = drag.cornerIdx === 0 ? -1 : 1;
    newD = drag.startD + dy * signY * 2;
  }

  roomStore.resizeRoom(newW, newD);
}

function onPointerUp() {
  drag.active = false;
}

onMounted(() => {
  appStore.setStep("floorplan");
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
});

onUnmounted(() => {
  document.removeEventListener("pointermove", onPointerMove);
  document.removeEventListener("pointerup", onPointerUp);
});

// ───── Change Room Height dialog ───────────────────────────────────────────
const showHeightDialog = ref(false);
const heightInput = ref(244);

function openHeightDialog() {
  heightInput.value = roomStore.height;
  showHeightDialog.value = true;
}

function applyHeight() {
  const clamped = Math.max(
    ROOM_CONSTRAINTS.height.min,
    Math.min(ROOM_CONSTRAINTS.height.max, Math.round(heightInput.value)),
  );
  roomStore.setHeight(clamped);
  showHeightDialog.value = false;
}

/** Convert cm to feet-inches string */
function cmToImperial(cm: number): string {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  return `${ft}' ${inches}"`;
}

// ───── Architecture item catalog ───────────────────────────────────────────
import type { PlacedItemType, PlacedItemCategory } from "../domain/types/room";

type ItemDef = {
  type: PlacedItemType;
  category: PlacedItemCategory;
  width: number;
  height: number;
  icon: string;
};

const DOOR_ITEMS: ItemDef[] = [
  {
    type: "wall_opening",
    category: "door",
    width: 91,
    height: 213,
    icon: "🚪",
  },
  {
    type: "double_door",
    category: "door",
    width: 152,
    height: 213,
    icon: "🚪",
  },
  { type: "single_door", category: "door", width: 91, height: 213, icon: "🚪" },
  {
    type: "sliding_door",
    category: "door",
    width: 152,
    height: 213,
    icon: "🚪",
  },
  {
    type: "bifold_door",
    category: "door",
    width: 122,
    height: 213,
    icon: "🚪",
  },
];

const ARCH_ITEMS: ItemDef[] = [
  {
    type: "rect_column",
    category: "architecture",
    width: 30,
    height: 244,
    icon: "🏛️",
  },
  {
    type: "round_column",
    category: "architecture",
    width: 30,
    height: 244,
    icon: "🏛️",
  },
  {
    type: "interior_wall",
    category: "architecture",
    width: 10,
    height: 244,
    icon: "🏛️",
  },
];

const DECO_ITEMS: ItemDef[] = [
  {
    type: "window",
    category: "wall_decorator",
    width: 91,
    height: 122,
    icon: "🪟",
  },
  {
    type: "vent",
    category: "wall_decorator",
    width: 30,
    height: 30,
    icon: "🪟",
  },
  {
    type: "outlet",
    category: "wall_decorator",
    width: 8,
    height: 12,
    icon: "🪟",
  },
  {
    type: "light_switch",
    category: "wall_decorator",
    width: 8,
    height: 12,
    icon: "🪟",
  },
  {
    type: "wall_photo",
    category: "wall_decorator",
    width: 60,
    height: 45,
    icon: "🪟",
  },
  {
    type: "floor_photo",
    category: "wall_decorator",
    width: 60,
    height: 45,
    icon: "🪟",
  },
];

function itemLabel(type: PlacedItemType): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Place an architecture item on wall 0 (bottom) at center */
function addArchItem(def: ItemDef) {
  const wallId = roomStore.walls[0]?.id ?? null;
  roomStore.addItem({
    type: def.type,
    category: def.category,
    wallId,
    positionAlongWall: 0.5,
    width: def.width,
    height: def.height,
  });
}

// ───── Selected item & item drag ───────────────────────────────────────────
const selectedItemId = ref<string | null>(null);

const itemDrag = reactive<{
  active: boolean;
  itemId: string;
  wallId: string;
  wallIdx: number;
}>({
  active: false,
  itemId: "",
  wallId: "",
  wallIdx: 0,
});

function selectItem(itemId: string, e: PointerEvent) {
  e.stopPropagation();
  selectedItemId.value = itemId;
}

function startItemDrag(itemId: string, wallId: string, e: PointerEvent) {
  e.stopPropagation();
  e.preventDefault();
  selectedItemId.value = itemId;
  const wallIdx = roomStore.walls.findIndex((w) => w.id === wallId);
  if (wallIdx < 0) return;
  (e.target as Element)?.setPointerCapture?.(e.pointerId);
  itemDrag.active = true;
  itemDrag.itemId = itemId;
  itemDrag.wallId = wallId;
  itemDrag.wallIdx = wallIdx;
}

function onItemPointerMove(e: PointerEvent) {
  if (!itemDrag.active || !svgRef.value) return;
  const pt = screenToSvg(svgRef.value, e.clientX, e.clientY);
  const wIdx = itemDrag.wallIdx;

  let pos = 0.5;
  if (wIdx === 0) {
    // Bottom wall — horizontal, x from -roomW/2 to +roomW/2
    pos = (pt.x + roomW.value / 2) / roomW.value;
  } else if (wIdx === 2) {
    // Top wall — horizontal (reversed direction)
    pos = (roomW.value / 2 - pt.x) / roomW.value;
  } else if (wIdx === 1) {
    // Right wall — vertical, y from -roomD/2 to +roomD/2
    pos = (pt.y + roomD.value / 2) / roomD.value;
  } else if (wIdx === 3) {
    // Left wall — vertical (reversed direction)
    pos = (roomD.value / 2 - pt.y) / roomD.value;
  }

  // Clamp between 0.05 and 0.95 to keep items on the wall
  pos = Math.max(0.05, Math.min(0.95, pos));
  roomStore.moveItem(itemDrag.itemId, pos);
}

function onItemPointerUp() {
  itemDrag.active = false;
}

function deleteSelectedItem() {
  if (selectedItemId.value) {
    roomStore.removeItem(selectedItemId.value);
    selectedItemId.value = null;
  }
}

// Register item drag listeners
onMounted(() => {
  document.addEventListener("pointermove", onItemPointerMove);
  document.addEventListener("pointerup", onItemPointerUp);
});

onUnmounted(() => {
  document.removeEventListener("pointermove", onItemPointerMove);
  document.removeEventListener("pointerup", onItemPointerUp);
});

// ───── SVG helpers for placed items ────────────────────────────────────────
/**
 * Compute the SVG (x, y) position for a placed item based on its wall and position.
 * Returns the CENTER of the item rectangle.
 */
function itemSvgPos(item: {
  wallId: string | null;
  positionAlongWall: number;
}): { x: number; y: number } {
  const wIdx = roomStore.walls.findIndex((w) => w.id === item.wallId);
  const wHalf = roomW.value / 2;
  const dHalf = roomD.value / 2;

  if (wIdx === 0) {
    // Bottom wall (y = -dHalf)
    return { x: -wHalf + item.positionAlongWall * roomW.value, y: -dHalf };
  } else if (wIdx === 1) {
    // Right wall (x = +wHalf)
    return { x: wHalf, y: -dHalf + item.positionAlongWall * roomD.value };
  } else if (wIdx === 2) {
    // Top wall (y = +dHalf)
    return { x: wHalf - item.positionAlongWall * roomW.value, y: dHalf };
  } else if (wIdx === 3) {
    // Left wall (x = -wHalf)
    return { x: -wHalf, y: dHalf - item.positionAlongWall * roomD.value };
  }
  // Free-standing — center of room
  return { x: 0, y: 0 };
}

/** Pick a color for the item category */
function itemColor(category: PlacedItemCategory): string {
  switch (category) {
    case "door":
      return "#f97316";
    case "architecture":
      return "#8b5cf6";
    case "wall_decorator":
      return "#06b6d4";
    default:
      return "#64748b";
  }
}

/** Is the item on a vertical wall? (needs 90° rotation in SVG) */
function isVerticalWall(wallId: string | null): boolean {
  const wIdx = roomStore.walls.findIndex((w) => w.id === wallId);
  return wIdx === 1 || wIdx === 3;
}

// ───── Draw Walls mode ─────────────────────────────────────────────────────
type FloorPlanMode = 'quick' | 'draw'
const floorPlanMode = ref<FloorPlanMode>('quick')
const hasStartedDrawSession = ref(false)

// Draw state
const isDrawing = ref(false)
const isClosed = ref(false)
const mousePos = reactive({ x: 0, y: 0 })
const selectedWallId = ref<string | null>(null)
const selectedWallAnchor = ref<[number, number] | null>(null)
const selectedWallAnchorType = ref<'start' | 'end'>('start')
const pendingStartVertex = ref<[number, number] | null>(null)
const CLOSE_THRESHOLD = 15 // SVG units — snap distance to first vertex
const GRID_SIZE = 10 // SVG grid snap size
const drawWallThicknessInput = ref(6)

function clampDrawHeight(v: number): number {
  return Math.max(
    ROOM_CONSTRAINTS.height.min,
    Math.min(ROOM_CONSTRAINTS.height.max, Math.round(v)),
  )
}

function clampDrawThickness(v: number): number {
  return Math.max(1, Math.min(30, Math.round(v)))
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function onDrawHeightInput(e: Event) {
  const value = Number((e.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  roomStore.setHeight(clampDrawHeight(value))
}

function onDrawThicknessInput(e: Event) {
  const value = Number((e.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  const thickness = clampDrawThickness(value)
  drawWallThicknessInput.value = thickness

  // Keep already drawn walls consistent with the selected thickness.
  for (const wall of drawWalls.value) {
    roomStore.updateWallProps(wall.id, { thickness })
  }
}

/** Snap value to nearest grid */
function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE
}

function snapPointToOrthogonal(
  start: [number, number],
  target: [number, number],
): [number, number] {
  const dx = target[0] - start[0]
  const dy = target[1] - start[1]

  if (Math.abs(dx) >= Math.abs(dy)) {
    return [target[0], start[1]]
  }

  return [start[0], target[1]]
}

function leftEndpointAnchor(wall: {
  position: [number, number]
  angle: number
  length: number
}): 'start' | 'end' {
  const start: [number, number] = [wall.position[0], wall.position[1]]
  const end = wallEndPoint(wall)
  if (start[0] < end[0]) return 'start'
  if (start[0] > end[0]) return 'end'
  return start[1] <= end[1] ? 'start' : 'end'
}

/** Get the end-point of a wall (start + direction * length) */
function wallEndPoint(wall: { position: [number, number]; angle: number; length: number }): [number, number] {
  return [
    wall.position[0] + Math.cos(wall.angle) * wall.length,
    wall.position[1] + Math.sin(wall.angle) * wall.length,
  ]
}

/** Compute all vertices from the wall chain */
const drawWalls = computed(() => (hasStartedDrawSession.value ? roomStore.walls : []))

/** Compute all vertices from the wall chain */
const wallVertices = computed(() => {
  if (drawWalls.value.length === 0) {
    return pendingStartVertex.value ? [pendingStartVertex.value] : []
  }

  const verts: [number, number][] = []
  for (const wall of drawWalls.value) {
    verts.push([wall.position[0], wall.position[1]])
  }
  // Add the end of the last wall
  if (drawWalls.value.length > 0) {
    const last = drawWalls.value[drawWalls.value.length - 1]!
    verts.push(wallEndPoint(last))
  }
  return verts
})

const chainEndVertex = computed<[number, number] | null>(() => {
  if (drawWalls.value.length === 0) return null
  const last = drawWalls.value[drawWalls.value.length - 1]!
  return wallEndPoint(last)
})

const previewWall = computed<{
  position: [number, number]
  angle: number
  length: number
} | null>(() => {
  if (!isDrawing.value || !lastVertex.value) return null
  const [sx, sy] = lastVertex.value
  const ex = mousePos.x
  const ey = mousePos.y
  const dx = ex - sx
  const dy = ey - sy
  const length = Math.hypot(dx, dy)
  if (length < 1) return null
  return {
    position: [sx, sy],
    angle: Math.atan2(dy, dx),
    length,
  }
})

/** The current last vertex (end of last wall, or nothing) */
const lastVertex = computed(() => {
  if (pendingStartVertex.value) return pendingStartVertex.value
  if (drawWalls.value.length === 0) return null
  const last = drawWalls.value[drawWalls.value.length - 1]!
  return wallEndPoint(last)
})

/** First vertex */
const firstVertex = computed(() => {
  if (drawWalls.value.length === 0) return pendingStartVertex.value
  return drawWalls.value[0]!.position
})

/** Is the mouse near enough to the first vertex to close? */
const isNearFirstVertex = computed(() => {
  if (!lastVertex.value || !firstVertex.value || drawWalls.value.length < 2) return false
  const dx = mousePos.x - firstVertex.value[0]
  const dy = mousePos.y - firstVertex.value[1]
  return Math.sqrt(dx * dx + dy * dy) < CLOSE_THRESHOLD
})

/** Points that should be visible while drawing (walls + live cursor). */
const hasPlacedDrawPoint = computed(
  () => !!pendingStartVertex.value || drawWalls.value.length > 0,
)

const drawBoundsPoints = computed<[number, number][]>(() => {
  const points = [...wallVertices.value]
  // Keep the canvas stable until the first anchor is placed.
  if (isDrawing.value && hasPlacedDrawPoint.value) {
    points.push([mousePos.x, mousePos.y])
  }
  return points
})

/** SVG viewBox for draw mode — auto-fit to content */
const drawViewBox = computed(() => {
  const verts = drawBoundsPoints.value
  if (verts.length === 0) {
    // Empty canvas — large workspace
    return '-240 -240 480 480'
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of verts) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const pad = 80
  const w = Math.max(maxX - minX + pad * 2, 220)
  const h = Math.max(maxY - minY + pad * 2, 220)
  return `${minX - pad} ${minY - pad} ${w} ${h}`
})

/** Start drawing mode */
function enterDrawMode() {
  floorPlanMode.value = 'draw'
  hasStartedDrawSession.value = false
  isClosed.value = false
  isDrawing.value = false
  selectedWallId.value = null
  selectedWallAnchor.value = null
  selectedWallAnchorType.value = 'start'
  pendingStartVertex.value = null
}

/** Switch back to quick room mode */
function enterQuickMode() {
  floorPlanMode.value = 'quick'
  hasStartedDrawSession.value = false
  // Reset to default rectangular room
  const defaultRoom = createDefaultRoom()
  roomStore.setRoom(defaultRoom)
  roomStore.closetOffsetX = 0
  roomStore.closetOffsetY = 0
  roomStore.closetOffsetZ = 0
  selectedWallId.value = null
  selectedWallAnchor.value = null
  selectedWallAnchorType.value = 'start'
  pendingStartVertex.value = null
}

/** Start fresh drawing */
function startFreshDraw() {
  hasStartedDrawSession.value = true
  roomStore.startDrawWalls()
  isDrawing.value = true
  isClosed.value = false
  selectedWallId.value = null
  selectedWallAnchor.value = null
  selectedWallAnchorType.value = 'start'
  pendingStartVertex.value = null
}

function continueDrawing() {
  if (drawWalls.value.length === 0 && !pendingStartVertex.value) {
    startFreshDraw()
    return
  }

  if (selectedWall.value && selectedWallAnchor.value) {
    pendingStartVertex.value = [
      snapToGrid(selectedWallAnchor.value[0]),
      snapToGrid(selectedWallAnchor.value[1]),
    ]
    mousePos.x = pendingStartVertex.value[0]
    mousePos.y = pendingStartVertex.value[1]
  } else if (selectedWall.value) {
    const end = wallEndPoint(selectedWall.value)
    pendingStartVertex.value = [snapToGrid(end[0]), snapToGrid(end[1])]
    mousePos.x = pendingStartVertex.value[0]
    mousePos.y = pendingStartVertex.value[1]
  } else if (chainEndVertex.value) {
    pendingStartVertex.value = [
      snapToGrid(chainEndVertex.value[0]),
      snapToGrid(chainEndVertex.value[1]),
    ]
    mousePos.x = pendingStartVertex.value[0]
    mousePos.y = pendingStartVertex.value[1]
  } else {
    pendingStartVertex.value = null
  }

  hasStartedDrawSession.value = true
  isDrawing.value = true
  isClosed.value = false
  selectedWallId.value = null
  selectedWallAnchor.value = null
  selectedWallAnchorType.value = 'start'
}

function undoDrawStep() {
  if (roomStore.walls.length > 0) {
    roomStore.removeLastWall()
    if (roomStore.walls.length === 0 && !pendingStartVertex.value) {
      isDrawing.value = false
    }
    return
  }
  if (pendingStartVertex.value) {
    pendingStartVertex.value = null
    isDrawing.value = false
  }
}

/** Handle canvas click in draw mode */
function onDrawCanvasClick(e: MouseEvent) {
  if (isClosed.value || !svgRef.value) return

  // Drawing must be explicitly started from controls (Start Drawing / Add Wall).
  if (!isDrawing.value) {
    return
  }

  const pt = screenToSvg(svgRef.value, e.clientX, e.clientY)
  let sx = snapToGrid(pt.x)
  let sy = snapToGrid(pt.y)

  if (!pendingStartVertex.value && drawWalls.value.length === 0) {
    pendingStartVertex.value = [sx, sy]
    mousePos.x = sx
    mousePos.y = sy
    return
  }

  if (lastVertex.value) {
    const snapped = snapPointToOrthogonal(lastVertex.value, [sx, sy])
    sx = snapToGrid(snapped[0])
    sy = snapToGrid(snapped[1])
  }

  // The first click after choosing a start vertex must always draw from that start.
  if (pendingStartVertex.value) {
    roomStore.addWallVertex(
      sx,
      sy,
      drawWallThicknessInput.value,
      pendingStartVertex.value,
    )
    pendingStartVertex.value = null
    return
  }

  // Check if we should close the polygon
  if (isNearFirstVertex.value && firstVertex.value) {
    roomStore.closeRoom(drawWallThicknessInput.value)
    isDrawing.value = false
    isClosed.value = true
    pendingStartVertex.value = null
    return
  }

  roomStore.addWallVertex(sx, sy, drawWallThicknessInput.value)
}

/** Handle mouse move in draw mode */
function onDrawMouseMove(e: MouseEvent) {
  if (!svgRef.value) return
  const pt = screenToSvg(svgRef.value, e.clientX, e.clientY)
  let sx = snapToGrid(pt.x)
  let sy = snapToGrid(pt.y)

  if (lastVertex.value && isDrawing.value) {
    const snapped = snapPointToOrthogonal(lastVertex.value, [sx, sy])
    sx = snapToGrid(snapped[0])
    sy = snapToGrid(snapped[1])
  }

  mousePos.x = sx
  mousePos.y = sy
}

/** Handle Escape key — undo last wall segment */
function onDrawKeyDown(e: KeyboardEvent) {
  if (floorPlanMode.value !== 'draw') return
  if (e.key === 'Escape') {
    if (isDrawing.value) {
      isDrawing.value = false
      pendingStartVertex.value = null
      selectedWallId.value = null
      selectedWallAnchor.value = null
      selectedWallAnchorType.value = 'start'
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', onDrawKeyDown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onDrawKeyDown)
})

/** Select a wall in draw mode */
function selectWall(wallId: string, e: MouseEvent) {
  e.stopPropagation()
  selectedWallId.value = wallId

  const wall = drawWalls.value.find((w) => w.id === wallId)
  if (!wall || !svgRef.value) {
    selectedWallAnchor.value = null
    return
  }

  const pt = screenToSvg(svgRef.value, e.clientX, e.clientY)
  const start: [number, number] = [wall.position[0], wall.position[1]]
  const end = wallEndPoint(wall)
  const dStart = Math.hypot(pt.x - start[0], pt.y - start[1])
  const dEnd = Math.hypot(pt.x - end[0], pt.y - end[1])
  if (dStart <= dEnd) {
    selectedWallAnchor.value = start
    selectedWallAnchorType.value = 'start'
  } else {
    selectedWallAnchor.value = end
    selectedWallAnchorType.value = 'end'
  }
}

/** Deselect wall */
function deselectWall() {
  selectedWallId.value = null
  selectedWallAnchor.value = null
  selectedWallAnchorType.value = 'start'
}

function removeSelectedWall() {
  if (!selectedWall.value) return

  const selectedId = selectedWall.value.id
  const beforeLen = drawWalls.value.length
  roomStore.removeWall(selectedId)

  // Fallback: ensure removal even if action couldn't resolve by id.
  if (drawWalls.value.length === beforeLen) {
    const nextWalls = drawWalls.value.filter((w) => w.id !== selectedId)
    if (nextWalls.length !== beforeLen) {
      roomStore.setRoomFromWalls(nextWalls)
      nextWalls.forEach((wall, i) => {
        roomStore.updateWallProps(wall.id, { label: String(i + 1) })
      })
    }
  }

  selectedWallId.value = null
  selectedWallAnchor.value = null
  selectedWallAnchorType.value = 'start'
  isClosed.value = false

  if (drawWalls.value.length === 0) {
    isDrawing.value = false
    pendingStartVertex.value = null
  }
}

/** Selected wall object */
const selectedWall = computed(() => {
  if (!selectedWallId.value) return null
  return drawWalls.value.find(w => w.id === selectedWallId.value) ?? null
})

/** Computed angle in degrees for display */
const selectedWallAngleDeg = computed(() => {
  if (!selectedWall.value) return 0
  return Math.round(radToDeg(selectedWall.value.angle))
})

function setSelectedWallAngleDeg(angleDeg: number) {
  if (!selectedWall.value || !Number.isFinite(angleDeg)) return
  const anchor = leftEndpointAnchor(selectedWall.value)
  roomStore.setWallAngle(
    selectedWall.value.id,
    degToRad(angleDeg),
    anchor,
  )
}

function onSelectedWallAngleInput(e: Event) {
  const next = Number((e.target as HTMLInputElement).value)
  if (!Number.isFinite(next)) return
  setSelectedWallAngleDeg(next)
}

function rotateSelectedWall(deltaDeg: number) {
  if (!selectedWall.value) return
  setSelectedWallAngleDeg(radToDeg(selectedWall.value.angle) + deltaDeg)
}

/** Wall midpoint for label placement */
function wallMidpoint(wall: { position: [number, number]; angle: number; length: number }): [number, number] {
  return [
    wall.position[0] + Math.cos(wall.angle) * wall.length / 2,
    wall.position[1] + Math.sin(wall.angle) * wall.length / 2,
  ]
}

/** Compute the filled polygon outline for a thick wall segment */
function wallPolygonPoints(wall: { position: [number, number]; angle: number; length: number; thickness: number }): string {
  const t = wall.thickness / 2
  const perpAngle = wall.angle + Math.PI / 2
  const cos = Math.cos(perpAngle) * t
  const sin = Math.sin(perpAngle) * t
  const end = wallEndPoint(wall)
  // Four corners: start±perp, end±perp
  const p1 = [wall.position[0] + cos, wall.position[1] + sin]
  const p2 = [wall.position[0] - cos, wall.position[1] - sin]
  const p3 = [end[0] - cos, end[1] - sin]
  const p4 = [end[0] + cos, end[1] + sin]
  return `${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]} ${p4[0]},${p4[1]}`
}

/** Format length for display */
function formatLength(cm: number): string {
  const totalIn = cm / 2.54
  const ft = Math.floor(totalIn / 12)
  const inches = Math.round(totalIn % 12)
  return `${ft}' ${inches}\"`
}

/** Dimension line offset perpendicular to the wall */
function dimLinePoints(wall: { position: [number, number]; angle: number; length: number }): {
  x1: number; y1: number; x2: number; y2: number; tx: number; ty: number
} {
  const offset = 20
  const perpAngle = wall.angle - Math.PI / 2
  const cos = Math.cos(perpAngle) * offset
  const sin = Math.sin(perpAngle) * offset
  const end = wallEndPoint(wall)
  return {
    x1: wall.position[0] + cos,
    y1: wall.position[1] + sin,
    x2: end[0] + cos,
    y2: end[1] + sin,
    tx: (wall.position[0] + end[0]) / 2 + cos * 1.6,
    ty: (wall.position[1] + end[1]) / 2 + sin * 1.6,
  }
}
</script>

<template>
  <div class="floorplan-page">
    <TopToolbar
      @undo="historyStore.undo()"
      @redo="historyStore.redo()"
      @save="historyStore.saveToLocalStorage()"
      @open="historyStore.loadFromLocalStorage()"
      @new="roomStore.setRoom(roomStore.$state)"
    >
      <template #title>Floor Plan</template>
    </TopToolbar>

    <div class="floorplan-body">
      <!-- Left Sidebar: Add Architecture -->
      <aside class="sidebar sidebar-left">
        <div class="sidebar-section">
          <!-- Mode Toggle -->
          <div class="mode-toggle">
            <button
              class="mode-btn"
              :class="{ active: floorPlanMode === 'quick' }"
              @click="enterQuickMode"
            >
              Quick Room
            </button>
            <button
              class="mode-btn"
              :class="{ active: floorPlanMode === 'draw' }"
              @click="enterDrawMode"
            >
              Draw Walls
            </button>
          </div>

          <!-- ========== DRAW WALLS SIDEBAR ========== -->
          <template v-if="floorPlanMode === 'draw'">
            <div class="draw-input-grid">
              <div class="prop-row">
                <label class="prop-label">Wall Height</label>
                <input
                  class="prop-input"
                  type="number"
                  :value="roomStore.height"
                  :min="ROOM_CONSTRAINTS.height.min"
                  :max="ROOM_CONSTRAINTS.height.max"
                  @input="onDrawHeightInput"
                />
              </div>

              <div class="prop-row">
                <label class="prop-label">Wall Thickness</label>
                <input
                  class="prop-input"
                  type="number"
                  :value="drawWallThicknessInput"
                  min="1"
                  max="30"
                  @input="onDrawThicknessInput"
                />
              </div>
            </div>

            <!-- Drawing controls -->
            <div v-if="!isClosed" class="draw-controls">
              <button class="sidebar-action-btn draw-btn" @click="startFreshDraw">
                🖊 Start Drawing
              </button>

              <button
                v-if="!isDrawing && drawWalls.length > 0"
                class="sidebar-action-btn draw-btn"
                @click="continueDrawing"
              >
                ✏ Add Wall
              </button>

              <button
                v-if="isDrawing && (roomStore.walls.length > 0 || pendingStartVertex)"
                class="sidebar-action-btn undo-btn"
                @click="undoDrawStep"
              >
                ↩ Undo Last Wall
              </button>
              <p class="draw-hint" v-if="isDrawing">
                Click on the canvas to place wall vertices.<br/>
                Click near the <strong>first point</strong> to close the room.<br/>
                Press <kbd>Esc</kbd> to finish drawing.
              </p>
              <p class="draw-hint" v-else-if="drawWalls.length > 0">
                Click <strong>Add Wall</strong> to continue from the last wall endpoint,
                or <strong>Start Drawing</strong> to clear and redraw.
              </p>
              <p class="draw-hint" v-else>
                Click "Start Drawing" to begin placing walls.
              </p>
            </div>

            <!-- Room complete view -->
            <div v-else class="draw-controls">
              <p class="draw-hint draw-complete">
                ✅ Room complete — {{ roomStore.walls.length }} walls
              </p>
              <button class="sidebar-action-btn draw-btn" @click="continueDrawing">
                ✏ Add Wall
              </button>
              <button class="sidebar-action-btn draw-btn" @click="startFreshDraw">
                🗑 Clear & Redraw
              </button>
            </div>

            <!-- Selected wall properties -->
            <div v-if="selectedWall" class="wall-props">
              <h4 class="sidebar-subheading">Wall {{ selectedWall.label }}</h4>

              <div class="prop-row">
                <label class="prop-label">Label</label>
                <input
                  class="prop-input"
                  :value="selectedWall.label"
                  @input="(e: Event) => roomStore.updateWallProps(selectedWall!.id, { label: (e.target as HTMLInputElement).value })"
                />
              </div>

              <div class="prop-row">
                <label class="prop-label">Length</label>
                <input
                  class="prop-input"
                  type="number"
                  :value="selectedWall.length"
                  @input="(e: Event) => roomStore.updateWallProps(selectedWall!.id, { length: Number((e.target as HTMLInputElement).value) })"
                />
              </div>

              <div class="prop-row">
                <label class="prop-label">Height</label>
                <input class="prop-input" type="number" :value="roomStore.height" @input="(e: Event) => roomStore.setHeight(Number((e.target as HTMLInputElement).value))" />
              </div>

              <div class="prop-row">
                <label class="prop-label">Thickness</label>
                <input
                  class="prop-input"
                  type="number"
                  :value="selectedWall.thickness"
                  @input="(e: Event) => roomStore.updateWallProps(selectedWall!.id, { thickness: Number((e.target as HTMLInputElement).value) })"
                />
              </div>

              <div class="prop-row">
                <label class="prop-label">Angle</label>
                <div class="angle-controls">
                  <button
                    type="button"
                    class="angle-btn"
                    @click="rotateSelectedWall(-1)"
                    title="Rotate wall -1°"
                  >
                    -1°
                  </button>
                  <input
                    class="prop-input angle-input"
                    type="number"
                    step="1"
                    :value="selectedWallAngleDeg"
                    @input="onSelectedWallAngleInput"
                  />
                  <button
                    type="button"
                    class="angle-btn"
                    @click="rotateSelectedWall(1)"
                    title="Rotate wall +1°"
                  >
                    +1°
                  </button>
                </div>
              </div>

              <div class="prop-row">
                <label class="prop-label">Visible</label>
                <input
                  type="checkbox"
                  :checked="selectedWall.visible"
                  @change="(e: Event) => roomStore.updateWallProps(selectedWall!.id, { visible: (e.target as HTMLInputElement).checked })"
                />
              </div>

              <button
                type="button"
                class="sidebar-action-btn draw-btn"
                @click="roomStore.setClosetWall(selectedWall.id)"
              >
                Use As Closet Wall
              </button>

              <button
                type="button"
                class="sidebar-action-btn delete-wall-btn"
                @click.stop.prevent="removeSelectedWall"
              >
                Remove Wall
              </button>
            </div>
          </template>

          <!-- ========== QUICK ROOM SIDEBAR (original) ========== -->
          <template v-else>
          <h3 class="sidebar-heading">Add Architecture</h3>

          <button class="sidebar-action-btn" @click="openHeightDialog">
            Change Room Height ({{ cmToImperial(roomStore.height) }})
          </button>

          <h4 class="sidebar-subheading">Add Door</h4>
          <div class="item-grid">
            <button
              class="item-card"
              v-for="def in DOOR_ITEMS"
              :key="def.type"
              @click="addArchItem(def)"
            >
              <div class="item-icon">{{ def.icon }}</div>
              <span class="item-label">{{ itemLabel(def.type) }}</span>
            </button>
          </div>

          <h4 class="sidebar-subheading">Add Architecture</h4>
          <div class="item-grid">
            <button
              class="item-card"
              v-for="def in ARCH_ITEMS"
              :key="def.type"
              @click="addArchItem(def)"
            >
              <div class="item-icon">{{ def.icon }}</div>
              <span class="item-label">{{ itemLabel(def.type) }}</span>
            </button>
          </div>

          <h4 class="sidebar-subheading">Add Wall Decorator</h4>
          <div class="item-grid">
            <button
              class="item-card"
              v-for="def in DECO_ITEMS"
              :key="def.type"
              @click="addArchItem(def)"
            >
              <div class="item-icon">{{ def.icon }}</div>
              <span class="item-label">{{ itemLabel(def.type) }}</span>
            </button>
          </div>
          </template>
        </div>
      </aside>

      <!-- Center: 2D Floor Plan Canvas -->
      <main class="floorplan-canvas-area">
        <div class="canvas-container">
          <!-- SVG Floor Plan -->
          <svg
            v-if="floorPlanMode === 'quick'"
            ref="svgRef"
            :viewBox="svgViewBox"
            class="floorplan-svg"
            xmlns="http://www.w3.org/2000/svg"
            @click="selectedItemId = null"
          >
            <!-- Room background -->
            <rect
              :x="-roomW / 2"
              :y="-roomD / 2"
              :width="roomW"
              :height="roomD"
              :fill="roomStore.colors.floorColor"
              :stroke="wallStroke"
              stroke-width="3"
              rx="2"
            />

            <!-- Walls as thick lines -->
            <template v-for="(wall, i) in roomStore.walls" :key="wall.id">
              <!-- Top wall -->
              <line
                v-if="i === 0"
                :x1="-(wall.length / 2)"
                :y1="-roomD / 2"
                :x2="wall.length / 2"
                :y2="-roomD / 2"
                :stroke="wallStroke"
                stroke-width="6"
              />
              <!-- Right wall -->
              <line
                v-if="i === 1"
                :x1="roomW / 2"
                :y1="-(wall.length / 2)"
                :x2="roomW / 2"
                :y2="wall.length / 2"
                :stroke="wallStroke"
                stroke-width="6"
              />
              <!-- Bottom wall -->
              <line
                v-if="i === 2"
                :x1="-(wall.length / 2)"
                :y1="roomD / 2"
                :x2="wall.length / 2"
                :y2="roomD / 2"
                :stroke="wallStroke"
                stroke-width="6"
              />
              <!-- Left wall -->
              <line
                v-if="i === 3"
                :x1="-roomW / 2"
                :y1="-(wall.length / 2)"
                :x2="-roomW / 2"
                :y2="wall.length / 2"
                :stroke="wallStroke"
                stroke-width="6"
              />
            </template>

            <!-- Dimension labels -->
            <!-- Top dimension -->
            <g>
              <line
                :x1="-roomW / 2"
                :y1="-roomD / 2 - 25"
                :x2="roomW / 2"
                :y2="-roomD / 2 - 25"
                stroke="#94a3b8"
                stroke-width="1"
                marker-start="url(#arrowL)"
                marker-end="url(#arrowR)"
              />
              <text
                x="0"
                :y="-roomD / 2 - 30"
                text-anchor="middle"
                fill="#e2e8f0"
                font-size="12"
                font-weight="600"
              >
                {{ Math.round(roomW / 2.54 / 12) }}'
                {{ Math.round((roomW / 2.54) % 12) }}"
              </text>
            </g>

            <!-- Right dimension -->
            <g>
              <line
                :x1="roomW / 2 + 25"
                :y1="-roomD / 2"
                :x2="roomW / 2 + 25"
                :y2="roomD / 2"
                stroke="#94a3b8"
                stroke-width="1"
                marker-start="url(#arrowU)"
                marker-end="url(#arrowD)"
              />
              <text
                :x="roomW / 2 + 35"
                y="4"
                text-anchor="start"
                fill="#e2e8f0"
                font-size="12"
                font-weight="600"
                transform="rotate(0)"
              >
                {{ Math.round(roomD / 2.54 / 12) }}'
                {{ Math.round((roomD / 2.54) % 12) }}"
              </text>
            </g>

            <!-- Resize handles (corners) -->
            <circle
              v-for="(pos, idx) in [
                [-roomW / 2, -roomD / 2],
                [roomW / 2, -roomD / 2],
                [roomW / 2, roomD / 2],
                [-roomW / 2, roomD / 2],
              ]"
              :key="idx"
              :cx="pos[0]"
              :cy="pos[1]"
              r="5"
              fill="#fbbf24"
              stroke="#0f172a"
              stroke-width="2"
              class="resize-handle"
              :style="{ cursor: cornerCursors[idx] }"
              @pointerdown="startCornerDrag(idx, $event)"
            />

            <!-- Mid-wall resize handles -->
            <circle
              v-for="(pos, idx) in [
                [0, -roomD / 2],
                [roomW / 2, 0],
                [0, roomD / 2],
                [-roomW / 2, 0],
              ]"
              :key="'mid-' + idx"
              :cx="pos[0]"
              :cy="pos[1]"
              r="4"
              fill="#60a5fa"
              stroke="#0f172a"
              stroke-width="2"
              class="resize-handle"
              :style="{ cursor: midCursors[idx] }"
              @pointerdown="startMidDrag(idx, $event)"
            />

            <!-- Arrow marker definitions -->
            <defs>
              <marker
                id="arrowR"
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
                id="arrowL"
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
              <marker
                id="arrowD"
                markerWidth="8"
                markerHeight="8"
                refX="4"
                refY="6"
                orient="auto"
              >
                <path
                  d="M0,0 L4,8 L8,0"
                  fill="none"
                  stroke="#94a3b8"
                  stroke-width="1"
                />
              </marker>
              <marker
                id="arrowU"
                markerWidth="8"
                markerHeight="8"
                refX="4"
                refY="2"
                orient="auto"
              >
                <path
                  d="M0,8 L4,0 L8,8"
                  fill="none"
                  stroke="#94a3b8"
                  stroke-width="1"
                />
              </marker>
            </defs>

            <!-- Placed architecture items -->
            <g
              v-for="item in roomStore.items"
              :key="item.id"
              :transform="`translate(${itemSvgPos(item).x}, ${itemSvgPos(item).y})${isVerticalWall(item.wallId) ? ' rotate(90)' : ''}`"
              class="placed-item"
              :class="{ selected: selectedItemId === item.id }"
              @pointerdown="startItemDrag(item.id, item.wallId ?? '', $event)"
              @click.stop="selectItem(item.id, $event)"
            >
              <!-- Item body -->
              <rect
                :x="-item.width / 2"
                :y="-4"
                :width="item.width"
                :height="8"
                :fill="itemColor(item.category)"
                :stroke="selectedItemId === item.id ? '#fbbf24' : 'none'"
                :stroke-width="selectedItemId === item.id ? 2 : 0"
                rx="2"
                :opacity="selectedItemId === item.id ? 1 : 0.8"
                style="cursor: grab"
              />
              <!-- Item label -->
              <text
                x="0"
                :y="selectedItemId === item.id ? -10 : 16"
                text-anchor="middle"
                :fill="itemColor(item.category)"
                font-size="8"
                font-weight="600"
              >
                {{ itemLabel(item.type) }}
              </text>
              <!-- Delete button (only when selected) -->
              <g
                v-if="selectedItemId === item.id"
                @click.stop="deleteSelectedItem"
                style="cursor: pointer"
              >
                <circle
                  :cx="item.width / 2 + 8"
                  cy="-4"
                  r="6"
                  fill="#ef4444"
                  stroke="#0f172a"
                  stroke-width="1"
                />
                <text
                  :x="item.width / 2 + 8"
                  y="-1"
                  text-anchor="middle"
                  fill="white"
                  font-size="8"
                  font-weight="bold"
                >
                  ×
                </text>
              </g>
            </g>
          </svg>

          <!-- ========== DRAW WALLS SVG CANVAS ========== -->
          <svg
            v-else
            ref="svgRef"
            :viewBox="drawViewBox"
            class="floorplan-svg draw-canvas"
            xmlns="http://www.w3.org/2000/svg"
            @click="onDrawCanvasClick"
            @mousemove="onDrawMouseMove"
            @click.self="deselectWall"
          >
            <!-- Grid pattern -->
            <defs>
              <pattern id="drawGrid" :width="GRID_SIZE" :height="GRID_SIZE" patternUnits="userSpaceOnUse">
                <circle :cx="GRID_SIZE/2" :cy="GRID_SIZE/2" r="0.5" fill="rgba(148,163,184,0.15)" />
              </pattern>
              <!-- Arrow markers for dimensions -->
              <marker id="dimArrowR" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8" fill="none" stroke="#94a3b8" stroke-width="1" />
              </marker>
              <marker id="dimArrowL" markerWidth="8" markerHeight="8" refX="2" refY="4" orient="auto">
                <path d="M8,0 L0,4 L8,8" fill="none" stroke="#94a3b8" stroke-width="1" />
              </marker>
            </defs>

            <!-- Background grid -->
            <rect x="-2000" y="-2000" width="4000" height="4000" fill="url(#drawGrid)" />

            <!-- Filled room polygon (floor) -->
            <polygon
              v-if="drawWalls.length >= 3"
              :points="wallVertices.map(v => v.join(',')).join(' ')"
              fill="#d4c9b8"
              fill-opacity="0.15"
              stroke="none"
            />

            <!-- Drawn wall segments -->
            <g v-for="wall in drawWalls" :key="wall.id">
              <!-- Thick wall polygon -->
              <polygon
                v-if="wall.visible"
                :points="wallPolygonPoints(wall)"
                :fill="selectedWallId === wall.id ? '#e8c88a' : '#d4c9b8'"
                :stroke="selectedWallId === wall.id ? '#f59e0b' : '#8b7355'"
                :stroke-width="selectedWallId === wall.id ? 2 : 1"
                class="wall-segment"
                @click.stop="selectWall(wall.id, $event)"
              />

              <!-- Wall center line (for visual clarity) -->
              <line
                v-if="wall.visible"
                :x1="wall.position[0]"
                :y1="wall.position[1]"
                :x2="wallEndPoint(wall)[0]"
                :y2="wallEndPoint(wall)[1]"
                stroke="#6b5c45"
                stroke-width="0.5"
                stroke-dasharray="3,3"
                pointer-events="none"
              />

              <!-- Wall label (number) -->
              <g :transform="`translate(${wallMidpoint(wall)[0]}, ${wallMidpoint(wall)[1]})`">
                <circle
                  r="10"
                  :fill="wall.hasCloset ? '#22c55e' : '#f59e0b'"
                  stroke="#0f172a"
                  stroke-width="1.5"
                />
                <text
                  text-anchor="middle"
                  dominant-baseline="central"
                  fill="#0f172a"
                  font-size="9"
                  font-weight="700"
                >{{ wall.label }}</text>
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
              >{{ formatLength(wall.length) }}</text>
            </g>

            <!-- Vertices (dots at each corner) -->
            <circle
              v-for="(v, i) in wallVertices"
              :key="'v-' + i"
              :cx="v[0]"
              :cy="v[1]"
              :r="i === 0 && isNearFirstVertex ? 8 : 4"
              :fill="i === 0 ? '#22c55e' : '#fbbf24'"
              stroke="#0f172a"
              stroke-width="1.5"
              :class="{ 'close-snap': i === 0 && isNearFirstVertex }"
            />

            <!-- Preview line from last vertex to cursor -->
            <line
              v-if="isDrawing && lastVertex"
              :x1="lastVertex[0]"
              :y1="lastVertex[1]"
              :x2="mousePos.x"
              :y2="mousePos.y"
              stroke="#60a5fa"
              stroke-width="2"
              stroke-dasharray="6,4"
              pointer-events="none"
            />

            <!-- Live dimension while drawing current wall -->
            <line
              v-if="previewWall"
              :x1="dimLinePoints(previewWall).x1"
              :y1="dimLinePoints(previewWall).y1"
              :x2="dimLinePoints(previewWall).x2"
              :y2="dimLinePoints(previewWall).y2"
              stroke="#60a5fa"
              stroke-width="0.9"
              marker-start="url(#dimArrowL)"
              marker-end="url(#dimArrowR)"
              pointer-events="none"
            />
            <text
              v-if="previewWall"
              :x="dimLinePoints(previewWall).tx"
              :y="dimLinePoints(previewWall).ty"
              text-anchor="middle"
              fill="#93c5fd"
              font-size="9"
              font-weight="700"
              pointer-events="none"
            >{{ formatLength(previewWall.length) }}</text>

            <!-- Preview snap circle at cursor when near first vertex -->
            <circle
              v-if="isDrawing && isNearFirstVertex && firstVertex"
              :cx="firstVertex[0]"
              :cy="firstVertex[1]"
              r="12"
              fill="none"
              stroke="#22c55e"
              stroke-width="2"
              stroke-dasharray="4,3"
              class="close-indicator"
            />
          </svg>
        </div>

        <!-- Hint overlay -->
        <div class="canvas-hint" v-if="floorPlanMode === 'quick'">
          Drag corners or mid-points to resize the room
        </div>
        <div class="canvas-hint" v-else-if="isDrawing">
          Click to place vertices · Click near first point to close · Esc to finish
        </div>
        <div class="canvas-hint" v-else-if="isClosed">
          Click a wall to select and edit · Click empty area to deselect
        </div>
      </main>

      <!-- Right Sidebar: Room Options -->
      <aside class="sidebar sidebar-right">
        <div class="sidebar-section">
          <h3 class="sidebar-heading">Room Options</h3>

          <div class="option-group">
            <label class="option-label">Floor Finish</label>
            <div class="swatch-row">
              <button
                v-for="mat in FLOOR_MATERIALS"
                :key="mat.id"
                class="swatch-btn"
                :class="{ active: roomStore.colors.floorFinishId === mat.id }"
                :style="{ background: mat.colorHex }"
                :title="mat.label"
                @click="
                  roomStore.setColors({
                    floorFinishId: mat.id,
                    floorColor: mat.colorHex,
                  })
                "
              />
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Wall Color</label>
            <div class="swatch-row">
              <button
                v-for="swatch in WALL_COLORS"
                :key="swatch.id"
                class="swatch-btn"
                :class="{
                  active: roomStore.colors.wallColor === swatch.colorHex,
                }"
                :style="{ background: swatch.colorHex }"
                :title="swatch.label"
                @click="roomStore.setColors({ wallColor: swatch.colorHex })"
              />
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Trim Color</label>
            <div class="swatch-row">
              <button
                v-for="swatch in TRIM_COLORS"
                :key="swatch.id"
                class="swatch-btn"
                :class="{
                  active: roomStore.colors.trimColor === swatch.colorHex,
                }"
                :style="{ background: swatch.colorHex }"
                :title="swatch.label"
                @click="roomStore.setColors({ trimColor: swatch.colorHex })"
              />
            </div>
          </div>

          <h4 class="sidebar-subheading">Architectural Door Options</h4>

          <div class="option-group">
            <label class="option-label">Door Handle</label>
            <div class="swatch-row">
              <button
                v-for="handle in HANDLE_STYLES"
                :key="handle.id"
                class="swatch-btn swatch-labeled"
                :class="{
                  active: closet.doorOptions.handleFinish === handle.id,
                }"
                :style="{
                  background:
                    handle.colorHex === 'transparent'
                      ? '#1e293b'
                      : handle.colorHex,
                }"
                :title="handle.label"
                @click="closet.setDoorOptions({ handleFinish: handle.id })"
              >
                <span
                  v-if="handle.id === 'handle-none'"
                  class="swatch-none-label"
                  >✕</span
                >
              </button>
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Door Finish</label>
            <div class="swatch-row">
              <button
                v-for="mat in DOOR_MATERIALS"
                :key="mat.id"
                class="swatch-btn"
                :class="{ active: closet.doorOptions.doorFinishId === mat.id }"
                :style="{ background: mat.colorHex }"
                :title="mat.label"
                @click="
                  closet.setDoorOptions({
                    doorFinishId: mat.id,
                    doorColor: mat.colorHex,
                  })
                "
              />
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Change Room Height Dialog -->
    <Teleport to="body">
      <div
        v-if="showHeightDialog"
        class="dialog-overlay"
        @click.self="showHeightDialog = false"
      >
        <div class="dialog-box">
          <h3 class="dialog-title">Change Room Height</h3>
          <p class="dialog-desc">
            Set the ceiling height for your room ({{
              ROOM_CONSTRAINTS.height.min
            }}–{{ ROOM_CONSTRAINTS.height.max }} cm).
          </p>

          <div class="dialog-input-row">
            <input
              v-model.number="heightInput"
              type="number"
              :min="ROOM_CONSTRAINTS.height.min"
              :max="ROOM_CONSTRAINTS.height.max"
              class="dialog-input"
              @keydown.enter="applyHeight"
            />
            <span class="dialog-unit">cm</span>
            <span class="dialog-imperial"
              >({{ cmToImperial(heightInput) }})</span
            >
          </div>

          <div class="dialog-actions">
            <button class="dialog-btn cancel" @click="showHeightDialog = false">
              Cancel
            </button>
            <button class="dialog-btn apply" @click="applyHeight">Apply</button>
          </div>
        </div>
      </div>
    </Teleport>

    <FooterBar
      back-label="Back to Select Closet Type"
      back-route="/closet/type"
      forward-label="Design Closet"
      forward-route="/closet/design"
      :show-view-toggle="true"
    />
  </div>
</template>

<style scoped>
.floorplan-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0b1220;
  color: #e2e8f0;
}

.floorplan-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebars */
.sidebar {
  width: 200px;
  flex-shrink: 0;
  overflow-y: auto;
  border-color: rgba(255, 255, 255, 0.06);
  background: rgba(15, 23, 42, 0.6);
  padding: 16px 12px;
}

.sidebar-left {
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-right {
  border-left: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-heading {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin: 0;
}

.sidebar-subheading {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin: 8px 0 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sidebar-action-btn {
  padding: 8px 12px;
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.08);
  color: #fbbf24;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.sidebar-action-btn:hover {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.35);
}

/* Item grid */
.item-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.item-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.4);
  cursor: pointer;
  transition: all 0.15s;
  color: inherit;
  font-family: inherit;
}

.item-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(30, 41, 59, 0.7);
  transform: translateY(-1px);
}

.item-icon {
  font-size: 20px;
}

.item-label {
  font-size: 9px;
  color: #94a3b8;
  text-align: center;
  line-height: 1.2;
}

/* Canvas area */
.floorplan-canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  background:
    radial-gradient(
      ellipse at center,
      rgba(15, 23, 42, 0) 0%,
      rgba(2, 6, 23, 0.5) 100%
    ),
    linear-gradient(180deg, #0f172a 0%, #0b1220 100%);
}

.canvas-container {
  width: 80%;
  max-width: 600px;
  aspect-ratio: 1;
}

.floorplan-svg {
  width: 100%;
  height: 100%;
}

.resize-handle {
  cursor: pointer;
  transition: all 0.15s;
}

.resize-handle:hover {
  r: 7;
  fill: #f59e0b;
}

.canvas-hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 99px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  color: #64748b;
  pointer-events: none;
}

/* Swatch UI */
.option-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.option-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.swatch-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.swatch-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.15s;
}

.swatch-btn:hover {
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.08);
}

.swatch-btn.active {
  border-color: #fbbf24;
  box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3);
}

.swatch-labeled {
  width: 28px;
  height: 28px;
}

.swatch-none-label {
  font-size: 14px;
  color: #64748b;
}

/* ─── Draw Walls Mode ───────────────────────────────────────────────── */
.mode-toggle {
  display: flex;
  gap: 4px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 3px;
}

.mode-btn {
  flex: 1;
  padding: 8px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-btn:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.04);
}

.mode-btn.active {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.25);
}

.draw-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.draw-input-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0;
}

.draw-btn {
  background: rgba(96, 165, 250, 0.1) !important;
  border-color: rgba(96, 165, 250, 0.2) !important;
  color: #60a5fa !important;
}

.draw-btn:hover {
  background: rgba(96, 165, 250, 0.2) !important;
  border-color: rgba(96, 165, 250, 0.35) !important;
}

.undo-btn {
  background: rgba(239, 68, 68, 0.08) !important;
  border-color: rgba(239, 68, 68, 0.2) !important;
  color: #f87171 !important;
}

.undo-btn:hover {
  background: rgba(239, 68, 68, 0.15) !important;
  border-color: rgba(239, 68, 68, 0.3) !important;
}

.delete-wall-btn {
  margin-top: 8px;
  background: rgba(239, 68, 68, 0.08) !important;
  border-color: rgba(239, 68, 68, 0.2) !important;
  color: #f87171 !important;
}

.delete-wall-btn:hover {
  background: rgba(239, 68, 68, 0.15) !important;
  border-color: rgba(239, 68, 68, 0.3) !important;
}

.draw-hint {
  font-size: 11px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
  padding: 8px 0;
}

.draw-hint strong {
  color: #22c55e;
}

.draw-hint kbd {
  display: inline-block;
  padding: 1px 5px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 10px;
  font-family: monospace;
  color: #e2e8f0;
}

.draw-complete {
  color: #22c55e;
  font-weight: 600;
}

/* Wall properties panel */
.wall-props {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 8px;
}

.prop-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.prop-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 60px;
}

.prop-input {
  width: 80px;
  padding: 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.8);
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  outline: none;
  transition: border-color 0.15s;
}

.prop-input:focus {
  border-color: #fbbf24;
}

.prop-value {
  font-size: 12px;
  color: #e2e8f0;
  font-weight: 500;
}

.angle-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.angle-input {
  width: 62px;
}

.angle-btn {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  padding: 4px 6px;
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.15s;
}

.angle-btn:hover {
  border-color: rgba(96, 165, 250, 0.4);
  color: #93c5fd;
}

/* SVG draw canvas */
.draw-canvas {
  cursor: crosshair;
}

.wall-segment {
  cursor: pointer;
  transition: fill 0.1s, stroke 0.1s;
}

.wall-segment:hover {
  fill: #e8c88a;
  stroke: #f59e0b;
}

.close-snap {
  filter: drop-shadow(0 0 4px rgba(34, 197, 94, 0.6));
}

.close-indicator {
  animation: pulse-ring 1s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>

<!-- Unscoped for Teleport -->
<style>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.dialog-box {
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 28px 32px;
  min-width: 340px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.dialog-title {
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 8px;
}

.dialog-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 20px;
  line-height: 1.5;
}

.dialog-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}

.dialog-input {
  width: 100px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.8);
  color: #e2e8f0;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  outline: none;
  transition: border-color 0.15s;
}

.dialog-input:focus {
  border-color: #fbbf24;
}

.dialog-unit {
  font-size: 14px;
  color: #94a3b8;
  font-weight: 500;
}

.dialog-imperial {
  font-size: 13px;
  color: #64748b;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.dialog-btn.cancel {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}

.dialog-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.dialog-btn.apply {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.dialog-btn.apply:hover {
  background: rgba(251, 191, 36, 0.25);
}
</style>
