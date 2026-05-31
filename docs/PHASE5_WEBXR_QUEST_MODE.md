# Phase 5 - WebXR / Quest Mode

## Purpose

Phase 5 upgrades the browser-based sandbox from WebXR entry support into a headset-ready learning mode. The product remains desktop-first, but every lesson now has a VR workbench path that can be completed with controller ray interaction when a browser reports `immersive-vr` support.

## Implemented product behavior

- Desktop WebGL workbench remains the primary fallback.
- The lesson page now exposes a WebXR readiness rail with:
  - XR support state
  - current session state
  - Quest interaction rule
- The 3D scene checks `navigator.xr.isSessionSupported('immersive-vr')` before allowing VR entry.
- The VR entry button is disabled when immersive VR is not reported by the browser.
- VR entry failures are caught and reported in the UI instead of silently failing.
- A 3D in-scene VR ray console was added inside the workbench.
- Controller/pointer-selectable 3D buttons can adjust:
  - duration down/up
  - easing curve cycle
  - overshoot down/up
  - anticipation down/up
  - settle hold up
- A headset-following HUD appears only while `gl.xr.isPresenting` is active.
- Desktop sliders and select fields remain the canonical fallback controls.
- Scoring, feedback, progress save, lesson locking, and certificate gating remain unchanged.

## Architecture rule

The VR layer does not replace the learning engine. It only gives headset users a spatial control surface for the same deterministic lesson attempt state. This prevents two divergent products from forming: one desktop lesson and one separate VR lesson.

## Verification required on hardware

This phase has not been verified on a physical Meta Quest headset in this environment. Before claiming Quest production readiness, test these exact flows on Quest Browser:

1. Open a published lesson in Quest Browser.
2. Confirm WebXR readiness reports immersive VR support.
3. Press Enter VR Workbench.
4. Confirm the session enters VR without freezing the page.
5. Confirm controller rays can select the 3D console buttons.
6. Confirm score changes after controller selections.
7. Confirm the headset-following HUD is readable and not too close.
8. Exit VR and confirm desktop/browser fallback still works.
9. Submit progress after VR adjustments.
10. Confirm dashboard and certificate gates still use the saved result.

## Non-generic UI rule preserved

The VR layer uses a spatial workbench, in-scene console, and headset HUD. It does not introduce stock SaaS panels, generic AI assistant layouts, or template VR classroom design.
