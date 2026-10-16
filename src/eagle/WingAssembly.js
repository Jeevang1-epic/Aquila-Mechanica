import * as THREE from 'three';
import {
  createWingJoint,
  createPrimaryFeather,
  createFeather,
  createCovertFeatherGeometry,
  createLinkageRod,
  createBearing,
  createRivetRing,
  tagSelectable,
  registerExplodable
} from '../primitives.js';

export function buildWingAssembly(side = 1, mats) {
  const wingRoot = new THREE.Group();
  wingRoot.name = side > 0 ? 'Wing_L' : 'Wing_R';
  wingRoot.position.set(side * 0.235, 0.175, 0.235);

  // ============================================================================
  // 1. GLENOHUMERAL FLIGHT JOINT (Shoulder Gimbal, Bearings & Cam Track)
  // ============================================================================
  const shoulderHousing = new THREE.Group();
  shoulderHousing.name = 'Shoulder';
  wingRoot.add(shoulderHousing);

  // Outer stationary titanium gimbal ring & cam stop arc
  const outerGimbal = new THREE.Mesh(
    new THREE.TorusGeometry(0.078, 0.011, 10, 24),
    mats.darkSteel
  );
  outerGimbal.rotation.y = side * Math.PI * 0.35;
  shoulderHousing.add(outerGimbal);

  const camTrack = new THREE.Mesh(
    new THREE.TorusGeometry(0.066, 0.006, 8, 20, Math.PI * 1.25),
    mats.agedBrass
  );
  camTrack.rotation.y = side * Math.PI * 0.5;
  shoulderHousing.add(camTrack);

  const shoulderBearing = createBearing({
    outerRadius: 0.056,
    innerRadius: 0.028,
    width: 0.024,
    ballCount: 10,
    mats
  });
  shoulderBearing.rotation.y = side * Math.PI * 0.5;
  shoulderHousing.add(shoulderBearing);

  // Porcelain scapular-humeral shoulder cap shield
  const shoulderCapGeo = new THREE.SphereGeometry(
    0.088,
    18,
    12,
    0,
    Math.PI,
    0,
    Math.PI * 0.55
  );
  const shoulderCap = new THREE.Mesh(shoulderCapGeo, mats.porcelainExterior);
  shoulderCap.rotation.x = -Math.PI * 0.35;
  shoulderCap.rotation.z = -side * 0.35;
  shoulderCap.position.set(side * 0.02, 0.035, 0.01);
  shoulderCap.userData.isExterior = true;
  shoulderHousing.add(shoulderCap);
  registerExplodable(shoulderCap, [side * 0.12, 0.16, 0.06], 0.25, 0.65);

  tagSelectable(shoulderHousing, 'shoulder_joint');
  registerExplodable(shoulderHousing, [side * 0.14, 0.06, 0.04], 0.5, 0.85);

  // Articulating Shoulder Pivot (controls wing elevation/depression, sweep, and pitch)
  const shoulderPivot = new THREE.Group();
  shoulderPivot.name = 'ShoulderPivot';
  wingRoot.add(shoulderPivot);

  // ============================================================================
  // 2. HUMERUS SPAR (Hollow Titanium/Porcelain Truss Beam & Pantograph Link)
  // ============================================================================
  const humerusGroup = new THREE.Group();
  humerusGroup.name = 'Humerus';
  shoulderPivot.add(humerusGroup);

  const humerusLen = 0.50;
  const elbowLocalPos = new THREE.Vector3(side * humerusLen, -0.015, -0.14);

  // Main Humerus Curved Structural Spar
  const humCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(side * humerusLen * 0.48, 0.008, -0.055),
    elbowLocalPos.clone()
  ]);
  const humTube = new THREE.Mesh(
    new THREE.TubeGeometry(humCurve, 14, 0.022, 10, false),
    mats.titanium
  );
  humerusGroup.add(humTube);

  // Porcelain Deltopectoral Crest & Reinforcement Ribs along Humerus
  const crestGeo = new THREE.BoxGeometry(0.16, 0.016, 0.055);
  const crestMesh = new THREE.Mesh(crestGeo, mats.porcelain);
  crestMesh.position.set(side * 0.13, 0.005, 0.012);
  crestMesh.rotation.y = side * 0.24;
  humerusGroup.add(crestMesh);

  for (let r = 1; r <= 5; r++) {
    const t = r / 6;
    const pt = humCurve.getPointAt(t);
    const rib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.012, 12),
      r % 2 === 0 ? mats.porcelain : mats.agedBrass
    );
    rib.rotation.z = Math.PI / 2;
    rib.position.copy(pt);
    humerusGroup.add(rib);
  }

  // Parallel Four-Bar Mechanical Synchronizer Rod along Humerus (drives automatic elbow-wrist coupling)
  const humSyncRod = createLinkageRod(humerusLen * 0.94, 0.0055, mats);
  humSyncRod.position.set(side * 0.03, -0.018, 0.024);
  humSyncRod.rotation.z = -side * Math.PI * 0.49;
  humSyncRod.rotation.y = -side * 0.28;
  humerusGroup.add(humSyncRod);

  tagSelectable(humerusGroup, 'wing_spars');
  registerExplodable(humerusGroup, [side * 0.16, 0.04, -0.06], 0.4, 0.78);

  // ============================================================================
  // 3. ELBOW JOINT & RADIUS/ULNA SPARS (Forearm Section)
  // ============================================================================
  const elbowPivot = new THREE.Group();
  elbowPivot.name = 'Elbow';
  elbowPivot.position.copy(elbowLocalPos);
  shoulderPivot.add(elbowPivot);

  const elbowJoint = createWingJoint({
    radius: 0.046,
    width: 0.028,
    teethCount: 16,
    hasPawl: false,
    mats
  });
  elbowPivot.add(elbowJoint.group);

  const forearmGroup = new THREE.Group();
  forearmGroup.name = 'RadiusUlna';
  elbowPivot.add(forearmGroup);

  const forearmLen = 0.66;
  const wristLocalPos = new THREE.Vector3(side * forearmLen, 0.01, 0.15);

  // Anterior Straight Radius Spar (Titanium beam + wrist push-pull linkage)
  const radiusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.02, 0.008, 0.024),
    new THREE.Vector3(side * forearmLen * 0.5, 0.012, 0.095),
    new THREE.Vector3(wristLocalPos.x, wristLocalPos.y + 0.006, wristLocalPos.z + 0.018)
  ]);
  const radiusSpar = new THREE.Mesh(
    new THREE.TubeGeometry(radiusCurve, 14, 0.011, 8, false),
    mats.titanium
  );
  forearmGroup.add(radiusSpar);

  // Posterior Bowed Ulna Spar (Main feather-bearing structural beam)
  const ulnaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.004, -0.018),
    new THREE.Vector3(side * forearmLen * 0.48, 0.0, 0.018),
    new THREE.Vector3(wristLocalPos.x, wristLocalPos.y - 0.004, wristLocalPos.z - 0.022)
  ]);
  const ulnaSpar = new THREE.Mesh(
    new THREE.TubeGeometry(ulnaCurve, 16, 0.016, 10, false),
    mats.porcelain
  );
  forearmGroup.add(ulnaSpar);

  // Cross-bracing titanium struts between Radius and Ulna
  for (let b = 1; b <= 4; b++) {
    const t = b / 5;
    const pR = radiusCurve.getPointAt(t);
    const pU = ulnaCurve.getPointAt(t);
    const mid = new THREE.Vector3().addVectors(pR, pU).multiplyScalar(0.5);
    const dist = pR.distanceTo(pU);

    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0045, 0.0045, dist, 8),
      mats.darkSteel
    );
    strut.position.copy(mid);
    strut.rotation.x = Math.PI / 2;
    forearmGroup.add(strut);
  }

  // 12 Precision Feather-Mounting Micro-Bearings along the trailing edge of the Ulna
  const numSecondaries = 12;
  const secondarySocketGroup = new THREE.Group();
  forearmGroup.add(secondarySocketGroup);

  for (let s = 0; s < numSecondaries; s++) {
    const t = (s + 0.6) / numSecondaries;
    const pt = ulnaCurve.getPointAt(t);
    const socketRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.024, 12),
      mats.agedBrass
    );
    socketRing.rotation.x = Math.PI / 2;
    socketRing.position.set(pt.x, pt.y - 0.006, pt.z - 0.018);
    secondarySocketGroup.add(socketRing);
  }

  tagSelectable(elbowPivot, 'wing_spars');
  registerExplodable(forearmGroup, [side * 0.22, 0.04, 0.06], 0.38, 0.78);

  // ============================================================================
  // 4. SECONDARY FLIGHT FEATHERS (S1–S12 along Ulna + Tertials)
  // ============================================================================
  const secondariesGroup = new THREE.Group();
  secondariesGroup.name = 'Secondaries';
  forearmGroup.add(secondariesGroup);

  const secondaryPivots = [];
  for (let s = 0; s < numSecondaries; s++) {
    // u = 0 at proximal elbow (inner tertials), u = 1 at distal wrist (S1)
    const u = (s + 0.5) / numSecondaries;
    const ulnaPt = ulnaCurve.getPointAt(u);

    const secPivot = new THREE.Group();
    secPivot.position.set(ulnaPt.x, ulnaPt.y - 0.004 + s * 0.0008, ulnaPt.z - 0.015);
    secondariesGroup.add(secPivot);

    const featherLen = 0.64 + Math.sin(u * Math.PI * 0.85) * 0.14;
    const secFeather = createFeather({
      length: featherLen,
      width: 0.125,
      curvature: 0.036,
      sweep: -side * (0.02 + u * 0.04),
      mats,
      vaneMat: s % 3 === 0 ? mats.featherVaneTranslucent : mats.featherVanePrimary,
      shaftMat: mats.porcelain
    });

    // Orient feather rearward (-Z) and fanned slightly outward
    const baseYaw = Math.PI - side * (0.06 + u * 0.24);
    const basePitch = -0.05 + Math.sin(u * Math.PI) * 0.03;
    const baseBank = side * 0.04;
    secPivot.rotation.set(basePitch, baseYaw, baseBank);
    secPivot.add(secFeather);

    secondaryPivots.push({
      pivot: secPivot,
      basePitch,
      baseYaw,
      baseBank,
      u
    });
  }

  tagSelectable(secondariesGroup, 'secondary_feathers');
  registerExplodable(secondariesGroup, [side * 0.12, -0.06, -0.34], 0.22, 0.62);

  // ============================================================================
  // 5. LAYERED COVERT FEATHERS (Dorsal & Ventral InstancedMesh Arrays)
  //    Conceal feather roots in normal view; slide away in Exploded View!
  // ============================================================================
  const covertsGroup = new THREE.Group();
  covertsGroup.name = 'Coverts';
  forearmGroup.add(covertsGroup);

  const covertGeo = createCovertFeatherGeometry(0.24, 0.076, 0.018);
  const covertRows = 3;
  const covertCols = 13;
  const dorsalCovertInst = new THREE.InstancedMesh(
    covertGeo,
    mats.covertPorcelain,
    covertRows * covertCols
  );
  const ventralCovertInst = new THREE.InstancedMesh(
    covertGeo,
    mats.covertDark,
    2 * covertCols
  );
  dorsalCovertInst.castShadow = true;
  dorsalCovertInst.receiveShadow = true;
  dorsalCovertInst.userData.isExterior = true;
  ventralCovertInst.userData.isExterior = true;

  const dummy = new THREE.Object3D();
  let cIdx = 0;
  for (let r = 0; r < covertRows; r++) {
    const rowT = r / (covertRows - 1);
    for (let c = 0; c < covertCols; c++) {
      const colU = (c + 0.3) / covertCols;
      const pR = radiusCurve.getPointAt(colU);
      const pU = ulnaCurve.getPointAt(colU);
      const pos = new THREE.Vector3().lerpVectors(pR, pU, 0.25 + rowT * 0.65);
      pos.y += 0.022 - rowT * 0.006;
      pos.z += 0.02 - rowT * 0.055;

      dummy.position.copy(pos);
      dummy.rotation.set(
        -0.06 - rowT * 0.04,
        Math.PI - side * (0.05 + colU * 0.22),
        side * 0.05
      );
      const sScale = (0.78 + rowT * 0.36) * (0.88 + Math.sin(colU * Math.PI) * 0.18);
      dummy.scale.setScalar(sScale);
      dummy.updateMatrix();
      dorsalCovertInst.setMatrixAt(cIdx++, dummy.matrix);
    }
  }
  dorsalCovertInst.instanceMatrix.needsUpdate = true;

  let vIdx = 0;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < covertCols; c++) {
      const colU = (c + 0.3) / covertCols;
      const pU = ulnaCurve.getPointAt(colU);
      dummy.position.set(pU.x, pU.y - 0.018 + r * 0.004, pU.z + 0.02 - r * 0.05);
      dummy.rotation.set(
        0.05,
        Math.PI - side * (0.05 + colU * 0.22),
        Math.PI
      );
      dummy.scale.setScalar(0.75 + r * 0.25);
      dummy.updateMatrix();
      ventralCovertInst.setMatrixAt(vIdx++, dummy.matrix);
    }
  }
  ventralCovertInst.instanceMatrix.needsUpdate = true;

  const dorsalCovertHolder = new THREE.Group();
  dorsalCovertHolder.add(dorsalCovertInst);
  covertsGroup.add(dorsalCovertHolder);

  const ventralCovertHolder = new THREE.Group();
  ventralCovertHolder.add(ventralCovertInst);
  covertsGroup.add(ventralCovertHolder);

  // Slide coverts away early in Exploded View (0.05 -> 0.45) to expose feather-root bearings!
  registerExplodable(dorsalCovertHolder, [side * 0.06, 0.22, 0.14], 0.05, 0.45);
  registerExplodable(ventralCovertHolder, [side * 0.06, -0.18, 0.12], 0.05, 0.45);
  tagSelectable(covertsGroup, 'secondary_feathers', true);

  // ============================================================================
  // 6. CARPAL FOLDING JOINT (Wrist Assembly) & CARPOMETACARPUS HAND
  // ============================================================================
  const wristPivot = new THREE.Group();
  wristPivot.name = 'Wrist';
  wristPivot.position.copy(wristLocalPos);
  forearmGroup.add(wristPivot);

  const carpalJoint = createWingJoint({
    radius: 0.042,
    width: 0.026,
    teethCount: 14,
    hasPawl: true,
    mats
  });
  wristPivot.add(carpalJoint.group);

  // Crossed Four-Bar Carpal Linkage Rods
  for (const zOff of [-0.016, 0.016]) {
    const crossLink = createLinkageRod(0.085, 0.004, mats);
    crossLink.position.set(0, 0.014, zOff);
    crossLink.rotation.z = -side * 1.15;
    crossLink.rotation.y = side * (zOff > 0 ? 0.35 : -0.35);
    carpalJoint.group.add(crossLink);
  }

  tagSelectable(carpalJoint.group, 'carpal_joint');
  registerExplodable(carpalJoint.group, [side * 0.08, 0.08, 0.08], 0.48, 0.85);

  // Carpometacarpus & Digit Hand Structure (Fused Twin-Bar Avian Hand Frame)
  const handGroup = new THREE.Group();
  handGroup.name = 'Carpometacarpus';
  wristPivot.add(handGroup);

  const handLen = 0.44;
  const majorMetacarpalCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0.012),
    new THREE.Vector3(side * handLen * 0.55, -0.004, -0.015),
    new THREE.Vector3(side * handLen, -0.012, -0.065)
  ]);
  const minorMetacarpalCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.004, -0.018),
    new THREE.Vector3(side * handLen * 0.52, -0.012, -0.052),
    new THREE.Vector3(side * handLen, -0.012, -0.065)
  ]);

  const majorSpar = new THREE.Mesh(
    new THREE.TubeGeometry(majorMetacarpalCurve, 12, 0.012, 8, false),
    mats.titanium
  );
  const minorSpar = new THREE.Mesh(
    new THREE.TubeGeometry(minorMetacarpalCurve, 12, 0.008, 8, false),
    mats.darkSteel
  );
  handGroup.add(majorSpar, minorSpar);

  // Porcelain Leading-Edge Hand Fairing
  const handFairing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.016, handLen * 0.88, 10),
    mats.porcelainExterior
  );
  handFairing.rotation.z = side * Math.PI / 2;
  handFairing.rotation.y = -side * 0.16;
  handFairing.position.set(side * handLen * 0.45, 0.008, 0.002);
  handFairing.userData.isExterior = true;
  handGroup.add(handFairing);
  registerExplodable(handFairing, [side * 0.12, 0.14, 0.12], 0.12, 0.5);

  // ============================================================================
  // 7. ALULA ASSEMBLY (Leading-Edge High-Lift Slat Mechanism)
  // ============================================================================
  const alulaGroup = new THREE.Group();
  alulaGroup.name = 'Alula';
  alulaGroup.position.set(side * 0.045, 0.014, 0.028);
  wristPivot.add(alulaGroup);

  // Alula Thumb Pivot & Brass Torsion Actuator
  const alulaHinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.024, 12),
    mats.agedBrass
  );
  alulaGroup.add(alulaHinge);

  // 3 Layered Alula Feathers forming the leading-edge slot
  for (let a = 0; a < 3; a++) {
    const alulaFeather = createPrimaryFeather({
      length: 0.24 + a * 0.055,
      width: 0.048,
      sweep: 0.05 + a * 0.018,
      twist: 0.04,
      rachisRadius: 0.0045,
      emargination: 0.15,
      side,
      mats
    });
    alulaFeather.position.set(side * a * 0.028, 0.004 - a * 0.002, 0.008 - a * 0.006);
    alulaFeather.rotation.y = -side * (0.14 + a * 0.08);
    alulaGroup.add(alulaFeather);
  }

  tagSelectable(alulaGroup, 'alula_control');
  registerExplodable(alulaGroup, [side * 0.14, 0.12, 0.22], 0.2, 0.65);

  // ============================================================================
  // 8. PRIMARY FEATHERS (P1–P10 Individually Articulated & Slotted Fingers)
  // ============================================================================
  const primariesGroup = new THREE.Group();
  primariesGroup.name = 'Primaries';
  handGroup.add(primariesGroup);

  const numPrimaries = 10;
  const primaryPivots = [];

  // Synchronized Pitch-Control Bus Bar connecting all 10 primary feather root horns
  const busBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0035, 0.0035, handLen * 0.92, 8),
    mats.paleGold
  );
  busBar.rotation.z = Math.PI / 2;
  busBar.rotation.y = -side * 0.16;
  busBar.position.set(side * handLen * 0.48, -0.022, -0.045);
  primariesGroup.add(busBar);

  for (let p = 0; p < numPrimaries; p++) {
    // p = 0 is innermost primary (P1 near wrist), p = 9 is outermost leading primary (P10)
    const u = p / (numPrimaries - 1);
    const anchorPt = majorMetacarpalCurve.getPointAt(0.08 + u * 0.90);

    const primPivot = new THREE.Group();
    // Slight vertical imbrication offset so adjacent primaries never z-fight or clip when folding
    primPivot.position.set(
      anchorPt.x,
      anchorPt.y + (numPrimaries - p) * 0.0014,
      anchorPt.z - 0.012
    );
    primariesGroup.add(primPivot);

    // Golden Eagle primary lengths: P6-P8 are longest, P9-P10 slightly shorter leading fingers, P1-P5 transition to secondaries
    const lengthProfile =
      p < 5
        ? 0.78 + p * 0.075
        : p <= 7
          ? 1.18 + (p - 5) * 0.065
          : 1.24 - (p - 7) * 0.11;

    // Outer primaries (P6–P10) have pronounced emargination creating the iconic slotted "fingers"
    const emarg = p >= 5 ? 0.45 + (p - 5) * 0.11 : 0.08;
    const sweepVal = 0.16 + (1 - u) * 0.16;

    const primaryFeather = createPrimaryFeather({
      length: lengthProfile,
      width: 0.132 - u * 0.018,
      sweep: sweepVal,
      twist: 0.06 + u * 0.05,
      rachisRadius: 0.0068 + u * 0.0018,
      emargination: emarg,
      side,
      mats
    });
    primPivot.add(primaryFeather);

    // Fan angles: P10 (u=1) points almost straight outward along the leading edge;
    // P1 (u=0) sweeps rearward (~72 deg) to meet S1 seamlessly!
    const spreadYaw = -side * ((1 - u) * 1.18 + 0.04);
    const basePitch = 0.02 - u * 0.04;
    const baseDihedral = side * (u * 0.09); // Upward tip curl on outer primaries

    primPivot.rotation.set(basePitch, spreadYaw, baseDihedral);

    // Progressive exploded displacement per primary feather
    registerExplodable(
      primPivot,
      [
        side * (0.14 + u * 0.34),
        (u - 0.4) * 0.08,
        -(1 - u) * 0.28 + u * 0.08
      ],
      0.22,
      0.68
    );

    primaryPivots.push({
      pivot: primPivot,
      index: p,
      u,
      basePitch,
      spreadYaw,
      baseDihedral
    });
  }

  tagSelectable(primariesGroup, 'primary_feathers');

  return {
    root: wingRoot,
    side,
    shoulderPivot,
    elbowPivot,
    elbowGear: elbowJoint.gear,
    wristPivot,
    wristGear: carpalJoint.gear,
    alulaGroup,
    primaryPivots,
    secondaryPivots,
    busBar
  };
}
