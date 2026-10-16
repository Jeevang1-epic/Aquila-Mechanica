import * as THREE from 'three';
import { sharedSphereGeo, sharedCylGeo } from './core.js';

/**
 * Creates an articulated Primary Flight Feather with:
 * - Central tapered curved porcelain/titanium rachis (shaft)
 * - Root bearing & pitch-control linkage arm
 * - Asymmetric aerodynamic leading & trailing vanes with realistic Golden Eagle emargination (slotted fingers)
 */
export function createPrimaryFeather({
  length = 1.15,
  width = 0.14,
  sweep = 0.22,
  twist = 0.06,
  rachisRadius = 0.008,
  emargination = 0.35,
  side = 1,
  mats
}) {
  const rootGroup = new THREE.Group();

  // 1. Root socket bearing & brass pitch collar
  const socket = new THREE.Mesh(sharedCylGeo, mats.agedBrass);
  socket.scale.set(rachisRadius * 2.2, 0.045, rachisRadius * 2.2);
  socket.rotation.z = Math.PI / 2;
  socket.position.x = side * 0.02;
  rootGroup.add(socket);

  // Small pitch actuator lever arm at feather calamus (root)
  const pitchHorn = new THREE.Mesh(sharedCylGeo, mats.darkSteel);
  pitchHorn.scale.set(0.0035, 0.032, 0.0035);
  pitchHorn.position.set(side * 0.015, -0.018, -0.012);
  pitchHorn.rotation.x = -0.4;
  rootGroup.add(pitchHorn);

  const hornPin = new THREE.Mesh(sharedSphereGeo, mats.paleGold);
  hornPin.scale.setScalar(0.005);
  hornPin.position.set(side * 0.015, -0.032, -0.018);
  rootGroup.add(hornPin);

  // 2. Curved & tapered central rachis shaft extending outward (side * X) and sweeping rearward (-Z)
  const curvePoints = [];
  const segs = 12;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = side * t * length;
    const y = Math.sin(t * Math.PI * 0.82) * 0.026 - Math.pow(t, 2.1) * 0.032;
    const z = -Math.pow(t, 1.55) * sweep;
    curvePoints.push(new THREE.Vector3(x, y, z));
  }
  const shaftCurve = new THREE.CatmullRomCurve3(curvePoints);

  const rachisGeo = new THREE.TubeGeometry(shaftCurve, 14, rachisRadius, 6, false);
  const posAttr = rachisGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);
    const t = Math.max(0, Math.min(1, Math.abs(v.x) / length));
    const taper = 1.0 - t * 0.82;
    const spinePt = shaftCurve.getPointAt(t);
    v.y = spinePt.y + (v.y - spinePt.y) * taper;
    v.z = spinePt.z + (v.z - spinePt.z) * taper;
    posAttr.setXYZ(i, v.x, v.y, v.z);
  }
  rachisGeo.computeVertexNormals();

  const rachisMesh = new THREE.Mesh(rachisGeo, mats.porcelain);
  rootGroup.add(rachisMesh);

  // 3. Sculpted aerodynamic leading (+Z) & trailing (-Z) vane ribbon
  const vaneCols = 16;
  const vaneRows = 3;
  const vaneGeo = new THREE.BufferGeometry();
  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let c = 0; c <= vaneCols; c++) {
    const t = c / vaneCols;
    const u = 0.06 + t * 0.94;
    const spine = shaftCurve.getPointAt(u);

    const tipTaper = Math.sin(Math.pow(t, 0.7) * Math.PI);
    const notch = emargination > 0 && t > 0.50
      ? 1.0 - emargination * THREE.MathUtils.smoothstep(t, 0.50, 0.68) * 0.58
      : 1.0;

    // Leading vane (+Z) is narrow & stiff; Trailing vane (-Z) is broader with emargination notch
    const leadW = width * 0.30 * tipTaper * (1 - emargination * THREE.MathUtils.smoothstep(t, 0.55, 0.72) * 0.35);
    const trailW = width * 0.70 * tipTaper * notch;
    const localTwist = twist * t;

    // Row 0: Anterior Leading Edge (+Z)
    vertices.push(
      spine.x,
      spine.y + Math.sin(localTwist) * leadW - 0.002 * tipTaper,
      spine.z + Math.cos(localTwist) * leadW
    );
    uvs.push(0, t);

    // Row 1: Dorsal Rachis Crest
    vertices.push(spine.x, spine.y + 0.002, spine.z);
    uvs.push(0.5, t);

    // Row 2: Posterior Trailing Edge (-Z)
    vertices.push(
      spine.x,
      spine.y - Math.sin(localTwist) * trailW - 0.005 * tipTaper,
      spine.z - Math.cos(localTwist) * trailW
    );
    uvs.push(1, t);
  }

  for (let c = 0; c < vaneCols; c++) {
    const base = c * vaneRows;
    const next = (c + 1) * vaneRows;
    if (side > 0) {
      indices.push(base, next, base + 1);
      indices.push(base + 1, next, next + 1);
      indices.push(base + 1, next + 1, base + 2);
      indices.push(base + 2, next + 1, next + 2);
    } else {
      indices.push(base, base + 1, next);
      indices.push(base + 1, next + 1, next);
      indices.push(base + 1, base + 2, next + 1);
      indices.push(base + 2, next + 2, next + 1);
    }
  }

  vaneGeo.setIndex(indices);
  vaneGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  vaneGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  vaneGeo.computeVertexNormals();

  const vaneMesh = new THREE.Mesh(vaneGeo, mats.featherVanePrimary);
  rootGroup.add(vaneMesh);

  // Pale-gold etched structural collar near feather base
  const collarRing = new THREE.Mesh(sharedCylGeo, mats.paleGold);
  collarRing.scale.set(rachisRadius * 1.65, 0.014, rachisRadius * 1.65);
  collarRing.rotation.z = Math.PI / 2;
  collarRing.position.x = side * 0.055;
  rootGroup.add(collarRing);

  return rootGroup;
}

