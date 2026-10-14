import * as THREE from 'three';

// Keep tracking noise separate from the building's intentional animation.
// Position thresholds are relative to marker width, not arbitrary world units.
export function createPoseStabilizer(output) {
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let initialized = false;
  output.visible = false;
  return {
    reset() {initialized = false; output.visible = false;},
    update(matrix, seconds, visible) {
      if (!visible) {initialized = false; output.visible = false; return;}
      if (!matrix.elements.every(Number.isFinite)) return;
      matrix.decompose(position, rotation, scale);
      if (scale.x <= 0 || scale.y <= 0 || scale.z <= 0 || rotation.lengthSq() < .5) return;
      rotation.normalize();
      if (!initialized) {
        output.position.copy(position);
        output.quaternion.copy(rotation);
        output.scale.copy(scale);
        initialized = true;
      } else {
        const markerWidth = Math.max((scale.x+scale.y+scale.z)/3, .000001);
        const distance = output.position.distanceTo(position)/markerWidth;
        const angle = output.quaternion.angleTo(rotation);
        // Follow deliberate movement faster; damp small stationary variations.
        const moving = distance > .08 || angle > .20;
        const alpha = 1-Math.exp(-Math.max(0,seconds)/(moving ? .045 : .11));
        if (distance > .0025) output.position.lerp(position,alpha);
        if (angle > .006) output.quaternion.slerp(rotation,alpha);
        if (output.scale.distanceTo(scale)/Math.max(scale.length(),.000001) > .003) output.scale.lerp(scale,alpha);
      }
      output.visible = true;
      output.updateMatrix();
    },
  };
}
