import {readFile,writeFile} from 'node:fs/promises';
import {Box3,Vector3,AnimationMixer,LoopOnce} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const bytes=await readFile('docs/assets/iNXT_Tower_Animated.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const mixer=new AnimationMixer(gltf.scene);
const action=mixer.clipAction(gltf.animations[0]);action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
const envelope=new Box3();
for(let frame=0;frame<=480;frame++) {mixer.setTime(frame/24);gltf.scene.updateMatrixWorld(true);envelope.union(new Box3().setFromObject(gltf.scene));}
const size=envelope.getSize(new Vector3());
const report={width:size.x,height:size.y,depth:size.z,min:envelope.min.toArray(),max:envelope.max.toArray(),duration:gltf.animations[0].duration,tracks:gltf.animations[0].tracks.length};
await writeFile('outputs/tower-dimensions.json',JSON.stringify(report,null,2));console.log(report);
