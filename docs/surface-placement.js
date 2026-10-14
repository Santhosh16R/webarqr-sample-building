import * as THREE from 'three';

export function isHorizontalSurface(matrix) {
  if (!matrix.elements.every(Number.isFinite)) return false;
  const normal = new THREE.Vector3().setFromMatrixColumn(matrix,1);
  return normal.lengthSq() > .5 && normal.normalize().y > .9;
}

export function createSurfacePlacement(root) {
  const candidate = new THREE.Matrix4();
  let ready = false;
  let placed = false;
  root.visible = false;
  return {
    update(matrix) {ready = !!matrix && isHorizontalSurface(matrix); if (ready) candidate.copy(matrix); return ready;},
    place(viewerPosition) {
      if (!ready) return false;
      root.position.setFromMatrixPosition(candidate);
      root.rotation.set(0,Math.atan2(viewerPosition.x-root.position.x,viewerPosition.z-root.position.z),0);
      root.visible = true;placed = true;return true;
    },
    reset() {placed = false;root.visible = false;},
    get placed() {return placed;},
  };
}
