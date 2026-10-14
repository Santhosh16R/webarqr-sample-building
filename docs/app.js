import {DEFAULT_WIDTH_CM,MAX_WIDTH_CM,clampWidthCm,clampMarkerWidthCm,heightFromWidthCm} from './model-size.js?v=20261014-tower';
const startButton = document.querySelector('#start');
const startLabel = document.querySelector('#start-label');
const launchStatus = document.querySelector('#launch-status');
const arUI = document.querySelector('#ar-ui');
const stage = document.querySelector('#ar-stage');
let runtime;
let starting = false;
let running = false;
let activeMode = 'marker';
let floorRuntime;
let markerSeen = false;
let nativeAvailable = false;
const floorButton = document.querySelector('#floor-start');
const nativeLinks = [document.querySelector('#native-floor'),document.querySelector('#native-floor-marker')];

function updateFloorTransfers() {
  document.querySelector('#switch-floor').hidden = !floorRuntime || activeMode !== 'marker';
  document.querySelector('#switch-floor').disabled = !markerSeen;
  nativeLinks[1].hidden = !nativeAvailable || activeMode !== 'marker' || !markerSeen;
}
function configureMode(mode) {
  activeMode = mode;
  const size = document.querySelector('#size');
  const floor = mode === 'floor';
  size.min = '5';size.max = String(MAX_WIDTH_CM);
  size.step = '.1';size.value = String(DEFAULT_WIDTH_CM);
  document.querySelector('label[for="size"]').textContent = 'Building width (cm)';
  updateSizeReadout();
  document.querySelector('#place-floor').hidden = !floor;
  document.querySelector('#move-floor').hidden = true;
  updateFloorTransfers();
}
function updateSizeReadout() {
  const width=clampWidthCm(Number(document.querySelector('#size').value));
  document.querySelector('#size-readout').textContent=`Width ${width.toFixed(1)} cm · upright height ${heightFromWidthCm(width).toFixed(1)} cm (max 30 cm)`;
}

function setStatus(message, error = false) {
  launchStatus.textContent = message;
  launchStatus.classList.toggle('error', error);
}
function leaveAR(message = '', stopRuntime = true) {
  running = false;
  if (stopRuntime) runtime?.stop();
  document.body.classList.remove('is-ar');
  arUI.hidden = true;
  stage.setAttribute('aria-hidden', 'true');
  setStatus(message);
  startButton.focus({preventScroll:true});
}
startButton.addEventListener('click', async () => {
  if (starting || running) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    setStatus('Camera access needs HTTPS. Open the published page in Safari on iPhone or Chrome on Android.', true);
    return;
  }
  starting = true;
  markerSeen = false;
  configureMode('marker');
  startButton.disabled = true;
  startLabel.textContent = 'Getting ready…';
  setStatus('Loading the building and preparing your camera…');
  try {
    runtime = await import('./ar.js?v=20261014-tower');
    runtime.setMarkerWidth(Number(document.querySelector('#marker-width').value));
    await runtime.start(stage, message => setStatus(message), found => {
      if (activeMode !== 'marker') return;
      if (found) markerSeen = true;
      updateFloorTransfers();
      const status = document.querySelector('#tracking-status');
      status.textContent = found ? 'Marker found · building in view' : 'Looking for the marker';
      status.classList.toggle('found', found);
      document.querySelector('#scan-guide').hidden = found;
      document.querySelector('#scan-hint').textContent = found ? 'Move slowly to explore. Keep the marker in view.' : 'Fit the whole marker in view. Hold steady.';
    });
    if (document.hidden) {
      runtime.stop();
      setStatus('Camera paused while the page was away. Tap Start camera to return.');
      return;
    }
    running = true;
    document.body.classList.add('is-ar');
    stage.setAttribute('aria-hidden', 'false');
    arUI.hidden = false;
    document.querySelector('#stop').focus();
    setStatus('');
  } catch (error) {
    runtime?.stop();
    setStatus(error?.message || 'Could not open the camera. Allow camera access in site settings, then try again.', true);
  } finally {
    starting = false;
    startButton.disabled = false;
    startLabel.textContent = 'Start camera';
  }
});
document.querySelector('#stop').addEventListener('click', () => leaveAR('Camera closed. Ready when you are.'));
document.querySelector('#size').addEventListener('input', event => {runtime?.setScale(Number(event.target.value));updateSizeReadout();});
document.querySelector('#marker-width').addEventListener('change',event=>{
  const width=clampMarkerWidthCm(Number(event.target.value));event.target.value=String(width);
  if(activeMode==='marker')runtime?.setMarkerWidth?.(width);
});
document.querySelector('#rotate-x').addEventListener('click', () => runtime?.rotate('x'));
document.querySelector('#rotate-y').addEventListener('click', () => runtime?.rotate('y'));
document.querySelector('#replay').addEventListener('click', () => runtime?.replay());
document.querySelector('#reset').addEventListener('click', () => {
  runtime?.reset();
  document.querySelector('#size').value = String(DEFAULT_WIDTH_CM);
  updateSizeReadout();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && running && activeMode === 'marker') leaveAR('Camera paused while the page was away. Tap Start camera to return.');
});

