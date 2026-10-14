const startButton = document.querySelector('#start');
const startLabel = document.querySelector('#start-label');
const launchStatus = document.querySelector('#launch-status');
const arUI = document.querySelector('#ar-ui');
const stage = document.querySelector('#ar-stage');
let runtime;
let starting = false;
let running = false;

function setStatus(message, error = false) {
  launchStatus.textContent = message;
  launchStatus.classList.toggle('error', error);
}
function leaveAR(message = '') {
  running = false;
  runtime?.stop();
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
  startButton.disabled = true;
  startLabel.textContent = 'Getting ready…';
  setStatus('Loading the building and preparing your camera…');
  try {
    runtime ??= await import('./ar.js');
    await runtime.start(stage, message => setStatus(message), found => {
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
document.querySelector('#size').addEventListener('input', event => runtime?.setScale(Number(event.target.value)));
document.querySelector('#rotate').addEventListener('click', () => runtime?.rotate());
document.querySelector('#reset').addEventListener('click', () => {
  runtime?.reset();
  document.querySelector('#size').value = '0.05';
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) leaveAR('Camera paused while the page was away. Tap Start camera to return.');
});
window.addEventListener('pagehide', () => runtime?.stop());
window.addEventListener('unhandledrejection', event => {
  if (running) {
    event.preventDefault();
    leaveAR();
    setStatus('AR stopped unexpectedly. Close other camera apps and try again.', true);
  }
});
