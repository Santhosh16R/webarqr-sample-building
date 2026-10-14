# Webarqr — mobile WebAR guide

## Floor placement and larger models

The site now offers **floor placement** as well as marker tracking. It checks capabilities at runtime rather than assuming that every Android or iPhone browser supports WebXR.

| Mode | Placement | Blue construction animation | Controls |
| --- | --- | --- | --- |
| WebXR on a compatible phone/browser | Horizontal-surface hit testing; optional XR anchors | Yes | Browser X/Y rotation, replay, size and reposition |
| Apple AR Quick Look fallback | Native floor/surface placement from USDZ | The browser shader animation is not included | Native move/rotate controls; fixed 30 cm upright height |
| Android Scene Viewer fallback | Native floor/surface placement from GLB when available | The browser shader animation is not included | Native controls; resizing disabled; 30 cm upright height |
| Marker mode | Relative to the measured image marker | Yes | Width in centimetres; upright height capped at 30 cm |

For the **vertical marker → ground nearby** flow:

1. Show or print the marker vertically. Use **Start camera** to scan it.
2. Once it is recognized, tap **Place on floor nearby** on compatible WebXR devices, or **Place on floor · native viewer** where offered.
3. In WebXR, aim at the floor beside the marker. Move the phone slowly until the blue ring appears, then tap **Place building**. In a native viewer, use the viewer's AR placement controls.
4. The building is now placed in the AR world and no longer requires the marker to stay in view. In WebXR it rises with the blue construction effect.

The floor spot is chosen by the user. The marker's coordinates are not transferred automatically between the MindAR camera session and the WebXR/native session. A vertical marker by itself cannot tell the browser where the physical floor is.

WebXR accepts only approximately horizontal hit poses, rejecting a vertical wall/marker. It can also accept a tabletop: choose the actual ground with the reticle. Both browser modes use a **5–34.5 cm width** slider, defaulting to **30 cm wide**. Aspect ratio is preserved, so upright height stays at or below **30 cm** (about 26.1 cm at the default width). The cap describes the building's upright dimensions; X/Y rotation changes its orientation.

In marker mode, centimetres require the physical image width: enter it in **Marker image width (cm)** before starting. Measure the full tracking image, not the paper margin. The provided print layout is 15 cm wide; a marker displayed on another screen may have a different width. Floor WebXR uses metre-based tracking and converts the centimetre slider to metres automatically.

Native assets are `docs/assets/floor-building.glb` and `floor-building.usdz`, both authored at **30 cm upright height** (about 34.5 cm wide). Native scaling is disabled using Quick Look's `allowsContentScaling=0` and Scene Viewer's `resizable=false`. Regenerate with `npm ci` followed by `npm run native:build`; validate with `npm run native:check`, `node scripts/check_model_size.mjs`, and `npm run web:check`. These native assets are separate from the original GLB.

Phone hardware testing is still required: a desktop browser cannot verify ARCore floor detection or Apple Quick Look placement. The static checks verify the native GLB and USDZ archive, units, alignment and horizontal anchoring; browser checks cover placement rules and marker-mode regression.

Open the page on your phone, allow camera access, and point it at the included **Building 01** marker. A three-storey commercial building appears anchored to the image. No app installation is required.

The application is in `docs/`, ready for HTTPS static hosting or GitHub Pages. The original model and generation tools remain in `outputs/`.

## Use marker mode on your phone

1. Open the published WebAR URL directly in **Safari on iPhone** or **Chrome on Android**.
2. On a second device, open `marker.html`, or print `docs/assets/building-marker.png`. Use the whole image; it is an image target, not a QR code.
3. Place the marker flat in even light. Avoid glare on the paper or second screen.
4. On your phone, tap **Start camera** and allow camera access.
5. Frame the whole marker from about 30–60 cm away. Move slowly until the building appears.
6. The building rises smoothly from the ground with a blue scan ring, illuminated edges, and blue window lights. The reveal takes about five seconds and pauses if the marker is lost.
7. Use **Building size**, **Rotate X 90°**, or **Rotate Y 90°** to explore it. **Replay build** repeats the construction reveal; **Reset view** restores both rotation axes and the default size. **Close camera** releases the camera. Leaving the page also pauses the experience.

The marker must be on paper or another screen; a phone cannot scan an image displayed on its own screen.

Camera frames are processed locally in the browser. This application does not record or upload them. Runtime libraries and assets are served from the same site; no analytics or runtime CDN dependencies are included.

Tracking uses additional position/quaternion smoothing and a small stationary deadband to reduce shake. This introduces a slight follow delay during camera movement. A sharp, flat printed marker in even light gives better results than a reflective screen. Keep the full marker visible and move slowly; smoothing cannot recover tracking features hidden by glare, blur or occlusion.

## Publish with GitHub Pages

