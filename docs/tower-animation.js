import * as THREE from 'three';

// Keep sizing/ground placement on a wrapper: the clip owns the original nodes.
export function createTowerAnimation(gltf,{onProgress=()=>{}}={}) {
  const model=new THREE.Group();
  const offset=new THREE.Group();offset.position.y=.6499999761581421;
  offset.add(gltf.scene);model.add(offset);
  const mixer=new THREE.AnimationMixer(gltf.scene);
  const actions=gltf.animations.map(clip=>{
    const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;return action;
  });
  if(!actions.length)throw new Error('The tower construction animation is missing.');
  function state(){return {time:actions[0].time,duration:actions[0].getClip().duration,finished:actions.every(action=>action.paused)};}
  function replay(){mixer.stopAllAction();for(const action of actions)action.reset().play();mixer.update(0);onProgress(state());}
  replay();
  return {model,update(seconds){mixer.update(Math.max(0,seconds));onProgress(state());},replay,
    dispose(){mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);},
    get state(){return state();}};
}

export function showTowerProgress({time,duration,finished}) {
  const label=document.querySelector('#animation-status');if(!label)return;
  const text=finished?'Construction complete · tap Replay build':`Construction · ${time.toFixed(1)} / ${duration.toFixed(0)} seconds`;
  if(label.textContent!==text)label.textContent=text;
}
