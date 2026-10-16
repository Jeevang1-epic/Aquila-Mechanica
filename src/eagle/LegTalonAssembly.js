import * as THREE from 'three';
import {
  createGear,
  createBearing,
  createLinkageRod,
  createTalonDigit,
  createCovertFeatherGeometry,
  tagSelectable,
  registerExplodable
} from '../primitives.js';

export function buildLegTalonAssembly(side = 1, mats) {
  const legRoot = new THREE.Group();
  legRoot.name = side > 0 ? 'Leg_L' : 'Leg_R';
  legRoot.position.set(side * 0.165, -0.135, -0.06);

  // ============================================================================
  // 1. FEMUR & KNEE MECHANISM (Tucked Close to Ventral Body Flank)
  // ============================================================================
  const hipPivot = new THREE.Group();
  hipPivot.name = 'Femur';
  legRoot.add(hipPivot);

  const femurLen = 0.22;
  // Femur angles forward and slightly outward/downward from hip
  const kneePos = new THREE.Vector3(side * 0.025, -0.14, 0.16);

  const femurCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    kneePos.clone()
  ]);
  const femurSpar = new THREE.Mesh(
    new THREE.TubeGeometry(femurCurve, 8, 0.022, 10, false),
    mats.titanium
  );
  hipPivot.add(femurSpar);

  // Knee Bearing & Tibiotarsus Pivot
  const kneePivot = new THREE.Group();
  kneePivot.name = 'Tibiotarsus';
  kneePivot.position.copy(kneePos);
  hipPivot.add(kneePivot);

  const kneeBearing = createBearing({
    outerRadius: 0.036,
    innerRadius: 0.018,
    width: 0.024,
    ballCount: 8,
    mats
  });
  kneeBearing.rotation.y = Math.PI / 2;
  kneePivot.add(kneeBearing);

  // ============================================================================
  // 2. TIBIOTARSUS & FLEXOR ACTUATOR + BOOTED EAGLE CONTOUR ARMOR
  // ============================================================================
  // Tibiotarsus angles downward and rearward to the intertarsal ankle joint
  const anklePos = new THREE.Vector3(0, -0.26, -0.18);
  const tibioCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(side * 0.012, -0.13, -0.085),
    anklePos.clone()
  ]);

  const tibioSpar = new THREE.Mesh(
    new THREE.TubeGeometry(tibioCurve, 12, 0.018, 10, false),
    mats.titanium
  );
  kneePivot.add(tibioSpar);

  // Central Flexor Tendon Actuator Cylinder along posterior Tibiotarsus
  const flexorActuator = createLinkageRod(0.26, 0.0085, mats);
  flexorActuator.position.set(0, -0.02, -0.035);
  flexorActuator.rotation.x = -2.52;
  kneePivot.add(flexorActuator);

  // Sculpted Porcelain & Feather "Crus" Armor Shell (Golden Eagle booted leg fairing)
  const crusArmorGroup = new THREE.Group();
  kneePivot.add(crusArmorGroup);

  const crusShellGeo = new THREE.CylinderGeometry(0.034, 0.056, 0.24, 14, 1, true);
  const crusShell = new THREE.Mesh(crusShellGeo, mats.porcelainExterior);
  crusShell.position.set(side * 0.008, -0.12, -0.08);
  crusShell.rotation.x = 0.58;
  crusShell.userData.isExterior = true;
  crusArmorGroup.add(crusShell);

  // Layered feathered leg plates
  const legFeatherGeo = createCovertFeatherGeometry(0.14, 0.052, 0.014);
  for (let f = 0; f < 6; f++) {
    const lf = new THREE.Mesh(
      legFeatherGeo,
      f % 2 === 0 ? mats.covertPorcelain : mats.covertDark
    );
    const ang = (f / 6) * Math.PI * 1.4 - 0.4;
    lf.position.set(
      side * Math.cos(ang) * 0.042,
      -0.06 - (f % 3) * 0.055,
      -0.04 + Math.sin(ang) * 0.042
    );
    lf.rotation.set(1.15, side * ang, 0);
    lf.userData.isExterior = true;
    crusArmorGroup.add(lf);
  }
  registerExplodable(crusArmorGroup, [side * 0.16, 0.02, 0.08], 0.15, 0.55);

  // ============================================================================
  // 3. INTERTARSAL ANKLE JOINT, HEEL PULLEY & TARSOMETATARSUS WITH INSTANCED SCALES
  // ============================================================================
  const anklePivot = new THREE.Group();
  anklePivot.name = 'Tarsometatarsus';
  anklePivot.position.copy(anklePos);
  kneePivot.add(anklePivot);

  // Intertarsal Heel Pulley (Routes the flexor tendon cable across the back of the ankle!)
  const heelPulley = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.018, 16),
    mats.paleGold
  );
  heelPulley.rotation.z = Math.PI / 2;
  anklePivot.add(heelPulley);

  const ankleBracket = new THREE.Mesh(
    new THREE.TorusGeometry(0.031, 0.005, 8, 18),
    mats.darkSteel
  );
  ankleBracket.rotation.y = Math.PI / 2;
  anklePivot.add(ankleBracket);

  // Tarsometatarsus Lower-Leg Shaft extending downward & slightly forward to foot
  const tarsoLen = 0.23;
  const footPos = new THREE.Vector3(0, -0.21, 0.09);
  const tarsoCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    footPos.clone()
  ]);

  const tarsoShaft = new THREE.Mesh(
    new THREE.TubeGeometry(tarsoCurve, 10, 0.015, 10, false),
    mats.darkSteel
  );
  anklePivot.add(tarsoShaft);

  // Posterior Primary Flexor Tendon Cable running behind Tarsometatarsus
  const tendonCableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.01, -0.025),
    new THREE.Vector3(0, -0.10, 0.02),
    new THREE.Vector3(0, -0.20, 0.068)
  ]);
  const tendonCable = new THREE.Mesh(
    new THREE.TubeGeometry(tendonCableCurve, 10, 0.0038, 6, false),
    mats.springSteel
  );
  anklePivot.add(tendonCable);

  // Instanced Overlapping Scute Scale Armor Plates along Anterior Tarsometatarsus
  const scaleCount = 18;
  const scaleGeo = new THREE.CylinderGeometry(
    0.019,
    0.021,
    0.022,
    10,
    1,
    false,
    -Math.PI * 0.42,
    Math.PI * 0.84
  );
  const scaleInst = new THREE.InstancedMesh(scaleGeo, mats.porcelain, scaleCount);
  const brassScaleInst = new THREE.InstancedMesh(scaleGeo, mats.agedBrass, 6);

  const dummy = new THREE.Object3D();
  for (let s = 0; s < scaleCount; s++) {
    const t = (s + 0.5) / scaleCount;
    const pt = tarsoCurve.getPointAt(t);
    const colOffset = (s % 2 === 0 ? 1 : -1) * 0.004;
    dummy.position.set(pt.x + colOffset, pt.y, pt.z + 0.008);
    dummy.rotation.set(-0.42, colOffset * 8, 0);
    dummy.scale.set(1.0 - t * 0.15, 1.0, 0.85);
    dummy.updateMatrix();
    scaleInst.setMatrixAt(s, dummy.matrix);

    if (s % 3 === 0 && s / 3 < 6) {
      dummy.position.z += 0.002;
      dummy.scale.set(1.05 - t * 0.15, 0.45, 0.9);
      dummy.updateMatrix();
      brassScaleInst.setMatrixAt(Math.floor(s / 3), dummy.matrix);
    }
  }
  scaleInst.instanceMatrix.needsUpdate = true;
  brassScaleInst.instanceMatrix.needsUpdate = true;

  const scaleArmorHolder = new THREE.Group();
  scaleArmorHolder.add(scaleInst, brassScaleInst);
  anklePivot.add(scaleArmorHolder);
  registerExplodable(scaleArmorHolder, [side * 0.06, 0.02, 0.12], 0.55, 0.9);

  // ============================================================================
  // 4. TENDON-LOCK CAPTURE MECHANISM (Ratchet Wheel & Locking Pawl at Foot Base)
  // ============================================================================
  const footHub = new THREE.Group();
  footHub.name = 'TendonDrive';
  footHub.position.copy(footPos);
  anklePivot.add(footHub);

  // Toothed Ratchet Lock Gear
  const ratchetGear = createGear({
    radius: 0.026,
    thickness: 0.014,
    teeth: 14,
    boreRadius: 0.008,
    spokes: 0,
    material: mats.agedBrass
  });
  ratchetGear.rotation.y = Math.PI / 2;
  footHub.add(ratchetGear);

  // Articulated Spring-Loaded Locking Pawl Lever
  const ratchetPawl = new THREE.Group();
  ratchetPawl.position.set(0, 0.024, -0.018);
  footHub.add(ratchetPawl);

  const pawlTooth = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.008, 0.028),
    mats.paleGold
  );
  pawlTooth.position.set(0, -0.006, 0.012);
  pawlTooth.rotation.x = 0.45;
  ratchetPawl.add(pawlTooth);

  registerExplodable(anklePivot, [side * 0.08, -0.14, 0.04], 0.55, 0.92);

  // ============================================================================
  // 5. ANISODACTYL TALONS (3 Forward Digits + 1 Posterior Hallux)
  // ============================================================================
  const talonsGroup = new THREE.Group();
  talonsGroup.name = 'Talons';
  footHub.add(talonsGroup);

  // True avian phalangeal proportions & anisodactyl splay angles:
  // - Digit I (Hallux, posterior): 1 massive proximal phalange + huge killing claw
  // - Digit II (Medial inner toe): 2 phalanges + large inner claw
  // - Digit III (Central middle toe): 3 phalanges + long central claw
  // - Digit IV (Lateral outer toe): 3 shorter phalanges + outer claw
  const digitConfigs = [
    {
      name: 'Digit_III_Center',
      segments: [0.068, 0.058, 0.050],
      clawLen: 0.105,
      radius: 0.015,
      yaw: 0.0,
      posOffset: [0, -0.006, 0.018],
      explodeVec: [0, -0.06, 0.14],
      isHallux: false
    },
    {
      name: 'Digit_II_Medial',
      segments: [0.065, 0.056],
      clawLen: 0.118,
      radius: 0.0165,
      yaw: -side * 0.46,
      posOffset: [-side * 0.016, -0.005, 0.012],
      explodeVec: [-side * 0.08, -0.06, 0.11],
      isHallux: false
    },
    {
      name: 'Digit_IV_Lateral',
      segments: [0.052, 0.046, 0.042],
      clawLen: 0.088,
      radius: 0.0135,
      yaw: side * 0.52,
      posOffset: [side * 0.018, -0.006, 0.010],
      explodeVec: [side * 0.09, -0.06, 0.10],
      isHallux: false
    },
    {
      name: 'Digit_I_Hallux',
      segments: [0.072, 0.054],
      clawLen: 0.132, // Golden Eagle hallux claw is the largest predatory talon
      radius: 0.018,
      yaw: Math.PI,
      posOffset: [0, -0.004, -0.018],
      explodeVec: [0, -0.06, -0.14],
      isHallux: true
    }
  ];

  const digits = [];
  digitConfigs.forEach((cfg) => {
    const built = createTalonDigit({
      segmentLengths: cfg.segments,
      clawLength: cfg.clawLen,
      radius: cfg.radius,
      mats
    });
    built.root.name = cfg.name;
    built.root.position.set(...cfg.posOffset);
    built.root.rotation.y = cfg.yaw;
    talonsGroup.add(built.root);

    registerExplodable(built.root, cfg.explodeVec, 0.65, 0.98);
    digits.push({
      ...built,
      isHallux: cfg.isHallux,
      baseYaw: cfg.yaw
    });
  });

  tagSelectable(legRoot, 'tendon_lock_talons');

  return {
    root: legRoot,
    side,
    hipPivot,
    kneePivot,
    anklePivot,
    heelPulley,
    ratchetGear,
    ratchetPawl,
    digits
  };
}
