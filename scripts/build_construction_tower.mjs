// Add portable blue scanning geometry and glTF animation to the supplied tower.
import {readFile,writeFile} from 'node:fs/promises';
import {TorusGeometry} from 'three';
const source=await readFile('docs/assets/iNXT_Tower_Animated.glb');
const length=source.readUInt32LE(12);const doc=JSON.parse(source.subarray(20,20+length));
const binaryStart=20+length+8;const chunks=[source.subarray(binaryStart,binaryStart+doc.buffers[0].byteLength)];
let byteLength=chunks[0].length;
function accessor(array,type,componentType,min,max){
 const pad=(4-byteLength%4)%4;if(pad){chunks.push(Buffer.alloc(pad));byteLength+=pad;}
 const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);const view=doc.bufferViews.length;
 doc.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:bytes.length});chunks.push(bytes);byteLength+=bytes.length;
 const index=doc.accessors.length;const size={SCALAR:1,VEC3:3}[type];
 doc.accessors.push({bufferView:view,componentType,count:array.length/size,type,...(min?{min,max}:{})});return index;
}
const material=doc.materials.length;
doc.materials.push({name:'Electric blue construction scanner',pbrMetallicRoughness:{baseColorFactor:[.015,.3,1,1],metallicFactor:0,roughnessFactor:.5},emissiveFactor:[.015,.3,1],extensions:{KHR_materials_emissive_strength:{emissiveStrength:3}}});
const geo=new TorusGeometry(18,.35,8,96).rotateX(Math.PI/2);geo.computeBoundingBox();
const mesh=doc.meshes.length;
doc.meshes.push({name:'Blue scan ring',primitives:[{attributes:{POSITION:accessor(geo.attributes.position.array,'VEC3',5126,geo.boundingBox.min.toArray(),geo.boundingBox.max.toArray()),NORMAL:accessor(geo.attributes.normal.array,'VEC3',5126)},indices:accessor(geo.index.array,'SCALAR',5123),material}]});
const scan=doc.nodes.length;doc.nodes.push({name:'Construction scan',mesh,translation:[0,-.25,0]});
const halo=doc.nodes.length;doc.nodes.push({name:'Floor scan halo',mesh,translation:[0,-.25,0]});
doc.scenes[doc.scene??0].nodes.push(scan,halo);
const times=new Float32Array(Array.from({length:481},(_,i)=>i/24));const input=accessor(times,'SCALAR',5126,[0],[20]);
function track(node,path,values){const a=doc.animations[0];const output=accessor(new Float32Array(values),'VEC3',5126);a.channels.push({sampler:a.samplers.length,target:{node,path}});a.samplers.push({input,output,interpolation:'LINEAR'});}
track(scan,'translation',Array.from(times,t=>[0,-.25+160*(t/20),0]).flat());
track(scan,'scale',Array.from(times,t=>{const s=t>=20?0:t>19?20-t:1;return [s,s,s];}).flat());
track(halo,'scale',Array.from(times,t=>{const s=t>=20?0:(.94+.06*Math.sin(t*4)**2)*Math.min(1,(20-t)*2);return [s,s,s];}).flat());
doc.buffers[0].byteLength=byteLength;
const raw=Buffer.from(JSON.stringify(doc));const json=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(json);
const bin=Buffer.concat(chunks);const padded=Buffer.alloc(Math.ceil(bin.length/4)*4);bin.copy(padded);
const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+padded.length,8);header.writeUInt32LE(json.length,12);header.write('JSON',16);
const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(padded.length);binHeader.write('BIN',4);
await writeFile('docs/assets/iNXT_Tower_Construction.glb',Buffer.concat([header,json,binHeader,padded]));
console.log('Added a rising blue scan ring and pulsing floor halo to the portable construction clip');
