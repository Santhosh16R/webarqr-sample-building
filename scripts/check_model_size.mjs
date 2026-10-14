import assert from 'node:assert/strict';
import {MODEL_WIDTH_M,MODEL_HEIGHT_M,MAX_WIDTH_CM,clampWidthCm,heightFromWidthCm,floorScaleFromWidthCm,markerScaleFromWidthCm} from '../docs/model-size.js';
assert.equal(MAX_WIDTH_CM,7.3);
assert.equal(clampWidthCm(1000),7.3);
assert.equal(clampWidthCm(-5),5);
for(const width of [5,15,30,34.5,1000,NaN]){
  const physicalHeight=MODEL_HEIGHT_M*floorScaleFromWidthCm(width)*100;
  assert.ok(physicalHeight<=30+1e-9);
  assert.ok(Math.abs(physicalHeight-heightFromWidthCm(width))<1e-9);
  for(const markerWidth of [5,15,100]){
    const scale=markerScaleFromWidthCm(width,markerWidth);
    assert.ok(Math.abs(MODEL_WIDTH_M*scale*markerWidth-clampWidthCm(width))<1e-9);
    assert.ok(MODEL_HEIGHT_M*scale*markerWidth<=30+1e-9);
  }
}
console.log('PASS: centimetre conversion, 30 cm upright height cap, oversize clamping, and marker-width calibration');
