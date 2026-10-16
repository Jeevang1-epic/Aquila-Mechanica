import * as THREE from 'three';
import {
  createOpticalEye,
  createRivetRing,
  createLinkageRod,
  createFeather,
  tagSelectable,
  registerExplodable
} from '../primitives.js';

export function buildHeadAssembly(mats) {
  const headRoot = new THREE.Group();
  headRoot.name = 'Head';

  // ============================================================================
  // 1. CRANIAL HOUSING (Internal Titanium Frame + Removable Porcelain Shells)
  // ============================================================================
  const cranialGroup = new THREE.Group();
  cranialGroup.name = 'CranialHousing';
  headRoot.add(cranialGroup);

  // Internal machined titanium neurocranium core & structural ribs
  const coreChassis = new THREE.Group();
  cranialGroup.add(coreChassis);

  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const z = -0.09 + t * 0.18;
    const rx = 0.088 * (1 - t * 0.35);
    const ry = 0.078 * (1 - t * 0.32);
    const ribGeo = new THREE.TorusGeometry(rx, 0.006, 8, 20);
    const rib = new THREE.Mesh(ribGeo, mats.titanium);
    rib.scale.set(1, ry / rx, 1);
    rib.position.set(0, 0.01, z);
    coreChassis.add(rib);
  }

  // Central sagittal titanium keel bar inside skull
  const sagittalBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.11, 0.24),
    mats.titanium
  );
  sagittalBar.position.set(0, 0.02, 0.01);
  coreChassis.add(sagittalBar);

  // Dorsal Crown Plate (Warm Ivory Porcelain with engraved seam)
  const crownGeo = new THREE.SphereGeometry(
    0.118,
    24,
    16,
    -Math.PI * 0.35,
    Math.PI * 0.7,
    0.12,
    Math.PI * 0.55
  );
  crownGeo.scale(0.88, 0.74, 1.38);
  const crownPlate = new THREE.Mesh(crownGeo, mats.porcelainExterior);
  crownPlate.rotation.x = -Math.PI * 0.45;
  crownPlate.position.set(0, 0.022, 0.01);
  crownPlate.userData.isExterior = true;
  cranialGroup.add(crownPlate);
  registerExplodable(crownPlate, [0, 0.16, -0.04], 0.55, 0.88);

  // Removable Left & Right Lateral Cranial Side Plates + Predatory Supraorbital Brow Ridges
  for (const side of [1, -1]) {
    const sidePlateGroup = new THREE.Group();
    cranialGroup.add(sidePlateGroup);

    // Sculpted temporal/parietal side plate
    const sideGeo = new THREE.SphereGeometry(
      0.112,
      20,
      14,
      side > 0 ? -0.15 : Math.PI - 0.85,
      1.0,
      0.28,
      Math.PI * 0.52
    );
    sideGeo.scale(0.86, 0.78, 1.32);
    const sideMesh = new THREE.Mesh(sideGeo, mats.porcelainExterior);
    sideMesh.position.set(side * 0.006, 0.008, -0.01);
    sideMesh.userData.isExterior = true;
    sidePlateGroup.add(sideMesh);

    // Sharp Supraorbital Brow Ridge (gives Golden Eagle its fierce, forward-focused gaze)
    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.042, 0.064, 0.135),
      new THREE.Vector3(side * 0.088, 0.068, 0.075),
      new THREE.Vector3(side * 0.095, 0.052, -0.005)
    ]);
    const browGeo = new THREE.TubeGeometry(browCurve, 12, 0.013, 8, false);
    browGeo.scale(1.25, 0.65, 1.0);
    const browMesh = new THREE.Mesh(browGeo, mats.porcelainExterior);
    browMesh.userData.isExterior = true;
    sidePlateGroup.add(browMesh);

    // Black enamel accent trim under brow ridge
    const browTrimGeo = new THREE.TubeGeometry(browCurve, 12, 0.007, 6, false);
    const browTrim = new THREE.Mesh(browTrimGeo, mats.blackEnamel);
    browTrim.position.set(side * 0.003, -0.005, 0.002);
    sidePlateGroup.add(browTrim);

    // Micro fasteners along side plate
    for (const zFast of [-0.05, 0.02, 0.08]) {
      const screw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.006, 6),
        mats.agedBrass
      );
      screw.rotation.z = Math.PI / 2;
      screw.position.set(side * 0.086, 0.032, zFast);
      sidePlateGroup.add(screw);
    }

    registerExplodable(sidePlateGroup, [side * 0.18, 0.06, 0.02], 0.5, 0.85);
  }

  // Golden Eagle Nape Hackle Plumage (Articulated porcelain & pale-gold crown/nape feathers)
  const napeGroup = new THREE.Group();
  napeGroup.position.set(0, 0.035, -0.08);
  cranialGroup.add(napeGroup);

  const napeRows = 3;
  for (let r = 0; r < napeRows; r++) {
    const count = 5 + r * 2;
    for (let i = 0; i < count; i++) {
      const u = (i / (count - 1)) - 0.5;
      const hackle = createFeather({
        length: 0.13 + r * 0.025,
        width: 0.038,
        curvature: 0.015,
        sweep: u * 0.02,
        mats,
        vaneMat: r === 1 ? mats.paleGold : mats.covertPorcelain,
        shaftMat: mats.agedBrass
      });
      hackle.position.set(
        Math.sin(u * 1.3) * (0.075 + r * 0.012),
        0.025 - r * 0.022 - Math.abs(u) * 0.02,
        -r * 0.035
      );
      hackle.rotation.set(
        -0.25 - r * 0.12,
        Math.PI + u * 0.65,
        -u * 0.35
      );
      hackle.userData.isExterior = true;
      napeGroup.add(hackle);
    }
  }
  registerExplodable(napeGroup, [0, 0.14, -0.16], 0.1, 0.45);

  tagSelectable(cranialGroup, 'cranial_housing', true);

  // ============================================================================
  // 2. BINOCULAR RAPTOR EYES, DUAL-FOVEA & NICTITATING MEMBRANES
  // ============================================================================
  const eyeLeft = createOpticalEye({ radius: 0.044, side: 1, mats });
  eyeLeft.root.name = 'Eye_L';
  eyeLeft.root.position.set(0.056, 0.024, 0.065);
  // Raptor forward binocular convergence (~28 deg toward +Z)
  eyeLeft.root.rotation.set(0.05, -0.46, -0.06);
  headRoot.add(eyeLeft.root);
  registerExplodable(eyeLeft.root, [0.12, 0.02, 0.06], 0.55, 0.9);

  const eyeRight = createOpticalEye({ radius: 0.044, side: -1, mats });
  eyeRight.root.name = 'Eye_R';
  eyeRight.root.position.set(-0.056, 0.024, 0.065);
  eyeRight.root.rotation.set(0.05, 0.46, 0.06);
  headRoot.add(eyeRight.root);
  registerExplodable(eyeRight.root, [-0.12, 0.02, 0.06], 0.55, 0.9);

  // ============================================================================
  // 3. CERE & NASAL INTAKE MANIFOLD
  // ============================================================================
  const cereGroup = new THREE.Group();
  cereGroup.name = 'CereIntake';
  cereGroup.position.set(0, 0.018, 0.135);
  headRoot.add(cereGroup);

  // Sculpted Cere Saddle above beak base
  const cereGeo = new THREE.CylinderGeometry(0.036, 0.046, 0.058, 16, 1, false, 0, Math.PI);
  cereGeo.rotateZ(Math.PI / 2);
  cereGeo.rotateY(Math.PI / 2);
  const cereMesh = new THREE.Mesh(cereGeo, mats.agedBrass);
  cereMesh.scale.set(1.15, 0.9, 1.0);
  cereGroup.add(cereMesh);

  // Machined Oval Nasal Intake Apertures (Left & Right) + Internal Micro-Mesh & Routing Ducts
  for (const side of [1, -1]) {
    const nostrilBezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.013, 0.0028, 8, 18),
      mats.darkSteel
    );
    nostrilBezel.scale.set(1.35, 0.85, 1.0);
    nostrilBezel.position.set(side * 0.032, 0.008, 0.006);
    nostrilBezel.rotation.y = side * 0.95;
    nostrilBezel.rotation.x = -0.25;
    cereGroup.add(nostrilBezel);

    // Internal perforated micro-mesh baffle
    const meshDisk = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 14),
      mats.lungLattice
    );
    meshDisk.scale.set(1.3, 0.8, 1);
    meshDisk.position.set(side * 0.03, 0.008, 0.006);
    meshDisk.rotation.y = side * 0.95;
    cereGroup.add(meshDisk);

    // Curved brass air-routing duct leading rearward toward pharynx/respiratory system
    const ductCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.028, 0.006, 0.004),
      new THREE.Vector3(side * 0.022, -0.006, -0.055),
      new THREE.Vector3(side * 0.015, -0.028, -0.145)
    ]);
    const ductMesh = new THREE.Mesh(
      new THREE.TubeGeometry(ductCurve, 10, 0.0055, 8, false),
      mats.agedBrass
    );
    cereGroup.add(ductMesh);
  }

  tagSelectable(cereGroup, 'cere_intake');
  registerExplodable(cereGroup, [0, 0.09, 0.14], 0.45, 0.8);

  // ============================================================================
  // 4. BEAK ASSEMBLY (Upper Rostrum, Hooked Tomial Edge, Lower Mandible & Linkage)
  // ============================================================================
  const beakGroup = new THREE.Group();
  beakGroup.name = 'Beak';
  beakGroup.position.set(0, 0.004, 0.148);
  headRoot.add(beakGroup);

  // Upper Rostrum Group
  const upperRostrum = new THREE.Group();
  beakGroup.add(upperRostrum);

  // Anatomically accurate hooked Golden Eagle upper beak spine curve
  const rostrumSpine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.026, 0.0),
    new THREE.Vector3(0, 0.022, 0.068),
    new THREE.Vector3(0, 0.004, 0.125),
    new THREE.Vector3(0, -0.036, 0.158),
    new THREE.Vector3(0, -0.074, 0.152)
  ]);

  // Custom lofted BufferGeometry for a sharp, laterally-compressed raptor culmen & hooked tip
  const beakSegs = 18;
  const beakRadial = 12;
  const beakGeo = new THREE.BufferGeometry();
  const bVerts = [];
  const bUvs = [];
  const bIndices = [];

  for (let i = 0; i <= beakSegs; i++) {
    const t = i / beakSegs;
    const pt = rostrumSpine.getPointAt(t);
    const tangent = rostrumSpine.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const sideVec = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const normVec = new THREE.Vector3().crossVectors(sideVec, tangent).normalize();

    const widthScale = (1 - Math.pow(t, 1.35)) * 0.038 + 0.0015;
    const heightScale = (1 - Math.pow(t, 1.25)) * 0.044 + 0.002;

    for (let j = 0; j <= beakRadial; j++) {
      const v = j / beakRadial;
      const theta = v * Math.PI; // Upper arch from left cutting edge to right cutting edge
      const x = Math.cos(theta) * widthScale;
      // Pinched dorsal culmen ridge
      const yArch = Math.pow(Math.sin(theta), 0.75) * heightScale;

      const pos = new THREE.Vector3()
        .copy(pt)
        .addScaledVector(sideVec, x)
        .addScaledVector(normVec, yArch - heightScale * 0.35);

      bVerts.push(pos.x, pos.y, pos.z);
      bUvs.push(v, t);
    }
  }

  for (let i = 0; i < beakSegs; i++) {
    for (let j = 0; j < beakRadial; j++) {
      const a = i * (beakRadial + 1) + j;
      const b = (i + 1) * (beakRadial + 1) + j;
      bIndices.push(a, b, a + 1);
      bIndices.push(a + 1, b, b + 1);
    }
  }
  beakGeo.setIndex(bIndices);
  beakGeo.setAttribute('position', new THREE.Float32BufferAttribute(bVerts, 3));
  beakGeo.setAttribute('uv', new THREE.Float32BufferAttribute(bUvs, 2));
  beakGeo.computeVertexNormals();

  // Outer Ivory Porcelain Upper Rostrum Shell
  const upperBeakMesh = new THREE.Mesh(beakGeo, mats.porcelain);
  upperRostrum.add(upperBeakMesh);

  // Darkened Carbon-Steel Hooked Tomial Cutting Edge (inner/lower shearing blade & tip)
  const tomialMesh = new THREE.Mesh(beakGeo, mats.polishedDarkSteel);
  tomialMesh.scale.set(0.95, 0.92, 1.02);
  tomialMesh.position.set(0, -0.004, 0.003);
  upperRostrum.add(tomialMesh);

  // Brass Jaw Hinge Hardware (Quadrate Pivot)
  const jawHingePin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.086, 14),
    mats.agedBrass
  );
  jawHingePin.rotation.z = Math.PI / 2;
  jawHingePin.position.set(0, -0.022, -0.012);
  beakGroup.add(jawHingePin);

  for (const side of [1, -1]) {
    const hingeCap = createRivetRing({
      radius: 0.011,
      count: 6,
      rivetRadius: 0.002,
      material: mats.paleGold
    });
    hingeCap.rotation.y = side * Math.PI / 2;
    hingeCap.position.set(side * 0.044, -0.022, -0.012);
    beakGroup.add(hingeCap);
  }

  // Lower Mandible & Articulated Four-Bar Mandibular Linkage
  const lowerMandiblePivot = new THREE.Group();
  lowerMandiblePivot.name = 'LowerMandible';
  lowerMandiblePivot.position.set(0, -0.022, -0.012);
  beakGroup.add(lowerMandiblePivot);

  // Left & Right mandibular rami converging at anterior symphysis
  for (const side of [1, -1]) {
    const ramusCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.034, 0, 0),
      new THREE.Vector3(side * 0.026, -0.004, 0.062),
      new THREE.Vector3(side * 0.008, 0.002, 0.118)
    ]);
    const ramusGeo = new THREE.TubeGeometry(ramusCurve, 10, 0.009, 8, false);
    ramusGeo.scale(0.85, 1.2, 1.0);
    const ramusMesh = new THREE.Mesh(ramusGeo, mats.porcelain);
    lowerMandiblePivot.add(ramusMesh);

    // Inner dark-steel mandibular cutting plate
    const innerBlade = new THREE.Mesh(ramusGeo, mats.darkSteel);
    innerBlade.scale.set(0.75, 0.9, 0.98);
    innerBlade.position.set(-side * 0.003, 0.004, 0);
    lowerMandiblePivot.add(innerBlade);
  }

  // Mandibular Linkage Actuator Rod inside oral cavity
  const mandibularLinkage = createLinkageRod(0.075, 0.0035, mats);
  mandibularLinkage.rotation.x = Math.PI * 0.44;
  mandibularLinkage.position.set(0, -0.004, -0.018);
  lowerMandiblePivot.add(mandibularLinkage);

  registerExplodable(upperRostrum, [0, 0.03, 0.18], 0.45, 0.85);
  registerExplodable(lowerMandiblePivot, [0, -0.07, 0.15], 0.45, 0.85, [0.35, 0, 0]);
  tagSelectable(beakGroup, 'beak_assembly');

  // ============================================================================
  // 5. ACOUSTIC RECESSES (Sub-ocular Auricular Cavities & Vibration Pickups)
  // ============================================================================
  const acousticGroup = new THREE.Group();
  acousticGroup.name = 'AcousticAssemblies';
  headRoot.add(acousticGroup);

  for (const side of [1, -1]) {
    const earUnit = new THREE.Group();
    earUnit.position.set(side * 0.076, -0.014, -0.018);
    earUnit.rotation.y = side * Math.PI * 0.46;
    acousticGroup.add(earUnit);

    // Concentric spun-brass acoustic rings
    for (const r of [0.022, 0.015, 0.008]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.0022, 8, 20),
        r === 0.015 ? mats.paleGold : mats.agedBrass
      );
      earUnit.add(ring);
    }

    // Recessed tympanic acoustic membrane
    const tympanum = new THREE.Mesh(
      new THREE.CircleGeometry(0.021, 18),
      mats.etchedMembrane
    );
    tympanum.position.z = -0.003;
    earUnit.add(tympanum);

    // Central vibration pickup & 3 tiny damped suspension struts
    const pickup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0035, 0.0035, 0.014, 10),
      mats.darkSteel
    );
    pickup.rotation.x = Math.PI / 2;
    earUnit.add(pickup);

    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0012, 0.0012, 0.02, 6),
        mats.springSteel
      );
      strut.position.set(Math.cos(a) * 0.01, Math.sin(a) * 0.01, 0.001);
      strut.rotation.z = a + Math.PI / 2;
      earUnit.add(strut);
    }

    registerExplodable(earUnit, [side * 0.14, -0.03, -0.04], 0.55, 0.85);
  }
  tagSelectable(acousticGroup, 'acoustic_recesses');

  return {
    root: headRoot,
    eyeLeft,
    eyeRight,
    lowerMandiblePivot,
    mandibularLinkage
  };
}
