import * as THREE from 'three';

export function createRotationControls(pivot) {
  const target = {x:0, y:0};
  return {
    rotate(axis) {if (axis === 'x' || axis === 'y') target[axis] += Math.PI/2;},
    reset() {target.x = 0; target.y = 0;},
    update(seconds) {
      const blend = 1-Math.exp(-Math.max(0,seconds)/.14);
      for (const axis of ['x','y']) {
        pivot.rotation[axis] = THREE.MathUtils.lerp(pivot.rotation[axis],target[axis],blend);
        if (Math.abs(pivot.rotation[axis]-target[axis]) < .0001) pivot.rotation[axis] = target[axis];
      }
    },
  };
}

// Reveal the actual geometry from the ground up, rather than stretching it.
export function createBuildingEffects(model, {reducedMotion = false} = {}) {
  const bounds = new THREE.Box3().setFromObject(model);
  const top = bounds.max.y + .45;
  const height = {value: -.12};
  const glow = {value: 1};
  const meshes = [];
  model.traverse(object => {if (object.isMesh) meshes.push(object);});
  for (const mesh of meshes) {
    mesh.material = mesh.material.clone();
    const material = mesh.material;
    if (material.name === 'Blue glass') {
      material.emissive.set(0x087fff);
      material.emissiveIntensity = .32;
    }
    material.onBeforeCompile = shader => {
      shader.uniforms.uBuildHeight = height;
      shader.uniforms.uBuildGlow = glow;
      shader.vertexShader = 'varying float vBuildY;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBuildY = position.y;');
      shader.fragmentShader = 'varying float vBuildY;\nuniform float uBuildHeight;\nuniform float uBuildGlow;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vBuildY > uBuildHeight) discard;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float constructionBand = 1.0 - smoothstep(0.0, 0.42, abs(vBuildY - uBuildHeight));
        totalEmissiveRadiance += vec3(0.015, 0.38, 1.0) * (constructionBand * 2.8 * uBuildGlow + 0.025);`);
    };
    material.customProgramCacheKey = () => 'webarqr-blue-construction-v1';
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 25), new THREE.ShaderMaterial({
      uniforms: {uBuildHeight: height, uBuildGlow: glow},
      vertexShader: 'varying float vBuildY; void main(){vBuildY=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `varying float vBuildY; uniform float uBuildHeight; uniform float uBuildGlow;
        void main(){
          float built = 1.0 - step(uBuildHeight, vBuildY);
          float band = 1.0 - smoothstep(0.0, 0.55, abs(vBuildY-uBuildHeight));
          float alpha = mix(0.065*uBuildGlow, 0.18+0.38*uBuildGlow, built) + band*0.65*uBuildGlow;
          gl_FragColor=vec4(0.04,0.55,1.0,min(alpha,0.95));
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }));
    edges.renderOrder = 2;
    mesh.add(edges);
  }
  const scan = new THREE.Mesh(new THREE.RingGeometry(5.7, 6.05, 64), new THREE.MeshBasicMaterial({
    color: 0x138fff, transparent: true, opacity: .65, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scan.rotation.x = -Math.PI/2;
  model.add(scan);
  const baseHalo = new THREE.Mesh(new THREE.RingGeometry(6.1, 6.2, 64), new THREE.MeshBasicMaterial({
    color: 0x35b8ff, transparent: true, opacity: .35, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  baseHalo.rotation.x = -Math.PI/2;
  baseHalo.position.y = .025;
  model.add(baseHalo);
  let elapsed = 0;
  const duration = reducedMotion ? .2 : 4.8;
  function apply() {
    const progress = Math.min(elapsed/duration, 1);
    const smooth = progress*progress*(3-2*progress);
    height.value = THREE.MathUtils.lerp(-.12, top, smooth);
    glow.value = progress < .85 ? 1 : (1-progress)/.15;
    model.position.y = -.35*(1-smooth);
    scan.position.y = Math.max(.025, height.value);
    scan.material.opacity = .65*glow.value;
    scan.visible = progress < 1;
    baseHalo.material.opacity = .25 + .18*glow.value;
  }
  apply();
  return {
    update(seconds) {elapsed += Math.max(0,seconds); apply();},
    replay() {elapsed = 0; apply();},
    get state() {return {progress: Math.min(elapsed/duration,1), height:height.value, risingY:model.position.y, scanVisible:scan.visible};},
  };
}
