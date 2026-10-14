# Webarqr — floor construction AR

[Open the live website](https://santhosh16r.github.io/webarqr-sample-building/)

The app places the iNXT Tower on a detected horizontal surface and plays its 20-second construction animation. Aim at the actual floor: surface tracking can also recognize a tabletop. A vertical wall is rejected. No marker is used in the current flow.

## Phone flow

1. Open the HTTPS page in Chrome on a supported Android phone or Safari on iPhone.
2. Choose **Place on floor** and allow AR access.
3. In browser WebXR, move slowly over the floor and tap the blue ring. The tower stays upright at that spot and starts building.
4. **Replay animation** rebuilds at the same spot. **Reset** clears the placement and asks for a fresh floor hit. The close button exits AR.

After placement, the browser overlay contains only Replay animation, Reset, and a small close button. Rotation, size sliders, marker calibration, and move/place buttons have been removed. Placement uses a tap on the floor reticle instead.

The tower remains under 30 cm tall. The fixed browser width of 7.3 cm gives an upright height of about 29.8 cm including the plaza. Native models are authored at 30 cm height with content scaling disabled.

## Device support

| Mode | Placement and animation | Controls |
| --- | --- | --- |
| WebXR on a compatible Android/browser | Horizontal hit testing, optional XR anchors; construction starts after placement | Replay animation, Reset, Close |
| iPhone AR Quick Look | Native horizontal-surface placement; animated USDZ including blue scans | The operating system supplies placement and playback controls |
| Android Scene Viewer fallback | Native AR placement; animated GLB including blue scans | The operating system supplies placement and playback controls |

The launcher prefers browser floor AR when supported, otherwise it opens the phone's native AR viewer. Android native links use `ar_only`, so an unsupported device does not silently switch to a floating 3D model. A device without either capability displays an explanation rather than marker tracking.

Native viewers control playback timing and interface. Their controls cannot be replaced by this webpage's two buttons, and the webpage cannot trigger animation specifically after native placement. The embedded clip is set to play when the native asset opens; use the native viewer's playback controls to replay after placement. Quick Look uses `allowsContentScaling=0`; Scene Viewer uses `resizable=false`.

## Construction and blue scanning

`docs/assets/iNXT_Tower_Animated.glb` is the user's unmodified original source. `scripts/build_construction_tower.mjs` creates `iNXT_Tower_Construction.glb` with a rising blue emissive scan ring and pulsing floor halo in the same animation clip. Both effects disappear at completion and restart with replay. Their geometry and animation are portable, so they are also included in the native GLB and USDZ rather than relying on browser shaders.

The construction model's full animation envelope stays within the original 40.60 × 165.65 × 38.00 units. Wrappers handle physical scale and the base offset without modifying the original animation tracks. Browser playback pauses until a valid floor placement and holds the completed frame. Horizontal placement uses yaw only, preserving the upright tower.

## Regenerate and verify

```sh
npm ci
npm run native:build
npm run native:check
node scripts/check_tower_animation.mjs
node scripts/check_model_size.mjs
npm run web:check
npm run web:package
```

`native:build` first creates the scan-enhanced construction GLB, then generates the scaled Android GLB and animated iPhone USDZ. The USDZ contains sampled transform animations, double-sided geometry, emissive colours, a completed default pose, and horizontal anchoring metadata. The original model is preserved.

`python scripts/check_tower_usdz.py` uses the official `usd-core` Python package, either installed normally or in `outputs/verification/usd-runtime`, to verify composition, animation, scan movement and the height cap. Reports are saved under `outputs/`.

For local browser checks, run `python tools/preview_server.py` and open:

- `/docs/` — the current floor-only site.
- `/tools/floor-checks.html` — horizontal-hit filtering, ground position, upright orientation, reset requiring a new hit, and invalid-pose rejection.
- `/tools/floor-launch-checks.html` — simulated Android/iPhone native link selection and WebXR permission denial; no camera or native app is opened.

Physical phone testing remains required for actual floor detection, tracking stability, native playback and native UI. Desktop and simulated checks do not confirm these device behaviours. Test placement, replay, reset/reposition, tracking loss, closing/reopening AR, and returning after switching apps on both phones.

## Deployment

GitHub Pages publishes branch `main`, folder `/docs`, at the live link above. All runtime assets are local to the site. `outputs/webarqr-website.zip` contains the complete static website for another HTTPS host.

Camera and AR tracking are handled on the device; the app does not record or upload camera frames. No analytics or runtime CDN dependencies are included.

The previous sample building, marker files and developer tools remain in the repository as reference material. The current launcher does not open marker mode. Synced project references under `sources/` remain read-only and are excluded from version control.
