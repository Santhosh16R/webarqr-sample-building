import {BoxGeometry,CylinderGeometry,SphereGeometry,Quaternion,Vector3} from 'three';
import {mergeBufferGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Ordinary geometry and node transform tracks work in WebXR, Scene Viewer and USDZ.
export function addConstructionCrew({doc,accessor,track,times}){
 const roots=doc.scenes[doc.scene??0].nodes;
 const material=(name,color,metalness=.25,emissive)=>{
  const index=doc.materials.length;
  doc.materials.push({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],metallicFactor:metalness,roughnessFactor:.45},...(emissive?{emissiveFactor:color,extensions:{KHR_materials_emissive_strength:{emissiveStrength:emissive}}}:{})});return index;
 };
 const amber=material('Crew | safety amber',[1,.43,.025]);
 const orange=material('Crew | robot orange',[1,.15,.025]);
 const steel=material('Crew | dark steel',[.07,.12,.19],.6);
 const white=material('Crew | drone ceramic',[.7,.83,.95]);
 const cyan=material('Crew | blue work lights',[.015,.45,1],0,3);
 function mesh(name,geometry,mat){
  geometry.computeBoundingBox();const index=doc.meshes.length;
  const attributes={POSITION:accessor(geometry.attributes.position.array,'VEC3',5126,geometry.boundingBox.min.toArray(),geometry.boundingBox.max.toArray()),NORMAL:accessor(geometry.attributes.normal.array,'VEC3',5126)};
  doc.meshes.push({name,primitives:[{attributes,indices:accessor(geometry.index.array,'SCALAR',geometry.index.array.BYTES_PER_ELEMENT===4?5125:5123),material:mat}]});return index;
 }
 function node(name,props={},parent){const id=doc.nodes.length;doc.nodes.push({name,...props});if(parent===undefined)roots.push(id);else (doc.nodes[parent].children??=[]).push(id);return id;}
 function animate(id,path,fn){track(id,path,Array.from(times,t=>fn(t)).flat());}
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const q=(axis,angle)=>new Quaternion().setFromAxisAngle(new Vector3(...axis),angle).toArray();
 const rotY=(id,fn)=>animate(id,'rotation',t=>q([0,1,0],fn(t)));
 const rotZ=(id,fn)=>animate(id,'rotation',t=>q([0,0,1],fn(t)));
 const box=(x,y,z,tx=0,ty=0,tz=0)=>new BoxGeometry(x,y,z).translate(tx,ty,tz);
 const merged=parts=>mergeBufferGeometries(parts,false);
 const beam=(a,b,r=.22)=>{
  const start=new Vector3(...a),end=new Vector3(...b),delta=end.clone().sub(start);
  const geo=new CylinderGeometry(r,r,delta.length(),5);
  geo.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),delta.normalize()));geo.translate(...start.add(end).multiplyScalar(.5).toArray());return geo;
 };
 const baseMesh=mesh('Crew crane foundation',merged([box(8,1.2,8,0,.0,0),box(4,1.6,4,0,1.2,0)]),steel);
 const mastParts=[];
 for(const x of [-1.35,1.35])for(const z of [-1.35,1.35])mastParts.push(box(.4,150,.4,x,75,z));
 for(let i=0;i<12;i++){
  const y=i*150/12+.25,next=(i+1)*150/12-.25;
  mastParts.push(beam([-1.35,y,-1.35],[1.35,next,-1.35],.16),beam([-1.35,y,1.35],[1.35,next,1.35],.16),beam([-1.35,y,-1.35],[-1.35,next,1.35],.16),beam([1.35,y,-1.35],[1.35,next,1.35],.16));
 }
 const mastMesh=mesh('Crew lattice crane mast',merged(mastParts).scale(1,1/150,1),amber);
 const boomParts=[box(37,.4,.4,10.5,0,-1),box(37,.4,.4,10.5,0,1),box(37,.4,.4,10.5,2,0)];
 for(let x=-8;x<29;x+=3)boomParts.push(beam([x,0,-1],[x+3,2,0],.16),beam([x,0,1],[x+3,2,0],.16),beam([x,0,-1],[x+3,0,1],.14));
 const boomMesh=mesh('Crew lattice crane boom',merged(boomParts),amber);
 const cableMesh=mesh('Crew crane cable',new CylinderGeometry(.1,.1,1,5).translate(0,-.5,0),steel);
 const hookMesh=mesh('Crew lifting hook',merged([box(1.3,1,1.3),beam([0,-.5,0],[0,-1.7,0],.25),beam([0,-1.7,0],[.7,-1.7,0],.25)]),amber);
 const panelMesh=mesh('Crew carried facade panel',box(3.5,3,.65,0,-3.4,0),cyan);
 const work=t=>1-smooth((t-18)/2);
 for(let i=0;i<2;i++){
  const root=node(`Crew Crane ${i+1}`,{translation:[i?30:-30,0,-12],extras:{crewRole:'crane'}});
  node(`Crane ${i+1} base`,{mesh:baseMesh},root);
  const mast=node(`Crane ${i+1} telescopic mast`,{mesh:mastMesh},root);
  const height=t=>14+139*smooth(t/19);
  animate(mast,'scale',t=>[1,height(t),1]);
  const carriage=node(`Crane ${i+1} turntable`,{},root);
  animate(carriage,'translation',t=>[0,height(t),0]);
  rotY(carriage,t=>(i?Math.PI:0)+(.17*Math.sin(t*.7+i))*work(t));
  node(`Crane ${i+1} boom`,{mesh:boomMesh},carriage);
  node(`Crane ${i+1} counterweight`,{mesh:mesh(`Crane ${i+1} counterweight`,box(5,3.5,4,-6,-.8,0),steel)},carriage);
  const trolley=node(`Crane ${i+1} trolley`,{},carriage);
  animate(trolley,'translation',t=>[18+7*Math.sin(t*.8+i)*work(t),-.6,0]);
  const cable=node(`Crane ${i+1} hoist cable`,{mesh:cableMesh},trolley);
  const drop=t=>Math.min(height(t)-6,8+(7+6*Math.sin(t*2+i))*work(t));
  animate(cable,'scale',t=>[1,drop(t),1]);
  const hook=node(`Crane ${i+1} hook`,{mesh:hookMesh},trolley);
  animate(hook,'translation',t=>[0,-drop(t),0]);
  const payload=node(`Crane ${i+1} blue delivery panel`,{mesh:panelMesh},hook);
  animate(payload,'scale',t=>{const s=(.4+.6*(.5+.5*Math.sin(t*2+i)))*work(t);return [s,s,s];});
 }

 const robotBase=mesh('Crew robot base',merged([box(6,1,6),new CylinderGeometry(2.3,2.8,3,10).translate(0,1.8,0)]),steel);
 const jointMesh=mesh('Crew robot articulated joint',new SphereGeometry(1.3,10,6),steel);
 function linkMesh(name,length){return mesh(name,merged([box(1.5,length,1.7,0,length/2,0),beam([.95,.5,0],[.95,length-.5,0],.26),beam([-.95,.5,0],[-.95,length-.5,0],.26)]),orange);}
 const upperMesh=linkMesh('Crew robot upper arm',11),foreMesh=linkMesh('Crew robot forearm',9);
 const toolMesh=mesh('Crew welding tool',merged([box(1.8,2.5,1.8,0,1,0),new CylinderGeometry(.25,.65,2,8).translate(0,3,0)]),steel);
 const sparkMesh=mesh('Crew blue welding pulse',merged([new SphereGeometry(.9,8,6),box(3,.12,.12),box(.12,3,.12),box(.12,.12,3)]),cyan);
 for(let i=0;i<2;i++){
  const root=node(`Crew Robot ${i+1}`,{translation:[i?23:-23,.1,14],extras:{crewRole:'robot'}});
  node(`Robot ${i+1} base`,{mesh:robotBase},root);
  const turret=node(`Robot ${i+1} turret`,{translation:[0,3,0]},root);
  rotY(turret,t=>(i?-.8:.8)+.3*Math.sin(t*1.4+i)*work(t));
  const shoulder=node(`Robot ${i+1} shoulder`,{mesh:jointMesh},turret);
  rotZ(shoulder,t=>(i?1:-1)*(.45+.27*Math.sin(t*2+i)*work(t)));
  node(`Robot ${i+1} upper link`,{mesh:upperMesh},shoulder);
  const elbow=node(`Robot ${i+1} elbow`,{translation:[0,11,0],mesh:jointMesh},shoulder);
  rotZ(elbow,t=>(i?1:-1)*(.8+.3*Math.cos(t*2+i)*work(t)));
  node(`Robot ${i+1} lower link`,{mesh:foreMesh},elbow);
  const wrist=node(`Robot ${i+1} wrist`,{translation:[0,9,0],mesh:toolMesh},elbow);
  rotY(wrist,t=>t*.9*work(t));
  const spark=node(`Robot ${i+1} welding light`,{translation:[0,4,0],mesh:sparkMesh},wrist);
  animate(spark,'scale',t=>{const s=(.3+.7*Math.sin(t*18+i)**2)*smooth(t*2)*work(t);return [s,s,s];});
 }

 const droneBody=mesh('Crew inspection drone shell',merged([box(3,1.5,2.8),beam([-2.5,0,-2.5],[2.5,0,2.5],.3),beam([-2.5,0,2.5],[2.5,0,-2.5],.3)]),white);
 const rotorMesh=mesh('Crew drone rotor',merged([box(4,.12,.38),box(.38,.12,4),new CylinderGeometry(.35,.35,.4,8)]),steel);
 const beaconMesh=mesh('Crew drone blue beacon',new SphereGeometry(.65,8,6),cyan);
 for(let i=0;i<3;i++){
  const root=node(`Crew Drone ${i+1}`,{extras:{crewRole:'drone'}});
  const orbit=t=>i*2.1+t*.48;
  animate(root,'translation',t=>{
   const fly=smooth(t/1.5)*(1-smooth((t-17)/3));
   return [25*Math.cos(orbit(t)),.15+(10+137*smooth(t/19)+2*Math.sin(t*2+i))*fly,23*Math.sin(orbit(t))];
  });
  rotY(root,t=>-orbit(t)+Math.PI/2);
  node(`Drone ${i+1} body`,{mesh:droneBody},root);
  node(`Drone ${i+1} beacon`,{mesh:beaconMesh,translation:[0,1.2,0]},root);
  for(const [j,[x,z]] of [[-2.5,-2.5],[-2.5,2.5],[2.5,-2.5],[2.5,2.5]].entries()){
   const rotor=node(`Drone ${i+1} rotor ${j+1}`,{mesh:rotorMesh,translation:[x,.6,z]},root);
   rotY(rotor,t=>(j%2?1:-1)*17*(t<18?t:18+2*smooth((t-18)/2)));
  }
 }
 doc.extras={...doc.extras,constructionCrew:{cranes:2,roboticArms:2,drones:3,durationSeconds:20}};
}