async function startFloor() {
  if (starting || !floorRuntime) return;
  starting = true;floorButton.disabled = true;
  runtime?.stop();running = false;
  configureMode('floor');
  runtime = floorRuntime;
  document.body.classList.add('is-ar');arUI.hidden = false;stage.setAttribute('aria-hidden','false');
  document.querySelector('#scan-guide').hidden = true;
  document.querySelector('#tracking-status').textContent = 'Opening floor detection…';
  document.querySelector('#scan-hint').textContent = 'Move your phone slowly over the floor beside the marker.';
  document.querySelector('#place-floor').disabled = true;
  try {
    const opened = await floorRuntime.start(stage,arUI,{
      onStatus:({surfaceFound,placed,tracking})=>{
        const status=document.querySelector('#tracking-status');
        status.textContent = !tracking ? 'Tracking paused · move slowly' : placed ? 'Building placed · marker no longer needed' : surfaceFound ? 'Horizontal surface found · tap Place building' : 'Looking for a horizontal surface';
        status.classList.toggle('found',placed||surfaceFound);
        document.querySelector('#place-floor').hidden=placed;
        document.querySelector('#place-floor').disabled=!surfaceFound;
        document.querySelector('#move-floor').hidden=!placed;
        document.querySelector('#scan-hint').textContent=placed?'Walk around the building. Resize or rotate it below.':'Aim at the floor beside the marker. Wait for the blue ring, then place.';
      },
      onEnd:()=>leaveAR('Floor AR closed. You can open it again or scan a marker.',false),
    });
    running=opened;
  } catch(error) {
    leaveAR('',false);
    setStatus(error?.message || 'Floor AR could not start. Try the native floor viewer or marker mode.',true);
  } finally {starting=false;floorButton.disabled=false;}
}
floorButton.addEventListener('click',startFloor);
document.querySelector('#switch-floor').addEventListener('click',startFloor);
document.querySelector('#place-floor').addEventListener('click',()=>floorRuntime?.place());
document.querySelector('#move-floor').addEventListener('click',()=>floorRuntime?.reposition());
arUI.addEventListener('beforexrselect',event=>{if(event.target.closest('button,a,input,label'))event.preventDefault();});
for (const link of nativeLinks) link.addEventListener('click',()=>{if(running)leaveAR('Opening your phone’s native AR viewer.');});

async function detectFloorSupport() {
  const support=document.querySelector('#floor-support');
  const probe=document.createElement('a');
  const quickLook=probe.relList?.supports?.('ar');
  const android=/Android/i.test(navigator.userAgent);
  if (quickLook || android) {
    nativeAvailable=true;
    for(const link of nativeLinks){
      if(quickLook){link.rel='ar';link.href=new URL('assets/floor-building.usdz?v=20261014-tower#allowsContentScaling=0',location.href).href;}
      else {
        const model=new URL('assets/floor-building.glb?v=20261014-tower',location.href).href;
        const fallback=new URL('./?native-ar=unavailable',location.href).href;
        link.href=`intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(model)}&mode=ar_preferred&resizable=false&title=iNXT%20Tower#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback)};end;`;
      }
    }
    nativeLinks[0].hidden=false;
  }
  try {
    if (navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')) {
      floorRuntime=await import('./floor-ar.js?v=20261014-tower');
      floorButton.disabled=false;floorButton.textContent='Place on floor';
      support.textContent='Animated floor placement is available. Scan the marker first, or place directly.';
    }else{
      floorButton.hidden=true;
      support.textContent=nativeAvailable?'Native floor viewer: animated tower, maximum 30 cm upright height. Use the viewer’s playback controls to replay.':'This browser does not offer floor AR. Marker mode still works with camera access.';
    }
  }catch{
    floorButton.hidden=true;support.textContent='Floor AR could not be checked. Try the native floor viewer, or use marker mode.';
  }
  updateFloorTransfers();
}
detectFloorSupport();
window.addEventListener('pagehide', () => runtime?.stop());
window.addEventListener('unhandledrejection', event => {
  if (running) {
    event.preventDefault();
    leaveAR();
    setStatus('AR stopped unexpectedly. Close other camera apps and try again.', true);
  }
});
