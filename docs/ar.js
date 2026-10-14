import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MindARThree} from './vendor/mindar/mindar-image-three.prod.js';

let engine;
let building;
let pivot;
let anchor;
let needsReload = false;
let cameraPending = false;
let runId = 0;
let reportTracking = () => {};
const assetURL = filename => new URL(`assets/${filename}`, import.meta.url).href;

async function prepare(container) {
  if (engine) return;
  const gltf = await new GLTFLoader().loadAsync(assetURL('sample-building.glb'));
  // Preflight the target so HTTP errors are caught before the camera opens.
  const response = await fetch(assetURL('building-targets.mind'));
  if (!response.ok) throw new Error('The marker could not load. Refresh this page and try again.');
  await response.arrayBuffer();
  try {
    engine = new MindARThree({container, imageTargetSrc:assetURL('building-targets.mind'), maxTrack:1,
      uiLoading:'no', uiScanning:'no', uiError:'no', filterMinCF:0.001, filterBeta:1000, warmupTolerance:5, missTolerance:8});
  } catch {
    throw new Error('This browser could not start 3D graphics. Try Safari on iPhone or Chrome on Android.');
  }
  engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  engine.scene.add(new THREE.HemisphereLight(0xffffff, 0x607367, 1.35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(2,3,5);
  engine.scene.add(sun);
  anchor = engine.addAnchor(0);
  anchor.onTargetFound = () => reportTracking(true);
  anchor.onTargetLost = () => reportTracking(false);
  // The marker lies in XY; turn the model's Y-up axis outward along +Z.
  const ground = new THREE.Group();
  ground.rotation.x = Math.PI / 2;
  pivot = new THREE.Group();
  building = gltf.scene;
  pivot.add(building);
  ground.add(pivot);
  anchor.group.add(ground);
  reset();
}

export async function start(container, onProgress, onTracking) {
  if (needsReload) throw new Error('Please refresh this page before starting the camera again.');
  const id = ++runId;
  reportTracking = onTracking;
  await prepare(container);
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
    engine.renderer.setAnimationLoop(() => engine.renderer.render(engine.scene,engine.camera));
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
  }
  if (anchor) {anchor.group.visible = false; anchor.visible = false;}
}
export function stop() {++runId; if (cameraPending) needsReload = true; cleanup();}
export function setScale(value) {if (building) building.scale.setScalar(THREE.MathUtils.clamp(value, .025, .09));}
export function rotate() {if (pivot) pivot.rotation.y += Math.PI/2;}
export function reset() {if (pivot) pivot.rotation.y = 0; setScale(.05);}