/**
 * Creates a Secondary or Tail (Rectrix) or Hackle feather extending along +Z (or rotated as needed).
 */
export function createFeather({
  length = 0.68,
  width = 0.12,
  curvature = 0.038,
  sweep = 0.03,
  mats,
  vaneMat = null,
  shaftMat = null
}) {
  const group = new THREE.Group();
  const chosenVaneMat = vaneMat || mats.featherVaneTranslucent;
  const chosenShaftMat = shaftMat || mats.porcelain;

  const socket = new THREE.Mesh(sharedCylGeo, mats.agedBrass);
  socket.scale.set(0.009, 0.026, 0.009);
  socket.rotation.x = Math.PI / 2;
  socket.position.z = 0.013;
  group.add(socket);

  const cols = 12;
  const geo = new THREE.BufferGeometry();
  const verts = [];
  const uvs = [];
  const idx = [];

  for (let c = 0; c <= cols; c++) {
    const t = c / cols;
    const z = t * length;
    const y = Math.sin(t * Math.PI * 0.82) * curvature - t * t * curvature * 0.55;
    const xCenter = t * t * sweep;

    const env = Math.sin(Math.pow(t, 0.62) * Math.PI);
    const halfW = width * 0.5 * env;

    verts.push(xCenter - halfW, y - 0.003 * env, z);
    uvs.push(0, t);
    verts.push(xCenter, y + 0.0025 * (1 - t * 0.7), z);
    uvs.push(0.5, t);
    verts.push(xCenter + halfW, y - 0.003 * env, z);
    uvs.push(1, t);
  }

  for (let c = 0; c < cols; c++) {
    const b = c * 3;
    const n = (c + 1) * 3;
    idx.push(b, n, b + 1);
    idx.push(b + 1, n, n + 1);
    idx.push(b + 1, n + 1, b + 2);
    idx.push(b + 2, n + 1, n + 2);
  }

  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();

  const vaneMesh = new THREE.Mesh(geo, chosenVaneMat);
  group.add(vaneMesh);

  const shaftGeo = new THREE.CylinderGeometry(0.0016, 0.006, length * 0.94, 6);
  shaftGeo.rotateX(Math.PI / 2);
  shaftGeo.translate(sweep * 0.3, curvature * 0.35, length * 0.47);
  const shaftMesh = new THREE.Mesh(shaftGeo, chosenShaftMat);
  group.add(shaftMesh);

  return group;
}

/**
 * Creates a reusable Covert / Contour Feather Geometry for InstancedMesh arrays.
 */
export function createCovertFeatherGeometry(length = 0.22, width = 0.068, arch = 0.018) {
  const cols = 8;
  const geo = new THREE.BufferGeometry();
  const verts = [];
  const uvs = [];
  const idx = [];

  for (let c = 0; c <= cols; c++) {
    const t = c / cols;
    const z = t * length;
    const y = Math.sin(t * Math.PI) * arch;
    const env = Math.sin(Math.pow(t, 0.6) * Math.PI);
    const hw = width * 0.5 * env;

    verts.push(-hw, y - 0.002 * env, z);
    uvs.push(0, t);
    verts.push(0, y + 0.003 * (1 - t * 0.5), z);
    uvs.push(0.5, t);
    verts.push(hw, y - 0.002 * env, z);
    uvs.push(1, t);
  }

  for (let c = 0; c < cols; c++) {
    const b = c * 3;
    const n = (c + 1) * 3;
    idx.push(b, n, b + 1);
    idx.push(b + 1, n, n + 1);
    idx.push(b + 1, n + 1, b + 2);
    idx.push(b + 2, n + 1, n + 2);
  }

  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}
