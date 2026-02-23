// ---------------------------------------------------------------------------
// useCameraAnimation — smooth lerp-based camera transitions using TresJS loop
// Must be called inside <TresCanvas> (needs useTresContext / useLoop).
// ---------------------------------------------------------------------------

import { ref, type ShallowRef } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'
import type { OrbitControls } from 'three-stdlib'

export interface CameraPreset {
  position: [number, number, number]
  target: [number, number, number]
  up: [number, number, number]
}

/** Ease-in-out cubic */
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function useCameraAnimation(
  camera: THREE.Camera,
  controlsRef: ShallowRef<OrbitControls | null>,
) {
  const isAnimating = ref(false)

  // Animation state
  let startPos = new THREE.Vector3()
  let endPos = new THREE.Vector3()
  let startTarget = new THREE.Vector3()
  let endTarget = new THREE.Vector3()
  let startUp = new THREE.Vector3()
  let endUp = new THREE.Vector3()
  let elapsed = 0
  let duration = 0
  let active = false

  // Hook into the TresJS render loop
  const { onBeforeRender } = useLoop()

  onBeforeRender(({ delta }) => {
    if (!active) return

    elapsed += delta
    const t = Math.min(elapsed / duration, 1)
    const eased = easeInOutCubic(t)

    // Lerp camera position
    camera.position.lerpVectors(startPos, endPos, eased)

    // Lerp camera up vector
    camera.up.lerpVectors(startUp, endUp, eased)
    camera.up.normalize()

    // Lerp orbit controls target (look-at point)
    const controls = controlsRef.value
    if (controls) {
      controls.target.lerpVectors(startTarget, endTarget, eased)
      controls.update()
    } else {
      // Fallback: just lookAt the target
      const lookTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, eased)
      camera.lookAt(lookTarget)
    }

    // Done?
    if (t >= 1) {
      active = false
      isAnimating.value = false

      // Re-enable controls if they exist
      if (controls) {
        controls.update()
      }
    }
  })

  /**
   * Start a smooth animated transition to the given camera preset.
   * @param preset  Target position, look-at target, and up vector
   * @param ms      Duration in milliseconds (default 700)
   */
  function animateTo(preset: CameraPreset, ms = 700) {
    const controls = controlsRef.value

    // Capture current state
    startPos = camera.position.clone()
    startUp = camera.up.clone()

    if (controls) {
      startTarget = controls.target.clone()
      // Disable controls during animation
      controls.enabled = false
    } else {
      startTarget = new THREE.Vector3(0, 0, 0)
    }

    // Set targets
    endPos = new THREE.Vector3(...preset.position)
    endTarget = new THREE.Vector3(...preset.target)
    endUp = new THREE.Vector3(...preset.up)

    elapsed = 0
    duration = ms / 1000 // convert to seconds for delta
    active = true
    isAnimating.value = true
  }

  /**
   * Enable or disable OrbitControls (called after animation completes).
   */
  function setControlsEnabled(enabled: boolean) {
    const controls = controlsRef.value
    if (controls) {
      controls.enabled = enabled
    }
  }

  return { isAnimating, animateTo, setControlsEnabled }
}