For `Santhosh16R/webarqr-sample-building`, the live Pages URL is:

[Open the WebAR page](https://santhosh16r.github.io/webarqr-sample-building/) · [Open or print the marker](https://santhosh16r.github.io/webarqr-sample-building/marker.html)

The site is published from `main` → `/docs`. To reproduce this deployment in another repository:

1. Push the complete repository to GitHub.
2. In **Settings → Pages**, select **Deploy from a branch**.
3. Select branch **main**, folder **/docs**, and save.
4. Wait for the Pages deployment, then open the HTTPS URL shown in Settings.

On GitHub Free, Pages requires a public repository. Private repository support depends on the account plan. The website and model are publicly accessible when published with this setup.

All paths are relative, so the site works beneath a GitHub repository URL. To use another static host, upload the **contents of `docs/`**, including `vendor/` and `assets/`. No build command is needed.

## Preview locally

With Python 3.10+ installed:

```sh
python -m http.server 8000 --directory docs --bind 127.0.0.1
```

Open `http://localhost:8000` on the same computer. Desktop localhost is permitted for camera development. A phone accessing a computer's plain HTTP LAN address does not have a secure camera context; use the published HTTPS site for phone testing. Opening `index.html` with `file://` is unsupported.

## Replace the model

Replace `docs/assets/sample-building.glb` with a self-contained, Y-up GLB. Adjust the default scale in `docs/ar.js` and the slider values in `docs/index.html` and `docs/app.js` if the new model has different dimensions.

The supplied model is 11.4 × 9.9 × 8.8 metres, has its origin at the base centre, and has 1,668 triangles and seven material primitives. Its GLB validation report has zero errors and warnings. The model's Y-up axis is rotated outward from the marker plane so the building stands on a marker placed on a table.

## Replace or recompile the marker

The shipped `building-marker.png` and `building-targets.mind` are a matching pair, with target index **0**. Changing the PNG alone will not update tracking.

1. Put the new target image at `docs/assets/building-marker.png`.
2. Run `python tools/preview_server.py`.
3. Open `http://127.0.0.1:8765/tools/compile.html` and select **Compile marker**.
4. Wait for the success message. The loopback-only development server writes `docs/assets/building-targets.mind`.
5. Commit and deploy both files together.

The local compiler and server are developer tools; only `docs/` is published. Do not expose the development server on a public network. `scripts/prepare_web_assets.py` recreates the original project marker and copies the building assets; recompile the target afterwards if you run it.

## Validation and checks

Install dependencies to regenerate or validate the GLB:

```sh
python -m pip install -r requirements.txt
npm ci
npm run build
npm run validate
npm run package
```

The original bundle is [sample-building.zip](outputs/sample-building.zip); the model is [sample-building.glb](outputs/sample-building.glb). The validator uses the [official Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator).

For WebAR development, run `python tools/preview_server.py` and open:

- `/tools/verify.html` — loads the real GLB, checks its orientation, imports the compiled target, and verifies image matching and tracking points at two angles.
- `/tools/lifecycle.html` — runs the real application in a narrow frame with a synthetic canvas camera, without accessing a hardware camera. Use it to check acquisition, loss, reacquisition, camera close/restart, and controls.
- `/tools/stability-checks.html` — tests stationary pose noise, deliberate movement, marker loss/reacquisition and invalid-pose rejection. Its noise-reduction number is synthetic and does not predict a particular phone's result.
- `/tools/floor-checks.html` — tests horizontal-surface filtering, world placement, upright orientation, marker-independent visibility, and repositioning. It does not emulate a phone's physical plane detection.

Browser checks do not replace a physical iPhone/Android test. Test camera permission denied/allowed, marker acquisition in daylight, marker loss and reacquisition, portrait/landscape, resizing/rotation, closing/reopening the camera, and returning after switching apps. Performance varies with the phone, lighting, and printed marker quality.

## Files

| Location | Purpose |
| --- | --- |
| `docs/index.html`, `styles.css`, `app.js` | Mobile page and camera controls |
| `docs/ar.js` | MindAR / Three.js integration and building placement |
| `docs/marker.html` | Printable, downloadable image marker |
| `docs/assets/` | GLB, preview, marker PNG and compiled `.mind` target |
| `docs/vendor/` | Pinned MindAR 1.2.5 and Three.js 0.147.0 modules and licences |
| `outputs/` | Original building assets, generator, validator, and reports |
| `scripts/` | Asset preparation, dependency downloads, static checks and packaging |
| `tools/` | Local marker compiler and browser verification pages |

The camera integration follows the [MindAR Three.js API](https://github.com/hiukim/mind-ar-js/blob/v1.2.5/src/image-target/three.js). Third-party notices are in `docs/THIRD_PARTY_NOTICES.md`. Synced ChatGPT references, machine-specific context, local packages, and caches are excluded from version control.
