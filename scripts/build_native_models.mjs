import {readFile,writeFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {USDZExporter} from 'three/examples/jsm/exporters/USDZExporter.js';

const root = new URL('../',import.meta.url);
const original = await readFile(new URL('docs/assets/sample-building.glb',root));
const jsonLength = original.readUInt32LE(12);
const gltf = JSON.parse(original.subarray(20,20+jsonLength).toString());
gltf.nodes[0].scale = [2/11.4,2/11.4,2/11.4];
for (const material of gltf.materials) {
  if (material.name === 'Blue glass') material.emissiveFactor = [.025,.12,.45];
}
const json = Buffer.from(JSON.stringify(gltf));
const padded = Buffer.alloc(Math.ceil(json.length/4)*4,0x20);json.copy(padded);
const binaryChunk = original.subarray(20+jsonLength);
const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);
header.writeUInt32LE(20+padded.length+binaryChunk.length,8);
header.writeUInt32LE(padded.length,12);header.write('JSON',16);
const bytes=Buffer.concat([header,padded,binaryChunk]);
await writeFile(new URL('docs/assets/floor-building.glb',root),bytes);
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
asset.scene.updateMatrixWorld(true);
const usdz=await new USDZExporter().parse(asset.scene);
await writeFile(new URL('docs/assets/floor-building.usdz',root),usdz);
console.log(`Created native AR models at 2 metres wide: GLB ${bytes.length} bytes; USDZ ${usdz.length} bytes`);
