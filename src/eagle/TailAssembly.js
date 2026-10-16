import * as THREE from 'three';
import {
  createGear,
  createBearing,
  createFeather,
  createCovertFeatherGeometry,
  tagSelectable,
  registerExplodable
} from '../primitives.js';

export function buildTailAssembly(mats) {
  const tailRoot = new THREE.Group();
  tailRoot.name = 'Tail';
  tailRoot.position.set(0, -0.02, -0.43);

  // ============================================================================
  // 1. CAUDAL CONTROL GEARBOX (Pygostyle Differential & Cam Fan Mechanism)
  // ============================================================================
  const gearboxGroup = new THREE.Group();
  gearboxGroup.name = 'CaudalGearbox';
  tailRoot.add(gearboxGroup);

  // Main Pygostyle Gimbal Bearing
  const pygostyleBearing = createBearing({
    outerRadius: 0.068,
    innerRadius: 0.034,
    width: 0.028,
    ballCount: 10,
    mats
  });
  gearboxGroup.add(pygostyleBearing);

  // Central Differential Spur Gear & Meshed Fan-Spread Sector Gear
  const centerGear = createGear({
    radius: 0.052,
    thickness: 0.018,
    teeth: 16,
    boreRadius: 0.016,
    spokes: 4,
    material: mats.agedBrass
  });
  centerGear.rotation.x = Math.PI / 2;
  centerGear.position.set(0, 0.016, -0.045);
  gearboxGroup.add(centerGear);

  const pinionGear = createGear({
    radius: 0.032,
    thickness: 0.018,
    teeth: 10,
    boreRadius: 0.01,
    spokes: 0,
    material: mats.paleGold
  });
  pinionGear.rotation.x = Math.PI / 2;
  pinionGear.position.set(0, 0.016, 0.036);
  gearboxGroup.add(pinionGear);

  // Arcuate Brass Rectrix Root Mounting Bridge
  const bridgeArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.011, 8, 22, Math.PI * 0.85),
    mats.titanium
  );
  bridgeArc.rotation.x = Math.PI / 2;
  bridgeArc.rotation.z = -Math.PI * 0.925;
  bridgeArc.position.set(0, 0, -0.02);
  gearboxGroup.add(bridgeArc);

  // Dorsal & Ventral Porcelain/Enamel Tail Covert Fairing Shields
  const dorsalCovertGroup = new THREE.Group();
  gearboxGroup.add(dorsalCovertGroup);

  const upperShieldGeo = new THREE.SphereGeometry(
    0.135,
    18,
    12,
    -Math.PI * 0.4,
    Math.PI * 0.8,
    0.2,
    Math.PI * 0.45
  );
  upperShieldGeo.scale(0.95, 0.48, 1.35);
  const upperShield = new THREE.Mesh(upperShieldGeo, mats.porcelainExterior);
  upperShield.rotation.x = Math.PI * 0.55;
  upperShield.position.set(0, 0.032, -0.03);
  upperShield.userData.isExterior = true;
  dorsalCovertGroup.add(upperShield);

  // Layered tail covert feathers over the gearbox
  const tailCovertGeo = createCovertFeatherGeometry(0.24, 0.072, 0.016);
  for (let i = -3; i <= 3; i++) {
    const cov = new THREE.Mesh(
      tailCovertGeo,
      Math.abs(i) % 2 === 0 ? mats.covertPorcelain : mats.covertDark
    );
    cov.position.set(i * 0.024, 0.028 - Math.abs(i) * 0.004, -0.035);
    cov.rotation.set(-0.08, Math.PI - i * 0.08, 0);
    cov.userData.isExterior = true;
    dorsalCovertGroup.add(cov);
  }

  registerExplodable(dorsalCovertGroup, [0, 0.22, -0.14], 0.1, 0.5);
  registerExplodable(gearboxGroup, [0, 0.02, -0.18], 0.45, 0.85);

  // ============================================================================
  // 2. INDIVIDUALLY ARTICULATED RECTRICES (12 Tail Feathers)
  // ============================================================================
  const rectricesGroup = new THREE.Group();
  rectricesGroup.name = 'Rectrices';
  rectricesGroup.position.set(0, 0, -0.045);
  tailRoot.add(rectricesGroup);

  const numRectrices = 12;
  const rectrixPivots = [];

  for (let i = 0; i < numRectrices; i++) {
    // u from -1 (leftmost outer rectrix R6) to +1 (rightmost outer rectrix R6)
    const u = (i / (numRectrices - 1)) * 2 - 1;
    const absU = Math.abs(u);

    const pivot = new THREE.Group();
    // Arrange roots along the arcuate pygostyle bridge with clean vertical shingle overlap
    const rootAngle = u * 0.48;
    pivot.position.set(
      Math.sin(rootAngle) * 0.095,
      (1 - absU) * 0.014,
      -Math.cos(rootAngle) * 0.055
    );
    rectricesGroup.add(pivot);

    // Golden Eagle wedge/rounded-fan tail profile: central deck feathers slightly longer
    const rLen = 0.88 - absU * 0.11;
    const feather = createFeather({
      length: rLen,
      width: 0.135,
      curvature: 0.028,
      sweep: u * 0.03,
      mats,
      vaneMat: mats.featherVanePrimary,
      shaftMat: mats.porcelain
    });

    // Small brass actuator horn at root
    const actuatorHorn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.032, 6),
      mats.agedBrass
    );
    actuatorHorn.position.set(0, 0.015, 0.02);
    feather.add(actuatorHorn);

    // Point feather rearward (-Z)
    const baseYaw = Math.PI - u * 0.34;
    const basePitch = -0.06 - absU * 0.02;
    const baseRoll = u * 0.08;

    pivot.rotation.set(basePitch, baseYaw, baseRoll);
    pivot.add(feather);

    registerExplodable(
      pivot,
      [u * 0.28, (0.5 - absU) * 0.08, -0.32 - (1 - absU) * 0.12],
      0.24,
      0.72
    );

    rectrixPivots.push({
      pivot,
      u,
      absU,
      baseYaw,
      basePitch,
      baseRoll
    });
  }

  tagSelectable(tailRoot, 'caudal_gearbox');

  return {
    root: tailRoot,
    centerGear,
    pinionGear,
    rectrixPivots
  };
}
