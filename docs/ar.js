import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MindARThree} from './vendor/mindar/mindar-image-three.prod.js';
import {createRotationControls} from './building-effects.js?v=20261014-blue';
import {createPoseStabilizer} from './pose-stabilizer.js?v=20261014-stable';
import {createTowerAnimation,showTowerProgress} from './tower-animation.js?v=20261014-tower';
import {DEFAULT_WIDTH_CM,clampWidthCm,clampMarkerWidthCm,markerScaleFromWidthCm} from './model-size.js?v=20261014-tower';

let engine;
let building;
let pivot;
let anchor;
let stableAnchor;
let poseStabilizer;
let construction;
let lastFrame;
let rotationControls;
let needsReload = false;
let cameraPending = false;
let runId = 0;
let reportTracking = () => {};
let markerWidthCm = 15;
let buildingWidthCm = DEFAULT_WIDTH_CM;
const assetURL = filename => new URL(`assets/${filename}`, import.meta.url).href;

async function prepare(container) {
  if (engine) return;
  const gltf = await new GLTFLoader().loadAsync(assetURL('iNXT_Tower_Animated.glb'));
  // Preflight the target so HTTP errors are caught before the camera opens.
  const response = await fetch(assetURL('building-targets.mind'));
  if (!response.ok) throw new Error('The marker could not load. Refresh this page and try again.');
  await response.arrayBuffer();
  try {
    engine = new MindARThree({container, imageTargetSrc:assetURL('building-targets.mind'), maxTrack:1,
      uiLoading:'no', uiScanning:'no', uiError:'no', filterMinCF:0.0005, filterBeta:100, warmupTolerance:5, missTolerance:8});
  } catch {
    throw new Error('This browser could not start 3D graphics. Try Safari on iPhone or Chrome on Android.');
  }
  engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  engine.scene.add(new THREE.HemisphereLight(0xffffff, 0x607367, 1.35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(2,3,5);
  engine.scene.add(sun);
  anchor = engine.addAnchor(0);
  stableAnchor = new THREE.Group();
  engine.scene.add(stableAnchor);
  poseStabilizer = createPoseStabilizer(stableAnchor);
  anchor.onTargetFound = () => reportTracking(true);
  anchor.onTargetLost = () => reportTracking(false);
  // The marker lies in XY; turn the model's Y-up axis outward along +Z.
  const ground = new THREE.Group();
  ground.rotation.x = Math.PI / 2;
  pivot = new THREE.Group();
  rotationControls = createRotationControls(pivot);
  construction = createTowerAnimation(gltf,{onProgress:showTowerProgress});
  building = construction.model;
  pivot.add(building);
  ground.add(pivot);
  stableAnchor.add(ground);
  reset();
}

export async function start(container, onProgress, onTracking) {
  if (needsReload) throw new Error('Please refresh this page before starting the camera again.');
  const id = ++runId;
  reportTracking = onTracking;
  await prepare(container);
  reset();
  if (id !== runId) throw new Error('Camera startup was cancelled. Please try again.');
  onTracking(false);
  onProgress('Allow camera access when your browser asks.');
  let timer;
  let rejectStartup;
  const failure = new Promise((_,reject) => {rejectStartup = reject;});
  const fail = event => {
    event.preventDefault();
    rejectStartup(new Error('AR could not finish loading. Refresh the page and try again.'));
  };
  window.addEventListener('unhandledrejection', fail);
  cameraPending = true;
  const startup = engine.start().finally(() => {cameraPending = false;}).then(() => {
    if (id !== runId) cleanup();
  });
  try {
    await Promise.race([startup, failure, new Promise((_,reject) => {
      timer = setTimeout(() => {
        needsReload = true;
        reject(new Error('Camera startup took too long. Check camera permissions, refresh this page, and try again.'));
      }, 60000);
    })]);
    if (id !== runId) throw new Error('Camera startup was cancelled. Please try again.');
    replay();
    poseStabilizer.reset();
    lastFrame = undefined;
    engine.renderer.setAnimationLoop(time => {
      const seconds = lastFrame === undefined ? 0 : Math.min((time-lastFrame)/1000, .1);
      lastFrame = time;
      poseStabilizer.update(anchor.group.matrix,seconds,anchor.group.visible);
      if (anchor.group.visible) construction.update(seconds);
      rotationControls.update(seconds);
      engine.renderer.render(engine.scene,engine.camera);
    });
  } catch (error) {
    stop();
    throw error || new Error('Camera access was blocked or no camera was found. Allow camera access in site settings, then try again.');
  } finally {
    clearTimeout(timer);
    window.removeEventListener('unhandledrejection', fail);
  }
}

function cleanup() {
  if (!engine) return;
  engine.renderer.setAnimationLoop(null);
  if (engine.controller) {
    engine.controller.stopProcessVideo();
    engine.controller.dispose();
    engine.controller = null;
  }
  const video = engine.video;
  if (video) {
    video.srcObject?.getTracks().forEach(track => track.stop());
    video.pause();
    video.srcObject = null;
    video.remove();
    engine.video = null;
  }
  if (anchor) {anchor.group.visible = false; anchor.visible = false;}
  poseStabilizer?.reset();
}
export function stop() {++runId; if (cameraPending) needsReload = true; cleanup();}
export function setScale(value) {buildingWidthCm=clampWidthCm(value);if (building) building.scale.setScalar(markerScaleFromWidthCm(buildingWidthCm,markerWidthCm));}
export function setMarkerWidth(value) {markerWidthCm=clampMarkerWidthCm(value);setScale(buildingWidthCm);}
export function rotate(axis = 'y') {rotationControls?.rotate(axis);}
export function replay() {construction?.replay();}
export function reset() {rotationControls?.reset(); setScale(DEFAULT_WIDTH_CM);}
