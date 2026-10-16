import * as THREE from 'three';
import {
  sharedSphereGeo,
  sharedCylGeo,
  sharedTorusGeo,
  tagSelectable,
  registerExplodable
} from './core.js';
import { createRivetRing } from './hardware.js';

/**
 * Creates a complete Binocular Raptor Eye Assembly + Dual-Fovea Targeting Module
 * + Nictitating Optical Shutter + Articulated Enamel Eyelids.
 */
export function createOpticalEye({ radius = 0.062, side = 1, mats }) {
  const eyeRoot = new THREE.Group();

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.08, radius * 0.96, radius * 1.25, 24, 1, true),
    mats.agedBrass
  );
  barrel.rotation.z = -side * Math.PI / 2;
  eyeRoot.add(barrel);

  const bezelRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.04, radius * 0.08, 10, 28),
    mats.darkSteel
  );
  bezelRing.rotation.y = side * Math.PI / 2;
  bezelRing.position.x = side * radius * 0.52;
  eyeRoot.add(bezelRing);

  const rivets = createRivetRing({
    radius: radius * 1.04,
    count: 10,
    rivetRadius: 0.0032,
    material: mats.paleGold
  });
  rivets.rotation.y = side * Math.PI / 2;
  rivets.position.x = side * radius * 0.58;
  eyeRoot.add(rivets);

  // Multi-element Internal Lens Stack & Radial Iris Diaphragm
  const irisGroup = new THREE.Group();
  irisGroup.position.x = side * radius * 0.46;
  eyeRoot.add(irisGroup);

  const bladeCount = 12;
  const irisBlades = [];
  const bladeGeo = new THREE.BoxGeometry(radius * 0.46, radius * 0.16, 0.0025);
  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.rotation.x = angle;

    const blade = new THREE.Mesh(bladeGeo, mats.darkSteel);
    blade.position.set(0, radius * 0.52, (i % 2) * 0.0012);
    blade.rotation.z = 0.35;
    pivot.add(blade);
    irisGroup.add(pivot);
    irisBlades.push(blade);
  }

  const apertureRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.62, radius * 0.04, 8, 24),
    mats.paleGold
  );
  apertureRing.rotation.y = side * Math.PI / 2;
  apertureRing.position.x = -side * 0.004;
  irisGroup.add(apertureRing);

  // Smoked-Glass Corneal Dome
  const domeGeo = new THREE.SphereGeometry(
    radius * 0.96,
    24,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.48
  );
  const cornealDome = new THREE.Mesh(domeGeo, mats.smokedGlass);
  cornealDome.rotation.z = -side * Math.PI / 2;
  cornealDome.position.x = side * radius * 0.25;
  eyeRoot.add(cornealDome);

  // Dual-Fovea Optical Targeting Module
  const foveaModule = new THREE.Group();
  foveaModule.position.x = -side * radius * 0.15;
  eyeRoot.add(foveaModule);

  for (const zOff of [-radius * 0.35, radius * 0.35]) {
    const rail = new THREE.Mesh(sharedCylGeo, mats.titanium);
    rail.scale.set(0.0035, radius * 1.1, 0.0035);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 0, zOff);
    foveaModule.add(rail);
  }

  const retinalPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.48, radius * 0.48, 0.008, 18),
    mats.opticalGlint
  );
  retinalPlate.rotation.z = Math.PI / 2;
  foveaModule.add(retinalPlate);

  const lateralSensor = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.22, radius * 0.26, 0.018, 12),
    mats.paleGold
  );
  lateralSensor.rotation.z = Math.PI / 2;
  lateralSensor.position.set(side * 0.012, radius * 0.15, -radius * 0.28);
  lateralSensor.rotation.y = side * 0.32;
  foveaModule.add(lateralSensor);

  const foveaGimbal = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.56, 0.004, 8, 20),
    mats.agedBrass
  );
  foveaGimbal.rotation.y = Math.PI / 2;
  foveaModule.add(foveaGimbal);

  tagSelectable(foveaModule, 'dual_fovea');
  registerExplodable(foveaModule, [-side * 0.18, 0.04, -0.08], 0.65, 0.95);

  // Nictitating Membrane Shutter
  const nictitatingGroup = new THREE.Group();
  nictitatingGroup.position.x = side * radius * 0.27;
  eyeRoot.add(nictitatingGroup);

  const shutterGeo = new THREE.SphereGeometry(
    radius * 0.99,
    18,
    14,
    0,
    Math.PI * 0.85,
    0,
    Math.PI * 0.48
  );
  const shutterMesh = new THREE.Mesh(shutterGeo, mats.etchedMembrane);
  shutterMesh.rotation.z = -side * Math.PI / 2;
  shutterMesh.rotation.x = -1.35;
  nictitatingGroup.add(shutterMesh);

  const shutterActuator = new THREE.Mesh(sharedCylGeo, mats.agedBrass);
  shutterActuator.scale.set(0.005, 0.022, 0.005);
  shutterActuator.position.set(side * radius * 0.3, 0.01, radius * 0.88);
  nictitatingGroup.add(shutterActuator);

  tagSelectable(nictitatingGroup, 'nictitating_shield');
  registerExplodable(nictitatingGroup, [side * 0.14, 0.02, 0.08], 0.6, 0.9);

  // Upper and Lower Articulated Enamel Eyelids
  const upperLidGeo = new THREE.SphereGeometry(
    radius * 1.03,
    18,
    10,
    0,
    Math.PI,
    0,
    Math.PI * 0.46
  );
  const upperLid = new THREE.Mesh(upperLidGeo, mats.blackEnamel);
  upperLid.rotation.z = -side * Math.PI / 2;
  upperLid.rotation.x = -1.15;
  eyeRoot.add(upperLid);

  const lowerLid = new THREE.Mesh(upperLidGeo, mats.blackEnamel);
  lowerLid.rotation.z = -side * Math.PI / 2;
  lowerLid.rotation.x = 2.05;
  eyeRoot.add(lowerLid);

  tagSelectable(eyeRoot, 'binocular_eyes');

  return {
    root: eyeRoot,
    irisBlades,
    foveaModule,
    nictitatingShutter: shutterMesh,
    upperLid,
    lowerLid
  };
}

