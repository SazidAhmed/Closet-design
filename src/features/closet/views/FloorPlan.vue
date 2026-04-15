<script setup lang="ts">
import TopToolbar from "../../../components/TopToolbar.vue";
import FooterBar from "../../../components/FooterBar.vue";
import { useRoomStore } from "../../../stores/useRoomStore";
import { useAppStore } from "../../../stores/useAppStore";
import { onMounted, onUnmounted, computed, ref, reactive, watch } from "vue";
import { ROOM_CONSTRAINTS } from "../domain/constraints";
import {
  DEFAULT_QUICK_ROOM_PRESET_ID,
  QUICK_ROOM_PRESETS,
  createQuickRoomFromPreset,
} from "../domain/quickRoomPresets";
import {
  wallInsideGuideAreaPoints,
} from "../domain/geometry/insideWallSide";
import { useHistoryStore } from "../../../stores/useHistoryStore";

const roomStore = useRoomStore();
const appStore = useAppStore();
const historyStore = useHistoryStore();

const quickPresetId = ref<string | null>(DEFAULT_QUICK_ROOM_PRESET_ID);
const showPresetReplaceDialog = ref(false);
const pendingPresetId = ref<string | null>(null);

function canReplaceLayoutWithoutConfirmation(): boolean {
  return roomStore.walls.length === 0 && roomStore.items.length === 0;
}

function requestQuickPreset(presetId: string) {
  if (presetId === quickPresetId.value) return;
  if (canReplaceLayoutWithoutConfirmation()) {
    applyQuickPreset(presetId);
    return;
  }

  pendingPresetId.value = presetId;
  showPresetReplaceDialog.value = true;
}

function cancelQuickPresetReplacement() {
  pendingPresetId.value = null;
  showPresetReplaceDialog.value = false;
}

function confirmQuickPresetReplacement() {
  if (!pendingPresetId.value) {
    cancelQuickPresetReplacement();
    return;
  }
  applyQuickPreset(pendingPresetId.value);
  cancelQuickPresetReplacement();
}

function applyQuickPreset(presetId: string) {
  const nextRoom = createQuickRoomFromPreset(presetId, roomStore.height);
  const currentColors = { ...roomStore.colors };

  roomStore.setRoom({
    ...nextRoom,
    colors: currentColors,
    height: roomStore.height,
  });

  roomStore.closetOffsetX = 0;
  roomStore.closetOffsetY = 0;
  roomStore.closetOffsetZ = 0;
  selectedItemId.value = null;
  hasStartedDrawSession.value = true;
  isDrawing.value = false;
  isClosed.value = roomStore.roomIsClosed;
  pendingStartVertex.value = null;
  deselectWall();
  unlockDrawViewBox();

  quickPresetId.value = presetId;
}

const quickBounds = computed(() => roomStore.planBounds);

const svgRef = ref<SVGSVGElement | null>(null);

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

onMounted(() => {
  appStore.setStep("floorplan");
});

// ───── Change Room Height dialog ───────────────────────────────────────────
const CM_PER_INCH = 2.54;

function cmToInches(cm: number): number {
  return Math.round(cm / CM_PER_INCH);
}

function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

function formatInches(cm: number): string {
  return `${cmToInches(cm)}"`;
}

// ───── Architecture item catalog ───────────────────────────────────────────
import type {
  PlacedItemType,
  PlacedItemCategory,
  PlacedItem,
} from "../domain/types/room";

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
    width: inchesToCm(27),
    height: inchesToCm(72),
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

