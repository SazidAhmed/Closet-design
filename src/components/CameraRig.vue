<script setup lang="ts">
// ---------------------------------------------------------------------------
// CameraRig — renderless component placed inside <TresCanvas>.
// Watches viewMode changes and animates the camera between presets.
// ---------------------------------------------------------------------------
import { watch, ref, onMounted, onUnmounted } from "vue";
import { useTresContext } from "@tresjs/core";
import { useClosetStore } from "../stores/useClosetStore";
import { useAppStore, type ViewMode } from "../stores/useAppStore";
import * as THREE from "three";
import type { OrbitControls } from "three-stdlib";

interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
}

const props = defineProps<{
  orbitControlsRef: any;
}>();

const emit = defineEmits<{
  (e: "animating", value: boolean): void;
}>();

const closet = useClosetStore();
const appStore = useAppStore();

// useTresContext().camera is UseCameraReturn — get activeCamera from it
const ctx = useTresContext();

const isAnimating = ref(false);
let animFrameId: number | null = null;

// ── Ease-in-out cubic ─────────────────────────────────────────────────────
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Compute preset for a given view mode ──────────────────────────────────
function getPreset(mode: ViewMode): CameraPreset {
  const w = Number(closet.cabinet.width) || 60;
  const h = Number(closet.cabinet.height) || 200;
  const d = Number(closet.cabinet.depth) || 60;
  const maxDim = Math.max(w, h, d);

  switch (mode) {
    case "wall":
      return {
        position: [0, h * 0.2, maxDim * 1.6],
        target: [0, h * 0.2, 0],
        up: [0, 1, 0],
      };
    case "overhead":
      return {
        position: [0, maxDim * 2, 0],
        target: [0, 0, 0],
        up: [0, 0, -1],
      };
    default:
      return {
        position: [maxDim * 0.9, maxDim * 0.6, maxDim * 1.1],
        target: [0, h * 0.3, 0],
        up: [0, 1, 0],
      };
  }
}

// ── Resolve the underlying OrbitControls instance ─────────────────────────
function getControls(): OrbitControls | null {
  const ref = props.orbitControlsRef;
  if (!ref) return null;
  // TresJS cientos exposes `.instance` as a ShallowRef
  const inst = ref.instance ?? ref.$?.exposed?.instance;
  if (!inst) return null;
  return inst.value ?? inst;
}

// ── Helper to get the Three.js camera object ─────────────────────────────
function getCam(): THREE.Camera | null {
  return ctx.camera.activeCamera.value ?? null;
}

// ── Animate camera to a preset ───────────────────────────────────────────
function animateToPreset(preset: CameraPreset, mode: ViewMode) {
  const cam = getCam();
  if (!cam) return;

  // Cancel any running animation
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  const controls = getControls();

  // Snapshot start values
  const startPos = cam.position.clone();
  const endPos = new THREE.Vector3(...preset.position);
  const startUp = cam.up.clone();
  const endUp = new THREE.Vector3(...preset.up);
  const startTarget = controls
    ? controls.target.clone()
    : new THREE.Vector3(0, 0, 0);
  const endTarget = new THREE.Vector3(...preset.target);

  // Disable controls during animation
  if (controls) controls.enabled = false;

  isAnimating.value = true;
  emit("animating", true);

  const durationMs = 700;
  const startTime = performance.now();

  // cam is guaranteed non-null here — capture as const for closure
  const animCam = cam;

  function tick() {
    const t = Math.min((performance.now() - startTime) / durationMs, 1);
    const e = easeInOutCubic(t);

    animCam.position.lerpVectors(startPos, endPos, e);
    animCam.up.lerpVectors(startUp, endUp, e);
    animCam.up.normalize();

    if (controls) {
      controls.target.lerpVectors(startTarget, endTarget, e);
      controls.update();
    } else {
      animCam.lookAt(
        new THREE.Vector3().lerpVectors(startTarget, endTarget, e),
      );
    }

    if (t < 1) {
      animFrameId = requestAnimationFrame(tick);
    } else {
      animFrameId = null;
      isAnimating.value = false;
      emit("animating", false);
      // Re-enable orbit controls only in 3D mode
      if (controls) {
        controls.enabled = mode === "3d";
        controls.update();
      }
    }
  }

  animFrameId = requestAnimationFrame(tick);
}

// ── Initial placement (no animation) ─────────────────────────────────────
let ready = false;

onMounted(() => {
  // Small delay so OrbitControls and Camera are initialised
  setTimeout(() => {
    const cam = getCam();
    if (!cam) return;

    const preset = getPreset(appStore.viewMode);
    cam.position.set(...preset.position);
    cam.up.set(...preset.up);

    const controls = getControls();
    if (controls) {
      controls.target.set(...preset.target);
      controls.enabled = appStore.viewMode === "3d";
      controls.update();
    }
    ready = true;
  }, 50);
});

onUnmounted(() => {
  if (animFrameId !== null) cancelAnimationFrame(animFrameId);
});

// ── Watch view-mode changes ──────────────────────────────────────────────
watch(
  () => appStore.viewMode,
  (newMode) => {
    if (!ready) return;
    animateToPreset(getPreset(newMode), newMode);
  },
);

defineExpose({ isAnimating });
</script>

<template>
  <!-- Renderless — no DOM output -->
</template>