/**
 * Creates a multi-phalange articulated Talon Digit with hinge pins, bearings,
 * dorsal return springs, ventral tendon guides, and a curved carbon-steel claw.
 */
export function createTalonDigit({
  segmentLengths = [0.085, 0.072, 0.062],
  clawLength = 0.115,
  radius = 0.018,
  mats
}) {
  const digitRoot = new THREE.Group();
  const phalangePivots = [];

  let currentParent = digitRoot;
  let currentLength = 0;

  segmentLengths.forEach((segLen, idx) => {
    const pivot = new THREE.Group();
    pivot.position.z = currentLength;
    currentParent.add(pivot);
    phalangePivots.push(pivot);

    const rProx = radius * (1 - idx * 0.14);
    const rDist = radius * (1 - (idx + 1) * 0.14);

    const pin = new THREE.Mesh(sharedCylGeo, mats.agedBrass);
    pin.scale.set(rProx * 0.55, rProx * 2.4, rProx * 0.55);
    pin.rotation.z = Math.PI / 2;
    pivot.add(pin);

    const springRing = new THREE.Mesh(sharedTorusGeo, mats.paleGold);
    springRing.scale.setScalar(rProx * 0.85);
    springRing.rotation.y = Math.PI / 2;
    springRing.position.y = rProx * 0.45;
    pivot.add(springRing);

    const boneGeo = new THREE.CylinderGeometry(rDist, rProx, segLen, 10);
    boneGeo.rotateX(Math.PI / 2);
    boneGeo.translate(0, 0, segLen * 0.5);
    const boneMesh = new THREE.Mesh(boneGeo, mats.titanium);
    pivot.add(boneMesh);

    const armorGeo = new THREE.CylinderGeometry(
      rDist * 1.15,
      rProx * 1.15,
      segLen * 0.82,
      10,
      1,
      false,
      -Math.PI * 0.45,
      Math.PI * 0.9
    );
    armorGeo.rotateX(Math.PI / 2);
    armorGeo.translate(0, rProx * 0.12, segLen * 0.5);
    const armorMesh = new THREE.Mesh(armorGeo, mats.porcelain);
    pivot.add(armorMesh);

    const guideLoop = new THREE.Mesh(sharedTorusGeo, mats.darkSteel);
    guideLoop.scale.setScalar(rProx * 0.65);
    guideLoop.position.set(0, -rProx * 0.85, segLen * 0.5);
    pivot.add(guideLoop);

    if (idx > 0) {
      registerExplodable(pivot, [0, 0, 0.032 * idx], 0.75, 1.0);
    }

    currentParent = pivot;
    currentLength = segLen;
  });

  const clawPivot = new THREE.Group();
  clawPivot.position.z = currentLength;
  currentParent.add(clawPivot);
  phalangePivots.push(clawPivot);

  const sheathR = radius * 0.68;
  const sheath = new THREE.Mesh(
    new THREE.CylinderGeometry(sheathR * 0.82, sheathR * 1.05, 0.026, 12),
    mats.blackEnamel
  );
  sheath.rotation.x = Math.PI / 2;
  sheath.position.z = 0.012;
  clawPivot.add(sheath);

  const clawCurvePts = [];
  const clawSegs = 12;
  for (let i = 0; i <= clawSegs; i++) {
    const t = i / clawSegs;
    const angle = t * Math.PI * 0.58;
    const z = Math.sin(angle) * clawLength;
    const y = -(1 - Math.cos(angle)) * clawLength * 0.92;
    clawCurvePts.push(new THREE.Vector3(0, y, z));
  }
  const clawCurve = new THREE.CatmullRomCurve3(clawCurvePts);
  const clawGeo = new THREE.TubeGeometry(clawCurve, 14, sheathR * 0.78, 8, false);

  const pos = clawGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const ringIdx = Math.floor(i / 9);
    const t = ringIdx / 14;
    const center = clawCurve.getPointAt(Math.min(1, t));
    v.fromBufferAttribute(pos, i);
    const taper = Math.pow(1 - t, 0.85);
    v.x = center.x + (v.x - center.x) * taper * 0.72;
    v.y = center.y + (v.y - center.y) * taper;
    v.z = center.z + (v.z - center.z) * taper;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  clawGeo.computeVertexNormals();

  const clawMesh = new THREE.Mesh(clawGeo, mats.polishedDarkSteel);
  clawPivot.add(clawMesh);
  registerExplodable(clawPivot, [0, -0.025, 0.045], 0.8, 1.0);

  return { root: digitRoot, phalangePivots };
}

