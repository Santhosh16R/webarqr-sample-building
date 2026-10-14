import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createSurfacePlacement} from './surface-placement.js?v=20261014-crew';
import {createTowerAnimation,showTowerProgress} from './tower-animation.js?v=20261014-crew';
import {DEFAULT_WIDTH_CM,floorScaleFromWidthCm} from './model-size.js?v=20261014-crew';

let current;
const url = filename => new URL(`assets/${filename}`,import.meta.url).href;

export async function start(container,overlay,{onStatus,onEnd}) {
  // Called directly from a user click, before any asset-loading awaits.
  const sessionPromise = navigator.xr.requestSession('immersive-ar',{
    requiredFeatures:['local','hit-test','dom-overlay'], optionalFeatures:['anchors'], domOverlay:{root:overlay},
  });
  let session;
  try {session = await sessionPromise;}
  catch(error){throw new Error(error?.name==='NotAllowedError'?'Allow AR access in your browser, then try floor placement again.':'Animated floor AR is not available in this browser. Try the native floor viewer.');}
  const state={session,onEnd,anchor:null,hit:null,ended:false,placementRevision:0};current=state;
  session.addEventListener('end',()=>cleanup(state),{once:true});
  try {
    const renderer = state.renderer = new THREE.WebGLRenderer({alpha:true,antialias:true});
    renderer.outputEncoding=THREE.sRGBEncoding;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.5));
    renderer.setSize(container.clientWidth,container.clientHeight);
    renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
    container.appendChild(renderer.domElement);
    const scene=state.scene=new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff,0x607367,1.35));
    const light=new THREE.DirectionalLight(0xffffff,1.2);light.position.set(2,3,5);scene.add(light);
    const camera=state.camera=new THREE.PerspectiveCamera();
    const root=state.root=new THREE.Group();scene.add(root);
    const pivot=state.pivot=new THREE.Group();root.add(pivot);

    state.placement=createSurfacePlacement(root);
    const gltf=await new GLTFLoader().loadAsync(url('iNXT_Tower_Construction.glb?v=20261014-crew'));
    const model=state.model=gltf.scene;
    if(state.ended) {disposeObject(model);return false;}
    state.effects=createTowerAnimation(gltf,{onProgress:showTowerProgress});state.model=state.effects.model;
    pivot.add(state.model);state.model.scale.setScalar(floorScaleFromWidthCm(DEFAULT_WIDTH_CM));
    const reticle=state.reticle=new THREE.Mesh(new THREE.RingGeometry(.12,.15,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x36b8ff,side:THREE.DoubleSide}));
    reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
    await renderer.xr.setSession(session);
    if(state.ended)return false;
    const reference=state.reference=renderer.xr.getReferenceSpace();
    const viewer=await session.requestReferenceSpace('viewer');
    state.hit=await session.requestHitTestSource({space:viewer});
    if(state.ended){state.hit?.cancel();return false;}
    let previousTime;
    let lastStatus='';
    state.report = (surfaceFound,tracking=true)=>{
      const status={surfaceFound,placed:state.placement.placed,tracking};const key=JSON.stringify(status);
      if(key!==lastStatus){lastStatus=key;onStatus(status);}
    };
    session.addEventListener('select',()=>{if(current===state)place();});
    renderer.setAnimationLoop((time,frame)=>{
      if(!frame||state.ended)return;
      const seconds=previousTime===undefined?0:Math.min((time-previousTime)/1000,.1);previousTime=time;
      const viewerPose=frame.getViewerPose(reference);
      if(!viewerPose){reticle.visible=false;state.lastHit=null;state.pendingPlace=false;state.placement.update(null);state.report(false,false);return;}
      state.viewerPosition=new THREE.Vector3().copy(viewerPose.transform.position);
      let found=false;
      if(!state.placement.placed){
        const hits=frame.getHitTestResults(state.hit);
        state.lastHit=null;
        for(const hit of hits){
          const pose=hit.getPose(reference);
          if(pose&&state.placement.update(new THREE.Matrix4().fromArray(pose.transform.matrix))){
            reticle.matrix.fromArray(pose.transform.matrix);state.lastHit=hit;found=true;break;
          }
        }
        if(!found)state.placement.update(null);
        reticle.visible=found;
        if(state.pendingPlace){state.pendingPlace=false;if(found)commitPlacement(state);}
      }else{
        if(state.anchor){
          const pose=frame.getPose(state.anchor.anchorSpace,reference);
          if(pose)root.position.lerp(new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(pose.transform.matrix)),.3);
        }
        state.effects.update(seconds);
      }
      state.report(found);
      renderer.render(scene,camera);
    });
    state.report(false);
    return true;
  } catch(error) {
    await session.end().catch(()=>{});cleanup(state);
    throw new Error(error?.message || 'Floor detection could not start on this device. Try the native floor viewer.');
  }
}

export function place(){
  const state=current;
  if(!state?.lastHit||state.placement.placed)return false;
  state.pendingPlace=true;return true;
}
function commitPlacement(state){
  if(!state?.viewerPosition||state.placement.placed||!state.placement.place(state.viewerPosition))return false;
  state.effects.replay();state.reticle.visible=false;state.report(false);
  const revision=++state.placementRevision;
  if(state.lastHit?.createAnchor){
    state.lastHit.createAnchor().then(anchor=>{if(state.ended||revision!==state.placementRevision||!state.placement.placed)anchor.delete();else state.anchor=anchor;}).catch(()=>{});
  }
}
export function reposition(){
  if(!current)return;++current.placementRevision;current.anchor?.delete();current.anchor=null;current.placement.reset();current.report(false);
}
export function replay(){if(current?.placement.placed)current.effects.replay();}
export function reset(){
 if(!current)return;
 current.pendingPlace=false;current.lastHit=null;
 current.effects.replay();current.model.scale.setScalar(floorScaleFromWidthCm(DEFAULT_WIDTH_CM));
 reposition();
}
export function stop(){current?.session.end().catch(()=>{if(current)cleanup(current);});}
function disposeObject(object){object.traverse(child=>{child.geometry?.dispose();if(child.material){for(const material of [].concat(child.material))material.dispose();}});}
function cleanup(state){
  if(state.ended)return;state.ended=true;state.hit?.cancel();state.anchor?.delete();
  state.effects?.dispose();
  state.renderer?.setAnimationLoop(null);if(state.scene)disposeObject(state.scene);
  state.renderer?.dispose();state.renderer?.domElement.remove();
  if(current===state)current=null;state.onEnd();
}
