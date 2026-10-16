import * as THREE from 'three';

// Shared micro-geometries to maximize reuse & keep draw calls/memory low
export const sharedSphereGeo = new THREE.SphereGeometry(1, 10, 8);
export const sharedCylGeo = new THREE.CylinderGeometry(1, 1, 1, 14);
export const sharedHexGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
export const sharedTorusGeo = new THREE.TorusGeometry(1, 0.12, 8, 24);

/**
 * Tags an Object3D and all its descendant meshes with a selectable system ID
 * and optional exterior shell flag (used for ANATOMY transparency mode).
 */
export function tagSelectable(rootObj, systemId, isExterior = false) {
  rootObj.userData.systemId = systemId;
  rootObj.userData.isExterior = isExterior;
  rootObj.traverse((child) => {
    if (!child.userData.systemId) {
      child.userData.systemId = systemId;
    }
    if (isExterior) {
      child.userData.isExterior = true;
    }
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return rootObj;
}

/**
 * Registers an Object3D for progressive Exploded View displacement.
 */
export function registerExplodable(
  obj,
  offsetVec,
  startProgress = 0.0,
  endProgress = 1.0,
  rotOffset = null
) {
  const vec = Array.isArray(offsetVec)
    ? new THREE.Vector3(offsetVec[0], offsetVec[1], offsetVec[2])
    : offsetVec.clone();
  obj.userData.explodable = {
    basePos: obj.position.clone(),
    baseRot: obj.rotation.clone(),
    offsetVec: vec,
    startProgress,
    endProgress,
    rotOffset: rotOffset ? new THREE.Euler(rotOffset[0], rotOffset[1], rotOffset[2]) : null
  };
  return obj;
}