/**
 * Creates a Pneumatic Air-Sac Chamber with articulated brass bellows rings
 * and smoked-glass translucent membrane.
 */
export function createAirSac({
  radiusX = 0.09,
  radiusY = 0.07,
  radiusZ = 0.14,
  ribCount = 5,
  mats
}) {
  const group = new THREE.Group();

  const sacMesh = new THREE.Mesh(sharedSphereGeo, mats.etchedMembrane);
  sacMesh.scale.set(radiusX, radiusY, radiusZ);
  group.add(sacMesh);

  for (let i = 0; i < ribCount; i++) {
    const t = (i + 1) / (ribCount + 1);
    const zPos = (t - 0.5) * 2 * radiusZ * 0.85;
    const profileScale = Math.sqrt(Math.max(0.1, 1 - Math.pow((t - 0.5) * 1.75, 2)));
    const ring = new THREE.Mesh(sharedTorusGeo, mats.agedBrass);
    ring.scale.set(radiusX * profileScale * 1.03, radiusY * profileScale * 1.03, 0.45);
    ring.position.z = zPos;
    group.add(ring);
  }

  const valve = new THREE.Mesh(sharedCylGeo, mats.agedBrass);
  valve.scale.set(radiusX * 0.32, 0.028, radiusX * 0.32);
  valve.rotation.x = Math.PI / 2;
  valve.position.z = radiusZ;
  group.add(valve);

  return { group, sacMesh };
}

/**
 * Creates one nested mechanical vertebra segment of the Cervical Stabilization Column.
 */
export function createCervicalSegment({
  index = 0,
  radius = 0.095,
  height = 0.055,
  mats
}) {
  const segGroup = new THREE.Group();

  const ringGeo = new THREE.TorusGeometry(radius, radius * 0.14, 10, 22);
  const ring = new THREE.Mesh(ringGeo, mats.titanium);
  ring.rotation.x = Math.PI / 2;
  segGroup.add(ring);

  for (const angle of [Math.PI * 0.5, -Math.PI * 0.15, Math.PI * 1.15]) {
    const proc = new THREE.Mesh(sharedCylGeo, mats.darkSteel);
    proc.scale.set(0.008, radius * 0.45, 0.008);
    proc.position.set(
      Math.cos(angle) * (radius * 1.15),
      0,
      -Math.sin(angle) * (radius * 1.15)
    );
    proc.rotation.z = angle - Math.PI / 2;
    proc.rotation.x = Math.PI / 2;
    segGroup.add(proc);
  }

  const coreSpring = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.38, radius * 0.38, height * 0.85, 12),
    mats.paleGold
  );
  segGroup.add(coreSpring);

  const collarMat = index % 2 === 0 ? mats.porcelainExterior : mats.blackEnamel;
  const collarGeo = new THREE.CylinderGeometry(
    radius * 1.22,
    radius * 1.32,
    height * 0.92,
    18,
    1,
    true,
    -Math.PI * 0.65,
    Math.PI * 1.3
  );
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.rotation.y = Math.PI;
  collar.userData.isExterior = true;
  segGroup.add(collar);

  return { segGroup, collar };
}
