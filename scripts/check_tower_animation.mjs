import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Box3,Vector3} from 'three';
import {createTowerAnimation} from '../docs/tower-animation.js';
import {floorScaleFromWidthCm,DEFAULT_WIDTH_CM} from '../docs/model-size.js';
const bytes=await readFile('docs/assets/iNXT_Tower_Construction.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const playback=createTowerAnimation(gltf);playback.model.scale.setScalar(floorScaleFromWidthCm(DEFAULT_WIDTH_CM));
const scan=gltf.scene.getObjectByName('Construction_scan');
const halo=gltf.scene.getObjectByName('Floor_scan_halo');
assert.ok(scan&&halo,'Portable scanning rings are missing');
const scanStart=scan.position.y;
const heights=[];
const activeCounts=[];
for(let frame=0;frame<=480;frame++){
  if(frame)playback.update(1/24);
  playback.model.updateMatrixWorld(true);
  const bounds=new Box3().setFromObject(playback.model);const size=bounds.getSize(new Vector3());
  assert.ok(size.y<=.3+1e-6,`Height cap exceeded at ${frame}`);
  if(frame%120===0){heights.push(size.y);let count=0;gltf.scene.traverse(o=>{if(o.isMesh&&Math.abs(o.matrixWorld.determinant())>1e-12)count++;});activeCounts.push(count);}
}
playback.update(.01);assert.equal(playback.state.finished,true);
assert.ok(activeCounts.at(-1)>activeCounts[0]+1000);
const end=playback.state.time;playback.update(3);assert.equal(playback.state.time,end);
playback.replay();assert.equal(playback.state.time,0);assert.equal(playback.state.finished,false);
playback.update(5);assert.ok(Math.abs(playback.state.time-5)<1e-6);
assert.ok(scan.position.y>scanStart+30,'Scan must rise with construction');
assert.ok(scan.scale.x>0&&halo.scale.x>0,'Both blue rings are visible during construction');
playback.update(16);assert.equal(scan.scale.x,0);assert.equal(halo.scale.x,0);
playback.replay();assert.ok(scan.scale.x>0&&halo.scale.x>0,'Replay restores the scanner');
playback.dispose();
const report={result:'passed',duration:20,clip:gltf.animations[0].name,tracks:gltf.animations[0].tracks.length,heightsMetresAt0_5_10_15_20:heights,activeMeshesAt0_5_10_15_20:activeCounts,checks:['24 fps height envelope <= 30 cm','construction progresses','holds completed frame','replay restarts','blue scan rises during construction','scanner disappears at completion and restores on replay'],physicalPhonesTested:false};
await writeFile('outputs/tower-animation-checks.json',JSON.stringify(report,null,2));console.log(report);
