import * as THREE from 'three';
import { sharedSphereGeo, sharedCylGeo, sharedHexGeo } from './core.js';

/**
 * Creates a true involute-style toothed mechanical gear with lightened spokes,
 * hub boss, and bore hole.
 */
export function createGear({
  radius = 0.12,
  thickness = 0.022,
  teeth = 18,
  boreRadius = 0.025,
  spokes = 5,
  material
}) {
  const shape = new THREE.Shape();
  const toothDepth = (radius * 2 * Math.PI) / (teeth * 2.8);
  const innerR = radius - toothDepth * 0.55;
  const outerR = radius + toothDepth * 0.45;
  const step = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.22;
    const a2 = a0 + step * 0.36;
    const a3 = a0 + step * 0.64;
    const a4 = a0 + step * 0.78;

    const p0x = Math.cos(a0) * innerR;
    const p0y = Math.sin(a0) * innerR;
    if (i === 0) shape.moveTo(p0x, p0y);
    else shape.lineTo(p0x, p0y);

    shape.lineTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
    shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    shape.lineTo(Math.cos(a3) * outerR, Math.sin(a3) * outerR);
    shape.lineTo(Math.cos(a4) * innerR, Math.sin(a4) * innerR);
  }
  shape.closePath();

  const borePath = new THREE.Path();
  borePath.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
  shape.holes.push(borePath);

  const windowInnerR = boreRadius * 1.55;
  const windowOuterR = innerR * 0.76;
  if (spokes > 0 && windowOuterR > windowInnerR * 1.25) {
    const spokeStep = (Math.PI * 2) / spokes;
    const padAngle = 0.14;
    for (let s = 0; s < spokes; s++) {
      const sa0 = s * spokeStep + padAngle;
      const sa1 = (s + 1) * spokeStep - padAngle;
      if (sa1 > sa0 + 0.1) {
        const hole = new THREE.Path();
        hole.absarc(0, 0, windowOuterR, sa0, sa1, false);
        hole.absarc(0, 0, windowInnerR, sa1, sa0, true);
        hole.closePath();
        shape.holes.push(hole);
      }
    }
  }

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: thickness * 0.08,
    bevelThickness: thickness * 0.08
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  return new THREE.Mesh(geo, material);
}

/**
 * Creates a precision radial ball bearing assembly (outer race, inner race, and instanced rolling balls).
 */
export function createBearing({
  outerRadius = 0.055,
  innerRadius = 0.028,
  width = 0.018,
  ballCount = 10,
  mats
}) {
  const group = new THREE.Group();

  const outerGeo = new THREE.CylinderGeometry(outerRadius, outerRadius, width, 24, 1, true);
  const outerMesh = new THREE.Mesh(outerGeo, mats.darkSteel);
  outerMesh.rotation.x = Math.PI / 2;
  group.add(outerMesh);

  const innerGeo = new THREE.CylinderGeometry(innerRadius, innerRadius, width * 1.12, 20);
  const innerMesh = new THREE.Mesh(innerGeo, mats.titanium);
  innerMesh.rotation.x = Math.PI / 2;
  group.add(innerMesh);

  const midR = (outerRadius + innerRadius) * 0.5;
  const ballR = (outerRadius - innerRadius) * 0.36;
  const ballsInst = new THREE.InstancedMesh(sharedSphereGeo, mats.agedBrass, ballCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < ballCount; i++) {
    const a = (i / ballCount) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * midR, Math.sin(a) * midR, 0);
    dummy.scale.setScalar(ballR);
    dummy.updateMatrix();
    ballsInst.setMatrixAt(i, dummy.matrix);
  }
  ballsInst.instanceMatrix.needsUpdate = true;
  group.add(ballsInst);

  return group;
}

/**
 * Creates a circular ring of micro-rivets or countersunk hex screws.
 */
export function createRivetRing({
  radius = 0.08,
  count = 8,
  rivetRadius = 0.0045,
  material
}) {
  const inst = new THREE.InstancedMesh(sharedHexGeo, material, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    dummy.rotation.set(Math.PI / 2, 0, angle);
    dummy.scale.set(rivetRadius, rivetRadius * 0.8, rivetRadius);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

/**
 * Creates a clevis-ended mechanical linkage rod connecting two points or acting as a pushrod.
 */
export function createLinkageRod(length, radius, mats) {
  const group = new THREE.Group();

  const shaft = new THREE.Mesh(sharedCylGeo, mats.darkSteel);
  shaft.scale.set(radius, length, radius);
  shaft.position.y = length * 0.5;
  group.add(shaft);

  const collar = new THREE.Mesh(sharedHexGeo, mats.agedBrass);
  collar.scale.set(radius * 1.65, length * 0.18, radius * 1.65);
  collar.position.y = length * 0.5;
  group.add(collar);

  for (const yEnd of [0, length]) {
    const eye = new THREE.Mesh(sharedCylGeo, mats.titanium);
    eye.scale.set(radius * 2.1, radius * 1.4, radius * 2.1);
    eye.rotation.z = Math.PI / 2;
    eye.position.y = yEnd;
    group.add(eye);

    const pin = new THREE.Mesh(sharedCylGeo, mats.agedBrass);
    pin.scale.set(radius * 0.95, radius * 2.6, radius * 0.95);
    pin.rotation.z = Math.PI / 2;
    pin.position.y = yEnd;
    group.add(pin);
  }

  return group;
}

/**
 * Creates a complex multi-axis mechanical Wing Joint (Elbow or Carpal Wrist)
 * with bearing rings, sector gears, locking pawl, and clevis pivots.
 */
export function createWingJoint({
  radius = 0.065,
  width = 0.038,
  teethCount = 16,
  hasPawl = true,
  mats
}) {
  const group = new THREE.Group();

  const bearing = createBearing({
    outerRadius: radius,
    innerRadius: radius * 0.48,
    width,
    ballCount: 10,
    mats
  });
  bearing.rotation.x = Math.PI / 2;
  group.add(bearing);

  const gear = createGear({
    radius: radius * 0.88,
    thickness: width * 0.35,
    teeth: teethCount,
    boreRadius: radius * 0.45,
    spokes: 4,
    material: mats.agedBrass
  });
  gear.rotation.x = Math.PI / 2;
  gear.position.y = width * 0.45;
  group.add(gear);

  const yokeGeo = new THREE.TorusGeometry(radius * 1.15, radius * 0.12, 8, 20, Math.PI * 1.35);
  const yoke = new THREE.Mesh(yokeGeo, mats.titanium);
  yoke.rotation.x = Math.PI / 2;
  group.add(yoke);

  if (hasPawl) {
    const pawlGeo = new THREE.BoxGeometry(radius * 0.75, width * 0.28, radius * 0.22);
    const pawl = new THREE.Mesh(pawlGeo, mats.darkSteel);
    pawl.position.set(radius * 0.95, width * 0.45, radius * 0.45);
    pawl.rotation.y = -0.45;
    group.add(pawl);

    const pawlPin = new THREE.Mesh(sharedCylGeo, mats.paleGold);
    pawlPin.scale.set(radius * 0.12, width * 0.65, radius * 0.12);
    pawlPin.position.set(radius * 1.15, width * 0.45, radius * 0.55);
    group.add(pawlPin);
  }

  return { group, gear };
}
