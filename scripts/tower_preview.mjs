import {readFile,writeFile} from 'node:fs/promises';
import {AnimationMixer,LoopOnce,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const bytes=await readFile(process.argv[2]??'docs/assets/iNXT_Tower_Animated.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const mixer=new AnimationMixer(gltf.scene);const action=mixer.clipAction(gltf.animations[0]);action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(Number(process.argv[3]??20));gltf.scene.updateMatrixWorld(true);
const faces=[];
gltf.scene.traverse(mesh=>{
 if(!mesh.isMesh)return;
 const vertices=mesh.geometry.attributes.position;const index=mesh.geometry.index;
 const color=mesh.material.color.clone().convertLinearToSRGB();const emissive=mesh.material.emissive.clone().multiplyScalar(mesh.material.emissiveIntensity);
 for(let i=0;i<index.count;i+=3){const points=[0,1,2].map(k=>new Vector3().fromBufferAttribute(vertices,index.getX(i+k)).applyMatrix4(mesh.matrixWorld).toArray());faces.push({points,color:color.toArray(),emissive:emissive.toArray()});}
});
await writeFile('outputs/verification/tower-faces.json',JSON.stringify(faces));console.log(`${faces.length} preview triangles`);
