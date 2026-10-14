const startButton=document.querySelector('#start');
const nativeLink=document.querySelector('#native-floor');
const status=document.querySelector('#launch-status');
const support=document.querySelector('#floor-support');
const arUI=document.querySelector('#ar-ui');
const stage=document.querySelector('#ar-stage');
const replayButton=document.querySelector('#replay');
const resetButton=document.querySelector('#reset');
let runtime,starting=false,running=false,cancelled=false,nativeAvailable=false;
function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
function leaveAR(text='',stop=true){
 running=false;cancelled=true;if(stop)runtime?.stop();
 document.body.classList.remove('is-ar');arUI.hidden=true;stage.setAttribute('aria-hidden','true');
 message(text);startButton.focus({preventScroll:true});
}
startButton.addEventListener('click',async()=>{
 if(starting||running||!runtime)return;
 starting=true;cancelled=false;startButton.disabled=true;
 document.body.classList.add('is-ar');arUI.hidden=false;stage.setAttribute('aria-hidden','false');
 replayButton.disabled=true;resetButton.disabled=true;
 document.querySelector('#tracking-status').textContent='Finding the floor…';document.querySelector('#tracking-status').hidden=false;
 document.querySelector('#scan-hint').textContent='Aim at the floor and move slowly. Tap the blue ring to build.';
 try{
  const opened=await runtime.start(stage,arUI,{
   onStatus:({surfaceFound,placed,tracking})=>{
    const label=document.querySelector('#tracking-status');
    label.textContent=!tracking?'Tracking paused · move slowly':placed?'Placed on the floor':surfaceFound?'Tap the blue ring to build':'Finding the floor…';
    label.classList.toggle('found',placed||surfaceFound);label.hidden=placed&&tracking;
    replayButton.disabled=!placed;resetButton.disabled=!placed;
    document.querySelector('#scan-hint').textContent=placed?'': 'Aim at the floor and move slowly. Tap the blue ring to build.';
   },
   onEnd:()=>leaveAR('AR closed. Ready to place again.',false),
  });
  if(cancelled){runtime.stop();return;}
  running=opened;message('');document.querySelector('#stop').focus();
 }catch(error){
  leaveAR('',false);message(error?.message||'Floor AR could not start.',true);
  if(nativeAvailable){startButton.hidden=true;nativeLink.hidden=false;support.textContent='Continue with your phone’s native floor AR viewer.';nativeLink.focus({preventScroll:true});}
 }
 finally{starting=false;startButton.disabled=false;}
});
document.querySelector('#stop').addEventListener('click',()=>leaveAR('AR closed. Ready to place again.'));
replayButton.addEventListener('click',()=>runtime?.replay());
resetButton.addEventListener('click',()=>runtime?.reset());
arUI.addEventListener('beforexrselect',event=>{if(event.target.closest('button,a'))event.preventDefault();});
nativeLink.addEventListener('click',()=>message('Opening floor AR. Aim at the floor and use the viewer’s placement controls.'));
async function detectFloorSupport(){
 const probe=document.createElement('a');const quickLook=probe.relList?.supports?.('ar');
 const android=/Android/i.test(navigator.userAgent);nativeAvailable=quickLook||android;
 if(quickLook){nativeLink.rel='ar';nativeLink.href=new URL('assets/floor-building.usdz?v=20261014-ground#allowsContentScaling=0',document.baseURI).href;}
 else if(android){
  const file=new URL('assets/floor-building.glb?v=20261014-ground',document.baseURI).href;
  const fallback=new URL('./?native-ar=unavailable',document.baseURI).href;
  nativeLink.href=`intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(file)}&mode=ar_only&resizable=false&title=iNXT%20Tower#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback)};end;`;
 }
 try{
  if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar')){
   runtime=await import('./floor-ar.js?v=20261014-ground');startButton.hidden=false;startButton.disabled=false;
   support.textContent='Find the floor, tap the blue ring, and watch it rise. Maximum height: 30 cm.';
  }else{
   startButton.hidden=true;nativeLink.hidden=!nativeAvailable;
   support.textContent=nativeAvailable?'Floor placement opens in your phone’s AR viewer. The blue construction scan is included; use the viewer’s playback controls.':'Floor AR is not available in this browser. Open this page in Safari on a supported iPhone or Chrome on an ARCore Android phone.';
  }
 }catch{
  startButton.hidden=true;nativeLink.hidden=!nativeAvailable;
  support.textContent=nativeAvailable?'Open floor AR with your phone’s native viewer.':'Floor AR could not be checked on this device.';
 }
 if(new URLSearchParams(location.search).has('native-ar'))message('The native AR viewer could not open. Check that this phone supports AR and its AR services are installed.',true);
}
detectFloorSupport();
window.addEventListener('pagehide',()=>{cancelled=true;runtime?.stop();});
window.addEventListener('unhandledrejection',event=>{if(running){event.preventDefault();leaveAR();message('AR stopped unexpectedly. Close other camera apps and try again.',true);}});