const DECO_ITEMS: ItemDef[] = [
  {
    type: "window",
    category: "wall_decorator",
    width: inchesToCm(36),
    height: inchesToCm(42),
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
  if (type === "wall_opening") return "Door";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Place an architecture item on wall 0 (bottom) at center */
function addArchItem(def: ItemDef) {
  const wallId =
    roomStore.walls.find((wall) => wall.id === selectedWallId.value)?.id ??
    roomStore.walls[0]?.id ??
    null;
  // Default elevation: 0 for doors, 42 for windows
  const defaultElevation = def.type === "window" ? 42 : 0;
  const createdItemId = roomStore.addItem({
    type: def.type,
    category: def.category,
    wallId,
    positionAlongWall: 0.5,
    width: def.width,
    height: def.height,
    leftPosition: 0,
    rightPosition: 0,
    elevation: defaultElevation,
  });
  selectedItemId.value = createdItemId;
}

// ───── Selected item & item drag ───────────────────────────────────────────
const selectedItemId = ref<string | null>(null);

const itemDrag = reactive<{
  active: boolean;
  itemId: string;
  wallId: string;
}>({
  active: false,
  itemId: "",
  wallId: "",
});

function selectItem(itemId: string, e: PointerEvent) {
  e.stopPropagation();
  selectedItemId.value = itemId;
}

function startItemDrag(itemId: string, wallId: string, e: PointerEvent) {
  e.stopPropagation();
  e.preventDefault();
  selectedItemId.value = itemId;
  const wall = roomStore.walls.find((entry) => entry.id === wallId);
  if (!wall) return;
  (e.target as Element)?.setPointerCapture?.(e.pointerId);
  itemDrag.active = true;
  itemDrag.itemId = itemId;
  itemDrag.wallId = wallId;
}

function onItemPointerMove(e: PointerEvent) {
  if (!itemDrag.active || !svgRef.value) return;
  const wall = roomStore.walls.find((entry) => entry.id === itemDrag.wallId);
  if (!wall) return;

  const pt = screenToSvg(svgRef.value, e.clientX, e.clientY);
  const start = wall.position;
  const end = wallEndPoint(wall);
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1) return;

  let pos =
    ((pt.x - start[0]) * dx + (pt.y - start[1]) * dy) /
    lengthSq;

  // Store-level clamping keeps opening width inside wall endpoints.
  pos = Math.max(0, Math.min(1, pos));
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

const selectedDoorWindowItem = computed<PlacedItem | null>(() => {
  if (!selectedItemId.value) return null;
  const item = roomStore.items.find((entry) => entry.id === selectedItemId.value);
  if (!item) return null;
  if (item.category === "door" || item.type === "window") return item;
  return null;
});

function onSelectedItemSizeInput(
  dimension: "width" | "height",
  e: Event,
) {
  if (!selectedDoorWindowItem.value) return;
  const valueIn = Number((e.target as HTMLInputElement).value);
  if (!Number.isFinite(valueIn)) return;
  const nextCm = inchesToCm(Math.max(1, valueIn));

  if (dimension === "width") {
    roomStore.updateItemProps(selectedDoorWindowItem.value.id, {
      width: nextCm,
    });
    return;
  }

  roomStore.updateItemProps(selectedDoorWindowItem.value.id, {
    height: nextCm,
  });
}

function onSelectedItemElevationInput(e: Event) {
  if (!selectedDoorWindowItem.value) return;
  const valueIn = Number((e.target as HTMLInputElement).value);
  if (!Number.isFinite(valueIn)) return;
  const nextValue = Math.max(0, valueIn);

  roomStore.updateItemProps(selectedDoorWindowItem.value.id, {
    elevation: nextValue,
  });
}

function onSelectedItemSideInput(
  side: "leftPosition" | "rightPosition",
  e: Event,
) {
  if (!selectedDoorWindowItem.value) return;
  const valueIn = Number((e.target as HTMLInputElement).value);
  if (!Number.isFinite(valueIn)) return;

  const item = selectedDoorWindowItem.value;
  if (!item.wallId) return;

  const wall = roomStore.walls.find((entry) => entry.id === item.wallId);
  if (!wall) return;

  const wallLengthIn = wall.length / CM_PER_INCH;
  if (wallLengthIn <= 0) return;

  const itemWidthIn = item.width / CM_PER_INCH;
  const halfWidthIn = itemWidthIn / 2;
  const requested = Math.max(0, valueIn);

  let centerOffsetIn =
    side === "leftPosition"
      ? requested + halfWidthIn
      : wallLengthIn - (requested + halfWidthIn);

  let minCenterIn = halfWidthIn;
  let maxCenterIn = wallLengthIn - halfWidthIn;

  // If the item is wider than the wall, pin to wall center.
  if (minCenterIn > maxCenterIn) {
    minCenterIn = wallLengthIn / 2;
    maxCenterIn = wallLengthIn / 2;
  }

  centerOffsetIn = Math.max(minCenterIn, Math.min(maxCenterIn, centerOffsetIn));
  const nextPos = Math.max(0, Math.min(1, centerOffsetIn / wallLengthIn));

  roomStore.moveItem(item.id, nextPos);
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
  if (!item.wallId) {
    return { x: quickBounds.value.centerX, y: quickBounds.value.centerY };
  }

  const wall = roomStore.walls.find((entry) => entry.id === item.wallId);
  if (!wall) {
    return { x: quickBounds.value.centerX, y: quickBounds.value.centerY };
  }

  const end = wallEndPoint(wall);
  const t = Math.max(0, Math.min(1, item.positionAlongWall));
  return {
    x: wall.position[0] + (end[0] - wall.position[0]) * t,
    y: wall.position[1] + (end[1] - wall.position[1]) * t,
  };
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
  const wall = roomStore.walls.find((entry) => entry.id === wallId);
  if (!wall) return false;
  return Math.abs(Math.sin(wall.angle)) > Math.abs(Math.cos(wall.angle));
}

function isDoorOrWindowItem(item: Pick<PlacedItem, "category" | "type">): boolean {
  return item.category === "door" || item.type === "window";
}

function itemWallBandThickness(item: Pick<PlacedItem, "wallId">): number {
  if (!item.wallId) return 6;
  const wall = roomStore.walls.find((entry) => entry.id === item.wallId);
  if (!wall) return 6;

  // Keep the opening strip inside wall thickness with a slight inset.
  return Math.max(1, wall.thickness - 1);
}

function itemMeasurementLabel(
  item: Pick<PlacedItem, "category" | "type" | "width" | "height">,
): string {
  if (!isDoorOrWindowItem(item)) return "";
  return `${cmToInches(item.width)}\"`;
}

// ───── Draw Walls mode ─────────────────────────────────────────────────────
const hasStartedDrawSession = ref(true);

// Draw state
const isDrawing = ref(false);
const isClosed = ref(roomStore.roomIsClosed);
const mousePos = reactive({ x: 0, y: 0 });
const selectedWallId = ref<string | null>(null);
const selectedWallAnchor = ref<[number, number] | null>(null);
const selectedWallAnchorType = ref<"start" | "end">("start");
const pendingStartVertex = ref<[number, number] | null>(null);
const CLOSE_THRESHOLD = 15; // SVG units — snap distance to first vertex
const GRID_SIZE = 10; // SVG grid snap size
const drawWallThicknessInput = ref(6);
const showInsideSideIndicator = ref(true);

function clampDrawHeight(v: number): number {
  return Math.max(
    ROOM_CONSTRAINTS.height.min,
    Math.min(ROOM_CONSTRAINTS.height.max, Math.round(v)),
  );
}

function clampDrawThickness(v: number): number {
  return Math.max(1, Math.min(30, Math.round(v)));
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function onDrawHeightInput(e: Event) {
  const valueIn = Number((e.target as HTMLInputElement).value);
  if (!Number.isFinite(valueIn)) return;
  roomStore.setHeight(clampDrawHeight(inchesToCm(valueIn)));
}

function onDrawThicknessInput(e: Event) {
  const value = Number((e.target as HTMLInputElement).value);
  if (!Number.isFinite(value)) return;
  const thickness = clampDrawThickness(value);
  drawWallThicknessInput.value = thickness;

  // Keep already drawn walls consistent with the selected thickness.
  for (const wall of drawWalls.value) {
    roomStore.updateWallProps(wall.id, { thickness });
  }
}

/** Snap value to nearest grid */
function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

function snapPointTo45Direction(
  start: [number, number],
  target: [number, number],
): [number, number] {
  const dx = target[0] - start[0];
  const dy = target[1] - start[1];
  const rawLength = Math.hypot(dx, dy);
  if (rawLength < 1) return start;

  const step = Math.PI / 4;
  const snappedAngle =
    Math.round(Math.atan2(dy, dx) / step) * step;
  const ux = Math.cos(snappedAngle);
  const uy = Math.sin(snappedAngle);
  const projected = dx * ux + dy * uy;
  return [start[0] + ux * projected, start[1] + uy * projected];
}

/** Get the end-point of a wall (start + direction * length) */
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

function isConnectedVertex(vertex: [number, number]): boolean {
  let incidentCount = 0;

  for (const wall of drawWalls.value) {
    const start: [number, number] = [wall.position[0], wall.position[1]];
    const end = wallEndPoint(wall);

    if (Math.hypot(vertex[0] - start[0], vertex[1] - start[1]) <= 1) {
      incidentCount += 1;
    }
    if (Math.hypot(vertex[0] - end[0], vertex[1] - end[1]) <= 1) {
      incidentCount += 1;
    }

    if (incidentCount >= 2) return true;
  }

  return false;
}

function continuationStartVertexForWall(wall: {
  position: [number, number];
  angle: number;
  length: number;
}): [number, number] {
  const start: [number, number] = [wall.position[0], wall.position[1]];
  const end = wallEndPoint(wall);
  const startConnected = isConnectedVertex(start);
  const endConnected = isConnectedVertex(end);

  // Prefer the non-connected endpoint so Add Wall extends from a chain end.
  if (startConnected && !endConnected) return end;
  if (!startConnected && endConnected) return start;

  // If both ends share the same connectivity state, keep a deterministic fallback.
  return end;
}

/** Compute all vertices from the wall chain */
const drawWalls = computed(() =>
  hasStartedDrawSession.value ? roomStore.walls : [],
);

const hasCustomDrawing = computed(
  () => quickPresetId.value === null && (roomStore.walls.length > 0 || !!pendingStartVertex.value),
);

/** Compute all vertices from the wall chain */
const wallVertices = computed(() => {
  if (drawWalls.value.length === 0) {
    return pendingStartVertex.value ? [pendingStartVertex.value] : [];
  }

  const verts: [number, number][] = [];
  for (const wall of drawWalls.value) {
    verts.push([wall.position[0], wall.position[1]]);
  }
  // Add the end of the last wall
  if (drawWalls.value.length > 0) {
    const last = drawWalls.value[drawWalls.value.length - 1]!;
    verts.push(wallEndPoint(last));
  }
  return verts;
});

const chainEndVertex = computed<[number, number] | null>(() => {
  if (drawWalls.value.length === 0) return null;
  const last = drawWalls.value[drawWalls.value.length - 1]!;
  return wallEndPoint(last);
});

function polygonSignedArea2D(vertices: [number, number][]): number {
  if (vertices.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const [x1, y1] = vertices[i]!;
    const [x2, y2] = vertices[(i + 1) % vertices.length]!;
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function normalizedVerticesForInterior(): [number, number][] {
  const verts = [...wallVertices.value];
  if (verts.length < 2) return verts;

  const first = verts[0]!;
  const last = verts[verts.length - 1]!;
  if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-6) {
    return verts.slice(0, -1);
  }
  return verts;
}

function pointInPolygon2D(
  point: [number, number],
  polygon: [number, number][],
): boolean {
  if (polygon.length < 3) return false;
  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;

    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function interiorSideForWall(wall: {
  position: [number, number];
  angle: number;
  length: number;
  thickness?: number;
}): "right" | "left" {
  const vertices = normalizedVerticesForInterior();
  if (vertices.length >= 3) {
    const start: [number, number] = [wall.position[0], wall.position[1]];
    const end = wallEndPoint(wall);
    const midX = (start[0] + end[0]) / 2;
    const midY = (start[1] + end[1]) / 2;

    const sampleOffset = Math.max(4, (wall.thickness ?? 6) * 1.5);
    const sideX = Math.cos(wall.angle + Math.PI / 2) * sampleOffset;
    const sideY = Math.sin(wall.angle + Math.PI / 2) * sampleOffset;

    const rightInside = pointInPolygon2D([midX + sideX, midY + sideY], vertices);
    const leftInside = pointInPolygon2D([midX - sideX, midY - sideY], vertices);

    if (rightInside !== leftInside) {
      return rightInside ? "right" : "left";
    }

    const signedArea = polygonSignedArea2D(vertices);
    return signedArea >= 0 ? "right" : "left";
  }

  return "right";
}

function insideLeftAnchorTypeForWall(wall: {
  id: string;
  position: [number, number];
  angle: number;
  length: number;
}): "start" | "end" {
  const side = interiorSideForWall(wall);
  return side === "right" ? "start" : "end";
}

const previewWall = computed<{
  position: [number, number];
  angle: number;
  length: number;
  thickness: number;
} | null>(() => {
  if (!isDrawing.value || !lastVertex.value) return null;
  const [sx, sy] = lastVertex.value;
  const ex = mousePos.x;
  const ey = mousePos.y;
  const dx = ex - sx;
  const dy = ey - sy;
  const length = Math.hypot(dx, dy);
  if (length < 1) return null;
  return {
    position: [sx, sy],
    angle: Math.atan2(dy, dx),
    length,
    thickness: drawWallThicknessInput.value,
  };
});

/** The current last vertex (end of last wall, or nothing) */
const lastVertex = computed(() => {
  if (pendingStartVertex.value) return pendingStartVertex.value;
  if (drawWalls.value.length === 0) return null;
  const last = drawWalls.value[drawWalls.value.length - 1]!;
  return wallEndPoint(last);
});

/** First vertex */
const firstVertex = computed(() => {
  if (drawWalls.value.length === 0) return pendingStartVertex.value;
  return drawWalls.value[0]!.position;
});

/** Is the mouse near enough to the first vertex to close? */
const isNearFirstVertex = computed(() => {
  if (!lastVertex.value || !firstVertex.value || drawWalls.value.length < 2)
    return false;
  const dx = mousePos.x - firstVertex.value[0];
  const dy = mousePos.y - firstVertex.value[1];
  return Math.sqrt(dx * dx + dy * dy) < CLOSE_THRESHOLD;
});

/** Points that should be visible while drawing (walls + live cursor). */
const hasPlacedDrawPoint = computed(
  () => !!pendingStartVertex.value || drawWalls.value.length > 0,
);

const drawBoundsPoints = computed<[number, number][]>(() => {
  const points = [...wallVertices.value];
  // Keep the canvas stable until the first anchor is placed.
  if (isDrawing.value && hasPlacedDrawPoint.value) {
    points.push([mousePos.x, mousePos.y]);
  }
  return points;
});

/** SVG viewBox for draw mode — auto-fit to content */
const lockedDrawViewBox = ref<string | null>(null);

function lockDrawViewBoxToCurrentFrame() {
  lockedDrawViewBox.value = drawViewBoxFromPoints(wallVertices.value);
}

function unlockDrawViewBox() {
  lockedDrawViewBox.value = null;
}

function drawViewBoxFromPoints(verts: [number, number][]): string {
  if (verts.length === 0) {
    // Empty canvas — large workspace
    return "-240 -240 480 480";
  }
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
}

const drawViewBox = computed(() => {
  if (lockedDrawViewBox.value) {
    return lockedDrawViewBox.value;
  }
  return drawViewBoxFromPoints(drawBoundsPoints.value);
});

watch(
  () => isClosed.value,
  (closed) => {
    if (!closed) {
      unlockDrawViewBox();
      return;
    }
    // Freeze the world frame for closed-room edits so rigid rotations do not
    // appear to drift due to continuous auto-fit recentering.
    lockDrawViewBoxToCurrentFrame();
  },
  { immediate: true },
);

watch(
  () => roomStore.roomIsClosed,
  (closed) => {
    if (!isDrawing.value) {
      isClosed.value = closed;
    }
  },
  { immediate: true },
);

/** Start fresh drawing */
function startFreshDraw() {
  hasStartedDrawSession.value = true;
  unlockDrawViewBox();
  roomStore.startDrawWalls();
  quickPresetId.value = null;
  isDrawing.value = true;
  isClosed.value = false;
  selectedWallId.value = null;
  selectedWallAnchor.value = null;
  selectedWallAnchorType.value = "start";
  pendingStartVertex.value = null;
}

function clearCustomDrawing() {
  hasStartedDrawSession.value = true;
  unlockDrawViewBox();
  roomStore.startDrawWalls();
  isDrawing.value = false;
  isClosed.value = false;
  selectedWallId.value = null;
  selectedWallAnchor.value = null;
  selectedWallAnchorType.value = "start";
  pendingStartVertex.value = null;
}

function continueDrawing() {
  unlockDrawViewBox();
  if (drawWalls.value.length === 0 && !pendingStartVertex.value) {
    startFreshDraw();
    return;
  }

  if (selectedWall.value) {
    const continuationStart = continuationStartVertexForWall(selectedWall.value);
    pendingStartVertex.value = [
      snapToGrid(continuationStart[0]),
      snapToGrid(continuationStart[1]),
    ];
    mousePos.x = pendingStartVertex.value[0];
    mousePos.y = pendingStartVertex.value[1];
  } else if (chainEndVertex.value) {
    pendingStartVertex.value = [
      snapToGrid(chainEndVertex.value[0]),
      snapToGrid(chainEndVertex.value[1]),
    ];
    mousePos.x = pendingStartVertex.value[0];
    mousePos.y = pendingStartVertex.value[1];
  } else {
    pendingStartVertex.value = null;
  }

  hasStartedDrawSession.value = true;
  isDrawing.value = true;
  isClosed.value = false;
  selectedWallId.value = null;
  selectedWallAnchor.value = null;
  selectedWallAnchorType.value = "start";
}

/** Handle canvas click in draw mode */
function onDrawCanvasClick(e: MouseEvent) {
  if (isClosed.value || !svgRef.value) return;

  // Drawing must be explicitly started from controls (Start Drawing / Add Wall).
  if (!isDrawing.value) {
    return;
  }

  const pt = screenToSvg(svgRef.value, e.clientX, e.clientY);
  let sx = snapToGrid(pt.x);
  let sy = snapToGrid(pt.y);

  if (!pendingStartVertex.value && drawWalls.value.length === 0) {
    pendingStartVertex.value = [sx, sy];
    mousePos.x = sx;
    mousePos.y = sy;
    return;
  }

  if (lastVertex.value) {
    const snapped = snapPointTo45Direction(lastVertex.value, [sx, sy]);
    sx = snapToGrid(snapped[0]);
    sy = snapToGrid(snapped[1]);
  }

  // The first click after choosing a start vertex must always draw from that start.
  if (pendingStartVertex.value) {
    roomStore.addWallVertex(
      sx,
      sy,
      drawWallThicknessInput.value,
      pendingStartVertex.value,
    );
    pendingStartVertex.value = null;
    return;
  }

  // Check if we should close the polygon
  if (isNearFirstVertex.value && firstVertex.value) {
    roomStore.closeRoom(drawWallThicknessInput.value);
    isDrawing.value = false;
    isClosed.value = true;
    pendingStartVertex.value = null;
    return;
  }

  roomStore.addWallVertex(sx, sy, drawWallThicknessInput.value);
}

/** Handle mouse move in draw mode */
function onDrawMouseMove(e: MouseEvent) {
  if (!svgRef.value) return;
  const pt = screenToSvg(svgRef.value, e.clientX, e.clientY);
  let sx = snapToGrid(pt.x);
  let sy = snapToGrid(pt.y);

  if (lastVertex.value && isDrawing.value) {
    const snapped = snapPointTo45Direction(lastVertex.value, [sx, sy]);
    sx = snapToGrid(snapped[0]);
    sy = snapToGrid(snapped[1]);
  }

  mousePos.x = sx;
  mousePos.y = sy;
}

/** Handle Escape key — undo last wall segment */
function onDrawKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    if (isDrawing.value) {
      isDrawing.value = false;
      pendingStartVertex.value = null;
      selectedWallId.value = null;
      selectedWallAnchor.value = null;
      selectedWallAnchorType.value = "start";
    }
  }
}

onMounted(() => {
  document.addEventListener("keydown", onDrawKeyDown);
});
onUnmounted(() => {
  document.removeEventListener("keydown", onDrawKeyDown);
});

/** Select a wall in draw mode */
function selectWall(wallId: string, e: MouseEvent) {
  e.stopPropagation();
  selectedWallId.value = wallId;

  const wall = drawWalls.value.find((w) => w.id === wallId);
  if (!wall) {
    selectedWallAnchor.value = null;
    return;
  }

  const start: [number, number] = [wall.position[0], wall.position[1]];
  const end = wallEndPoint(wall);
  const anchorType = insideLeftAnchorTypeForWall(wall);
  selectedWallAnchorType.value = anchorType;

  if (anchorType === "start") {
    selectedWallAnchor.value = start;
  } else {
    selectedWallAnchor.value = end;
  }
}

/** Deselect wall */
function deselectWall() {
  selectedWallId.value = null;
  selectedWallAnchor.value = null;
  selectedWallAnchorType.value = "start";
}

function removeSelectedWall() {
  if (!selectedWall.value) return;

  const selectedId = selectedWall.value.id;
  const beforeLen = drawWalls.value.length;
  roomStore.removeWall(selectedId);

  // Fallback: ensure removal even if action couldn't resolve by id.
  if (drawWalls.value.length === beforeLen) {
    const nextWalls = drawWalls.value.filter((w) => w.id !== selectedId);
    if (nextWalls.length !== beforeLen) {
      roomStore.setRoomFromWalls(nextWalls);
      nextWalls.forEach((wall, i) => {
        roomStore.updateWallProps(wall.id, { label: String(i + 1) });
      });
    }
  }

  selectedWallId.value = null;
  selectedWallAnchor.value = null;
  selectedWallAnchorType.value = "start";
  unlockDrawViewBox();
  isClosed.value = false;

  if (drawWalls.value.length === 0) {
    isDrawing.value = false;
    pendingStartVertex.value = null;
  }
}

/** Selected wall object */
const selectedWall = computed(() => {
  if (!selectedWallId.value) return null;
  return drawWalls.value.find((w) => w.id === selectedWallId.value) ?? null;
});

/** Computed angle in degrees for display */
const selectedWallAngleDeg = computed(() => {
  if (!selectedWall.value) return 0;
  return Math.round(radToDeg(selectedWall.value.angle));
});

function setSelectedWallAngleDeg(angleDeg: number) {
  if (!selectedWall.value || !Number.isFinite(angleDeg)) return;
  if (!isClosed.value && !lockedDrawViewBox.value) {
    // Keep the frame fixed while rotating an open/boundary structure.
    lockDrawViewBoxToCurrentFrame();
  }

  // Anchor endpoint is resolved when selecting a wall and kept stable while
  // editing angle. Recomputing it every step can flip pivot endpoints mid-edit
  // in open topologies.
  const anchorType = selectedWallAnchorType.value;
  selectedWallAnchor.value =
    anchorType === "start"
      ? [selectedWall.value.position[0], selectedWall.value.position[1]]
      : wallEndPoint(selectedWall.value);

  roomStore.setWallAngle(
    selectedWall.value.id,
    degToRad(angleDeg),
    anchorType,
  );

  // Keep displayed anchor coordinates in sync with updated geometry while
  // preserving the same endpoint type throughout the edit interaction.
  const updatedWall = drawWalls.value.find((w) => w.id === selectedWall.value!.id);
  if (updatedWall) {
    selectedWallAnchor.value =
      anchorType === "start"
        ? [updatedWall.position[0], updatedWall.position[1]]
        : wallEndPoint(updatedWall);
  }
}

function onSelectedWallAngleInput(e: Event) {
  const next = Number((e.target as HTMLInputElement).value);
  if (!Number.isFinite(next)) return;
  setSelectedWallAngleDeg(next);
}

function rotateSelectedWall(deltaDeg: number) {
  if (!selectedWall.value) return;
  setSelectedWallAngleDeg(radToDeg(selectedWall.value.angle) + deltaDeg);
}

/** Wall midpoint for label placement */
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

/** Compute the filled polygon outline for a thick wall segment */
function wallPolygonPoints(wall: {
  position: [number, number];
  angle: number;
  length: number;
  thickness: number;
}): string {
  const t = wall.thickness / 2;
  const perpAngle = wall.angle + Math.PI / 2;
  const cos = Math.cos(perpAngle) * t;
  const sin = Math.sin(perpAngle) * t;
  const end = wallEndPoint(wall);
  // Four corners: start±perp, end±perp
  const p1 = [wall.position[0] + cos, wall.position[1] + sin];
  const p2 = [wall.position[0] - cos, wall.position[1] - sin];
  const p3 = [end[0] - cos, end[1] - sin];
  const p4 = [end[0] + cos, end[1] + sin];
  return `${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]} ${p4[0]},${p4[1]}`;
}

function wallInsideAreaPoints(
  wall: {
    position: [number, number];
    angle: number;
    length: number;
    thickness: number;
  },
  preview = false,
) {
  const edgeInset = Math.min(0.8, Math.max(0.1, wall.thickness * 0.25));
  const guideDepth = preview ? 22 : 18;
  const side = preview ? "right" : interiorSideForWall(wall);
  return wallInsideGuideAreaPoints(wall, side, edgeInset, guideDepth);
}

/** Format length for display */
function formatLength(cm: number): string {
  return formatInches(cm);
}

/** Dimension line offset perpendicular to the wall */
function dimLinePoints(wall: {
  position: [number, number];
  angle: number;
  length: number;
}): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tx: number;
  ty: number;
} {
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
          <h3 class="sidebar-heading">Layout Tools</h3>

          <h4 class="sidebar-subheading">Quick Presets</h4>
          <div class="preset-list">
            <button
              v-for="preset in QUICK_ROOM_PRESETS"
              :key="preset.id"
              class="preset-card"
              :class="{ active: quickPresetId === preset.id }"
              @click="requestQuickPreset(preset.id)"
            >
              <span class="preset-title">{{ preset.label }}</span>
              <span class="preset-desc">{{ preset.description }}</span>
            </button>
          </div>

          <h4 class="sidebar-subheading">Draw Wall</h4>

          <div class="draw-controls">
            <p class="draw-hint" v-if="!isDrawing && !hasCustomDrawing">
              Click <span class="draw-hint-accent">Custom Room</span> to begin placing walls.
            </p>

            <p class="draw-hint" v-if="!isDrawing && hasCustomDrawing">
              Click <span class="draw-hint-accent">Clear Drawing</span> to clear the drawing and start again.
            </p>

            <button
              v-if="!hasCustomDrawing"
              class="sidebar-action-btn draw-btn"
              @click="startFreshDraw"
            >
              Custom Room
            </button>

            <button
              v-else
              class="sidebar-action-btn draw-btn"
              @click="clearCustomDrawing"
            >
              Clear Drawing
            </button>

            <div class="prop-row indicator-toggle-row">
              <label class="prop-label">Show Inside</label>
              <input
                v-model="showInsideSideIndicator"
                type="checkbox"
                class="indicator-toggle"
              />
            </div>

            <p class="draw-hint" v-if="isDrawing">
              Click on the canvas to place wall vertices.<br />
              Click near the <strong>first point</strong> to close the room.<br />
              Press <kbd>Esc</kbd> to finish drawing.
            </p>
          </div>
        </div>
      </aside>

      <!-- Center: 2D Floor Plan Canvas -->
      <main class="floorplan-canvas-area">
        <div class="canvas-container">
          <svg
            ref="svgRef"
            :viewBox="drawViewBox"
            class="floorplan-svg draw-canvas"
            xmlns="http://www.w3.org/2000/svg"
            @click="onDrawCanvasClick"
            @mousemove="onDrawMouseMove"
            @click.self="selectedItemId = null; deselectWall()"
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
              v-if="drawWalls.length >= 3"
              :points="wallVertices.map((v) => v.join(',')).join(' ')"
              fill="#d4c9b8"
              fill-opacity="0.15"
              stroke="none"
            />

            <!-- Drawn wall segments -->
            <g v-for="wall in drawWalls" :key="wall.id">
              <polygon
                v-if="wall.visible && showInsideSideIndicator && isDrawing"
                :points="wallInsideAreaPoints(wall)"
                class="inside-side-area"
                @click.stop="selectWall(wall.id, $event)"
              />

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
              <g
                :transform="`translate(${wallMidpoint(wall)[0]}, ${wallMidpoint(wall)[1]})`"
              >
                <circle
                  r="10"
                  fill="#f59e0b"
                  stroke="#0f172a"
                  stroke-width="1.5"
                />
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

            <!-- Vertices (dots at each corner) -->
            <circle
              v-for="(v, i) in wallVertices"
              :key="'v-' + i"
              class="vertex-dot"
              :cx="v[0]"
              :cy="v[1]"
              :r="i === 0 && isNearFirstVertex ? 8 : 4"
              :fill="isConnectedVertex(v) ? '#fbbf24' : '#22c55e'"
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
            >
              {{ formatLength(previewWall.length) }}
            </text>

            <polygon
              v-if="previewWall && showInsideSideIndicator"
              :points="wallInsideAreaPoints(previewWall, true)"
              class="inside-side-area preview"
              pointer-events="none"
            />

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

            <g
              v-for="item in roomStore.items"
              :key="item.id"
              :transform="`translate(${itemSvgPos(item).x}, ${itemSvgPos(item).y})${isVerticalWall(item.wallId) ? ' rotate(90)' : ''}`"
              class="placed-item"
              :class="{ selected: selectedItemId === item.id }"
              @pointerdown="startItemDrag(item.id, item.wallId ?? '', $event)"
              @click.stop="selectItem(item.id, $event)"
            >
              <rect
                :x="-item.width / 2"
                :y="-itemWallBandThickness(item) / 2"
                :width="item.width"
                :height="itemWallBandThickness(item)"
                :fill="itemColor(item.category)"
                :stroke="selectedItemId === item.id ? '#fbbf24' : 'none'"
                :stroke-width="selectedItemId === item.id ? 2 : 0"
                rx="2"
                :opacity="selectedItemId === item.id ? 1 : 0.8"
                style="cursor: grab"
              />
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
              <text
                v-if="isDoorOrWindowItem(item)"
                x="0"
                :y="selectedItemId === item.id ? -19 : 25"
                text-anchor="middle"
                fill="#cbd5e1"
                font-size="7"
                font-weight="600"
              >
                {{ itemMeasurementLabel(item) }}
              </text>
              <g
                v-if="selectedItemId === item.id"
                @click.stop="deleteSelectedItem"
                style="cursor: pointer"
              >
                <circle
                  :cx="item.width / 2 + 8"
                  :cy="-itemWallBandThickness(item) / 2"
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
                  x
                </text>
              </g>
            </g>
          </svg>
        </div>

        <!-- Hint overlay -->
        <div class="canvas-hint" v-if="isDrawing">
          Click to place vertices · Click near first point to close · Esc to
          finish
        </div>
        <div class="canvas-hint" v-else-if="isClosed">
          Click a wall to select and edit · Click empty area to deselect
        </div>
        <div class="canvas-hint" v-else>
          Select a preset or click Custom Room to redraw the room
        </div>
      </main>

      <aside class="sidebar sidebar-right">
        <div class="sidebar-section">
          <h3 class="sidebar-heading">Wall Options</h3>

          <div class="draw-input-grid">
            <div class="prop-row">
              <label class="prop-label">Wall Height</label>
              <input
                class="prop-input"
                type="number"
                :value="cmToInches(roomStore.height)"
                :min="cmToInches(ROOM_CONSTRAINTS.height.min)"
                :max="cmToInches(ROOM_CONSTRAINTS.height.max)"
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

          <div v-if="selectedWall" class="wall-props">
            <h4 class="sidebar-subheading">Wall {{ selectedWall.label }}</h4>

              <p
                v-if="!isDrawing && drawWalls.length > 0"
                class="draw-hint"
              >
                Click <strong>Add Wall</strong> to continue from the selected wall endpoint.
              </p>

              <button
                v-if="!isDrawing && drawWalls.length > 0"
                type="button"
                class="sidebar-action-btn draw-btn"
                @click="continueDrawing"
              >
                Add Wall
              </button>

            <div class="prop-row">
              <label class="prop-label">Label</label>
              <input
                class="prop-input"
                :value="selectedWall.label"
                @input="
                  (e: Event) =>
                    roomStore.updateWallProps(selectedWall!.id, {
                      label: (e.target as HTMLInputElement).value,
                    })
                "
              />
            </div>

            <div class="prop-row">
              <label class="prop-label">Length</label>
              <input
                class="prop-input"
                type="number"
                :value="cmToInches(selectedWall.length)"
                @input="
                  (e: Event) =>
                    roomStore.updateWallProps(selectedWall!.id, {
                      length: inchesToCm(Number((e.target as HTMLInputElement).value)),
                    })
                "
              />
            </div>

            <div class="prop-row">
              <label class="prop-label">Height</label>
              <input
                class="prop-input"
                type="number"
                :value="cmToInches(roomStore.height)"
                @input="
                  (e: Event) =>
                    roomStore.setHeight(
                      inchesToCm(Number((e.target as HTMLInputElement).value)),
                    )
                "
              />
            </div>

            <div class="prop-row">
              <label class="prop-label">Thickness</label>
              <input
                class="prop-input"
                type="number"
                :value="selectedWall.thickness"
                @input="
                  (e: Event) =>
                    roomStore.updateWallProps(selectedWall!.id, {
                      thickness: Number((e.target as HTMLInputElement).value),
                    })
                "
              />
            </div>

            <div class="prop-row">
              <label class="prop-label">{{ isClosed ? "Rotate Room" : "Angle" }}</label>
              <div class="angle-controls">
                <button
                  type="button"
                  class="angle-btn"
                  @click="rotateSelectedWall(-1)"
                  title="Rotate -1°"
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
                  title="Rotate +1°"
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
                @change="
                  (e: Event) =>
                    roomStore.updateWallProps(selectedWall!.id, {
                      visible: (e.target as HTMLInputElement).checked,
                    })
                "
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

          <p v-else class="sidebar-empty-text">
            Select a wall to edit wall properties.
          </p>

          <h4 class="sidebar-subheading">Add Options</h4>
          <div class="item-grid">
            <button
              class="item-card"
              @click="addArchItem(DOOR_ITEMS[0]!)"
            >
              <div class="item-icon">🚪</div>
              <span class="item-label">Add Door</span>
            </button>
            <button
              class="item-card"
              @click="addArchItem(DECO_ITEMS[0]!)"
            >
              <div class="item-icon">🪟</div>
              <span class="item-label">Add Window</span>
            </button>
          </div>

          <div v-if="selectedDoorWindowItem" class="wall-props">
            <h4 class="sidebar-subheading">
              Selected {{ itemLabel(selectedDoorWindowItem.type) }}
            </h4>

            <div class="prop-row">
              <label class="prop-label">Width</label>
              <input
                class="prop-input"
                type="number"
                min="1"
                :value="cmToInches(selectedDoorWindowItem.width)"
                @input="onSelectedItemSizeInput('width', $event)"
              />
            </div>

            <div class="prop-row">
              <label class="prop-label">Height</label>
              <input
                class="prop-input"
                type="number"
                min="1"
                :value="cmToInches(selectedDoorWindowItem.height)"
                @input="onSelectedItemSizeInput('height', $event)"
              />
            </div>

            <div class="prop-row">
              <label class="prop-label">Left Position</label>
              <input
                class="prop-input"
                type="number"
                min="0"
                step="0.1"
                data-testid="left-position-input"
                :value="selectedDoorWindowItem.leftPosition"
                @input="onSelectedItemSideInput('leftPosition', $event)"
              />
            </div>

            <div class="prop-row">
              <label class="prop-label">Right Position</label>
              <input
                class="prop-input"
                type="number"
                min="0"
                step="0.1"
                data-testid="right-position-input"
                :value="selectedDoorWindowItem.rightPosition"
                @input="onSelectedItemSideInput('rightPosition', $event)"
              />
            </div>

            <div class="prop-row">
              <label class="prop-label">Elevation</label>
              <input
                class="prop-input"
                type="number"
                min="0"
                :value="selectedDoorWindowItem.elevation"
                @input="onSelectedItemElevationInput($event)"
              />
            </div>
          </div>
        </div>
      </aside>

    </div>

    <Teleport to="body">
      <div
        v-if="showPresetReplaceDialog"
        class="dialog-overlay"
        @click.self="cancelQuickPresetReplacement"
      >
        <div class="dialog-box">
          <h3 class="dialog-title">Replace Current Layout?</h3>
          <p class="dialog-desc">
            Applying a quick preset will replace existing walls and architecture
            items in this room.
          </p>

          <div class="dialog-actions">
            <button class="dialog-btn cancel" @click="cancelQuickPresetReplacement">
              Cancel
            </button>
            <button class="dialog-btn apply" @click="confirmQuickPresetReplacement">
              Replace Layout
            </button>
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

@media (min-width: 1024px) {
  .sidebar-left {
    order: 2;
    border-right: none;
    border-left: 1px solid rgba(255, 255, 255, 0.06);
  }

  .floorplan-canvas-area {
    order: 1;
  }

  .sidebar-right {
    order: 0;
    border-left: none;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
  }
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

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.38);
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-card:hover {
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(51, 65, 85, 0.72);
}

.preset-card.active {
  border-color: rgba(251, 191, 36, 0.6);
  background: rgba(251, 191, 36, 0.14);
}

.preset-title {
  font-size: 11px;
  font-weight: 700;
  color: #f1f5f9;
}

.preset-desc {
  font-size: 10px;
  color: #94a3b8;
  line-height: 1.35;
}

.resize-lock-group {
  display: flex;
  gap: 6px;
}

.lock-btn {
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.46);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  padding: 7px 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.lock-btn:hover {
  border-color: rgba(251, 191, 36, 0.38);
  color: #f1f5f9;
}

.lock-btn.active {
  border-color: rgba(251, 191, 36, 0.7);
  background: rgba(251, 191, 36, 0.18);
  color: #fbbf24;
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

.quick-wall-badge {
  pointer-events: none;
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

.draw-hint-accent {
  color: #22c55e;
  font-weight: 700;
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

.sidebar-empty-text {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
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

.indicator-toggle-row {
  padding-top: 2px;
}

.indicator-toggle {
  width: 16px;
  height: 16px;
  accent-color: #22c55e;
  cursor: pointer;
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
  transition:
    fill 0.1s,
    stroke 0.1s;
}

.wall-segment:hover {
  fill: #e8c88a;
  stroke: #f59e0b;
}

.inside-side-area {
  fill: rgba(2, 6, 23, 0.24);
  stroke: none;
  cursor: pointer;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.22));
}

.inside-side-area.preview {
  fill: rgba(2, 6, 23, 0.3);
}

.close-snap {
  filter: drop-shadow(0 0 4px rgba(34, 197, 94, 0.6));
}

.close-indicator {
  animation: pulse-ring 1s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
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
