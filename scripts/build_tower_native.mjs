import {readFile,writeFile} from 'node:fs/promises';
import {AnimationMixer,LoopOnce,Float32BufferAttribute,FrontSide} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {USDZExporter} from 'three/examples/jsm/exporters/USDZExporter.js';
import * as zip from 'three/examples/jsm/libs/fflate.module.js';

const original=await readFile('docs/assets/iNXT_Tower_Animated.glb');
const dims=JSON.parse(await readFile('outputs/tower-dimensions.json'));
const jsonLength=original.readUInt32LE(12);
const gltf=JSON.parse(original.subarray(20,20+jsonLength));
// Physical scaling and ground centering stay outside every animated node.
const scene=gltf.scenes[gltf.scene??0];
const offset=gltf.nodes.length;gltf.nodes.push({name:'Ground offset',translation:[-(dims.min[0]+dims.max[0])/2,-dims.min[1],-(dims.min[2]+dims.max[2])/2],children:scene.nodes});
const root=gltf.nodes.length;gltf.nodes.push({name:'30 cm tower',scale:Array(3).fill(.3/dims.height),children:[offset]});scene.nodes=[root];
const json=Buffer.from(JSON.stringify(gltf));const padded=Buffer.alloc(Math.ceil(json.length/4)*4,0x20);json.copy(padded);
const binaryChunk=original.subarray(20+jsonLength);
const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+binaryChunk.length,8);header.writeUInt32LE(padded.length,12);header.write('JSON',16);
const bytes=Buffer.concat([header,padded,binaryChunk]);await writeFile('docs/assets/floor-building.glb',bytes);
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const mixer=new AnimationMixer(asset.scene);const action=mixer.clipAction(asset.animations[0]);action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
const meshes=[];asset.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
const samples=new Map(meshes.map(o=>[o.id,[]]));const previous=new Map();
function matrixText(matrix){const a=matrix.elements.map(n=>Number(n.toPrecision(10)));return `( ${[0,4,8,12].map(i=>`(${a.slice(i,i+4).join(', ')})`).join(', ')} )`;}
// Preserve changing frames; collapse flat runs while retaining endpoints.
for(let frame=0;frame<=480;frame++){
  mixer.setTime(frame/24);asset.scene.updateMatrixWorld(true);
  for(const mesh of meshes){
    const matrix=matrixText(mesh.matrixWorld);const prev=previous.get(mesh.id);const keys=samples.get(mesh.id);
    if(!prev||matrix!==prev.matrix){if(prev&&keys.at(-1).frame!==frame-1)keys.push({frame:frame-1,matrix:prev.matrix});keys.push({frame,matrix});}
    previous.set(mesh.id,{frame,matrix});
  }
}
for(const mesh of meshes){const keys=samples.get(mesh.id);if(keys.at(-1).frame!==480)keys.push(previous.get(mesh.id));}
mixer.setTime(20);asset.scene.updateMatrixWorld(true);
for(const mesh of meshes){if(!mesh.geometry.attributes.uv)mesh.geometry.setAttribute('uv',new Float32BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count*2),2));}
for(const material of new Set(meshes.map(mesh=>mesh.material))){material.side=FrontSide;material.emissive.multiplyScalar(material.emissiveIntensity);material.emissiveIntensity=1;}
const files=zip.unzipSync(await new USDZExporter().parse(asset.scene));
for(const name of Object.keys(files)){if(name.startsWith('geometries/'))files[name]=zip.strToU8(zip.strFromU8(files[name]).replace('uniform token subdivisionScheme','uniform bool doubleSided = true\n        uniform token subdivisionScheme'));}
let stage=zip.strFromU8(files['model.usda']);
stage=stage.replace('    metersPerUnit = 1','    defaultPrim = "Root"\n    startTimeCode = 0\n    endTimeCode = 480\n    timeCodesPerSecond = 24\n    framesPerSecond = 24\n    autoPlay = true\n    metersPerUnit = 1');
let animated=0;
stage=stage.replace(/(def Xform "Object_(\d+)"[\s\S]*?\{\n)    matrix4d xformOp:transform = [^\n]+/g,(all,prefix,id)=>{
  const keys=samples.get(Number(id));if(!keys||keys.length<=2&&keys[0].matrix===keys[1].matrix)return all;
  animated++;return `${all}\n    matrix4d xformOp:transform.timeSamples = {\n${keys.map(k=>`        ${k.frame}: ${k.matrix},`).join('\n')}\n    }`;
});
if(animated<1293)throw new Error(`Expected at least 1293 animated USD transforms, found ${animated}`);
files['model.usda']=zip.strToU8(stage);
// Uncompressed USDZ entries need 64-byte-aligned data offsets.
const aligned={};let offsetBytes=0;
for(const [name,data] of Object.entries(files)){
  const base=offsetBytes+30+Buffer.byteLength(name);const padding=(64-(base+4)%64)%64;
  aligned[name]=[data,{extra:{12345:new Uint8Array(padding)}}];offsetBytes=base+4+padding+data.length;
}
const usdz=zip.zipSync(aligned,{level:0});await writeFile('docs/assets/floor-building.usdz',usdz);
console.log(`Created animated native tower: GLB ${bytes.length}, USDZ ${usdz.length} bytes; ${animated} animated transforms, 20 seconds, 30 cm maximum height`);
