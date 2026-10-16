import * as THREE from 'three';
import {
  createGear,
  createBearing,
  createRivetRing,
  createLinkageRod,
  createAirSac,
  createCovertFeatherGeometry,
  tagSelectable,
  registerExplodable
} from '../primitives.js';

export function buildThoraxAssembly(mats) {
  const thoraxRoot = new THREE.Group();
  thoraxRoot.name = 'Thorax';

  // ============================================================================
  // 1. KEEL CHASSIS (Sternum, Carina Keel Spine & Thoracic Ribcage)
  // ============================================================================
  const keelGroup = new THREE.Group();
  keelGroup.name = 'KeelChassis';
  thoraxRoot.add(keelGroup);

  // Deep Avian Carina (Keel) Plate with Machined Lightening Holes
  const keelShape = new THREE.Shape();
  keelShape.moveTo(0.42, 0.04);
  keelShape.quadraticCurveTo(0.46, -0.24, 0.18, -0.32);
  keelShape.quadraticCurveTo(-0.15, -0.30, -0.38, -0.12);
  keelShape.lineTo(-0.34, 0.05);
  keelShape.quadraticCurveTo(0.05, 0.02, 0.42, 0.04);
  keelShape.closePath();

  // Circular truss lightening holes along the keel blade
  const holeSpecs = [
    { x: 0.24, y: -0.14, r: 0.052 },
    { x: 0.08, y: -0.16, r: 0.058 },
    { x: -0.09, y: -0.14, r: 0.048 },
    { x: -0.23, y: -0.09, r: 0.034 }
  ];
  holeSpecs.forEach((h) => {
    const p = new THREE.Path();
    p.absarc(h.x, h.y, h.r, 0, Math.PI * 2, true);
    keelShape.holes.push(p);
  });

  const keelGeo = new THREE.ExtrudeGeometry(keelShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.004,
    bevelThickness: 0.004
  });
  keelGeo.center();
  // Rotate so X of 2D shape aligns with +Z (anterior-posterior)
  keelGeo.rotateY(-Math.PI / 2);

  const keelBlade = new THREE.Mesh(keelGeo, mats.titanium);
  keelBlade.position.set(0, -0.12, 0.02);
  keelGroup.add(keelBlade);

  // Pale-gold ventral keel trim runner
  const keelRunnerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.09, 0.43),
    new THREE.Vector3(0, -0.29, 0.20),
    new THREE.Vector3(0, -0.27, -0.12),
    new THREE.Vector3(0, -0.14, -0.36)
  ]);
  const keelRunner = new THREE.Mesh(
    new THREE.TubeGeometry(keelRunnerCurve, 20, 0.009, 8, false),
    mats.paleGold
  );
  keelGroup.add(keelRunner);

  // Dorsal Notarium / Thoracic Vertebral Spine Beam
  const dorsalSpine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.022, 0.78, 12),
    mats.titanium
  );
  dorsalSpine.rotation.x = Math.PI / 2;
  dorsalSpine.position.set(0, 0.22, 0.0);
  keelGroup.add(dorsalSpine);

  // 6 Pairs of Machined Titanium Thoracic Ribs with Avian Uncinate Processes
  for (let r = 0; r < 6; r++) {
    const t = r / 5;
    const zPos = 0.24 - t * 0.52;
    const widthScale = Math.sin(t * Math.PI * 0.8 + 0.35) * 0.23 + 0.06;

    for (const side of [1, -1]) {
      const ribCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.025, 0.21, zPos),
        new THREE.Vector3(side * widthScale, 0.08, zPos - 0.02),
        new THREE.Vector3(side * (widthScale * 0.82), -0.08, zPos + 0.02),
        new THREE.Vector3(side * 0.04, -0.14, zPos + 0.04)
      ]);
      const ribMesh = new THREE.Mesh(
        new THREE.TubeGeometry(ribCurve, 12, 0.008, 6, false),
        mats.titanium
      );
      keelGroup.add(ribMesh);

      // Avian uncinate process (overlapping stiffening tab onto adjacent rib)
      if (r < 5) {
        const uncinate = new THREE.Mesh(
          new THREE.BoxGeometry(0.006, 0.018, 0.065),
          mats.agedBrass
        );
        uncinate.position.set(side * (widthScale * 0.96), 0.05, zPos - 0.045);
        uncinate.rotation.x = 0.35;
        uncinate.rotation.y = -side * 0.22;
        keelGroup.add(uncinate);
      }
    }
  }

  tagSelectable(keelGroup, 'keel_chassis');
  registerExplodable(keelGroup, [0, -0.18, 0], 0.45, 0.85);

  // ============================================================================
  // 2. FURCULAR ENERGY SPRING (Laminated Gold & Spring-Steel Wishbone)
  // ============================================================================
  const furculaGroup = new THREE.Group();
  furculaGroup.name = 'FurcularSpring';
  furculaGroup.position.set(0, -0.16, 0.38);
  thoraxRoot.add(furculaGroup);

  // Ventral Hypocleideum Porcelain Boss (wishbone apex)
  const hypoBoss = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.022, 0.036, 16),
    mats.porcelain
  );
  hypoBoss.rotation.x = Math.PI / 2;
  furculaGroup.add(hypoBoss);

  const furculaRivets = createRivetRing({
    radius: 0.018,
    count: 6,
    rivetRadius: 0.0028,
    material: mats.agedBrass
  });
  furculaRivets.position.z = 0.019;
  furculaGroup.add(furculaRivets);

  // Left and Right Flexible Furcular Rami (Pivoted at ventral apex so they flex with wingbeats!)
  const furculaRami = [];
  for (const side of [1, -1]) {
    const ramusPivot = new THREE.Group();
    furculaGroup.add(ramusPivot);

    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.012, 0.0, 0.0),
      new THREE.Vector3(side * 0.145, 0.12, 0.015),
      new THREE.Vector3(side * 0.215, 0.29, -0.05),
      new THREE.Vector3(side * 0.21, 0.34, -0.11)
    ]);

    // Outer Pale Gold Spring Laminate
    const goldArchGeo = new THREE.TubeGeometry(archCurve, 18, 0.014, 10, false);
    goldArchGeo.scale(0.82, 1.0, 1.25);
    const goldArch = new THREE.Mesh(goldArchGeo, mats.paleGold);
    ramusPivot.add(goldArch);

    // Inner Tempered Spring-Steel Core Laminate (visible along inner concave edge)
    const steelCoreGeo = new THREE.TubeGeometry(archCurve, 18, 0.011, 8, false);
    const steelCore = new THREE.Mesh(steelCoreGeo, mats.springSteel);
    steelCore.position.set(-side * 0.005, -0.003, -0.006);
    ramusPivot.add(steelCore);

    // Dorsal Shoulder Porcelain Attachment Boss
    const shoulderBoss = new THREE.Mesh(
      new THREE.SphereGeometry(0.026, 14, 12),
      mats.porcelain
    );
    shoulderBoss.scale.set(0.9, 1.1, 1.2);
    shoulderBoss.position.set(side * 0.21, 0.34, -0.11);
    ramusPivot.add(shoulderBoss);

    furculaRami.push({ pivot: ramusPivot, side });
  }

  tagSelectable(furculaGroup, 'furcular_spring');
  registerExplodable(furculaGroup, [0, 0.06, 0.34], 0.45, 0.82);

  // ============================================================================
  // 3. CORACOID COMPRESSION STRUTS & SCAPULAR RAILS
  // ============================================================================
  const coracoidGroup = new THREE.Group();
  coracoidGroup.name = 'CoracoidStruts';
  thoraxRoot.add(coracoidGroup);

  for (const side of [1, -1]) {
    // Heavy Forged Carbon-Black Steel Coracoid Compression Column (Sternum -> Shoulder)
    const strutStart = new THREE.Vector3(side * 0.065, -0.09, 0.24);
    const strutEnd = new THREE.Vector3(side * 0.23, 0.18, 0.26);
    const strutDir = new THREE.Vector3().subVectors(strutEnd, strutStart);
    const strutLen = strutDir.length();

    const strutHolder = new THREE.Group();
    strutHolder.position.copy(strutStart);
    strutHolder.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      strutDir.clone().normalize()
    );
    coracoidGroup.add(strutHolder);

    const mainCol = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.028, strutLen, 12),
      mats.darkSteel
    );
    mainCol.position.y = strutLen * 0.5;
    strutHolder.add(mainCol);

    // Brass load-cell collar rings on coracoid
    for (const frac of [0.2, 0.8]) {
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.024, 12),
        mats.agedBrass
      );
      collar.position.y = strutLen * frac;
      strutHolder.add(collar);
    }

    // Dorsal Brushed-Titanium Scapular Blade Rail running posteriorly along ribcage
    const scapulaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.22, 0.20, 0.25),
      new THREE.Vector3(side * 0.19, 0.23, 0.02),
      new THREE.Vector3(side * 0.14, 0.20, -0.26)
    ]);
    const scapulaGeo = new THREE.TubeGeometry(scapulaCurve, 14, 0.013, 8, false);
    scapulaGeo.scale(1.4, 0.65, 1.0);
    const scapulaMesh = new THREE.Mesh(scapulaGeo, mats.titanium);
    coracoidGroup.add(scapulaMesh);
  }

  tagSelectable(coracoidGroup, 'coracoid_struts');
  registerExplodable(coracoidGroup, [0, 0.16, 0.12], 0.5, 0.85);

  // ============================================================================
  // 4. PRIMARY DOWNSTROKE ACTUATOR (Pectoralis Flight Motor)
  // ============================================================================
  const pectoralisGroup = new THREE.Group();
  pectoralisGroup.name = 'PectoralisDrive';
  pectoralisGroup.position.set(0, -0.07, 0.14);
  thoraxRoot.add(pectoralisGroup);

  const pectoralisGears = [];
  const pectoralisCranks = [];

  for (const side of [1, -1]) {
    const sideDrive = new THREE.Group();
    sideDrive.position.x = side * 0.068;
    pectoralisGroup.add(sideDrive);

    // Primary Driving Pinion Gear (14 teeth, driven by Amber Core shaft)
    const pinionGear = createGear({
      radius: 0.048,
      thickness: 0.022,
      teeth: 14,
      boreRadius: 0.014,
      spokes: 0,
      material: mats.paleGold
    });
    pinionGear.rotation.y = side * Math.PI / 2;
    pinionGear.position.set(0, -0.02, -0.065);
    sideDrive.add(pinionGear);

    // Meshed Main Pectoralis Cam/Spur Gear (24 teeth, positioned so pitch circles mesh accurately!)
    // Center distance = 0.048 + 0.082 = 0.130
    const mainGear = createGear({
      radius: 0.082,
      thickness: 0.024,
      teeth: 24,
      boreRadius: 0.022,
      spokes: 5,
      material: mats.agedBrass
    });
    mainGear.rotation.y = side * Math.PI / 2;
    mainGear.position.set(0, 0.032, 0.054);
    sideDrive.add(mainGear);

    // Coaxial Mainspring Barrel Drum behind main gear
    const springDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.064, 0.064, 0.036, 20),
      mats.darkSteel
    );
    springDrum.rotation.z = Math.PI / 2;
    springDrum.position.set(-side * 0.028, 0.032, 0.054);
    sideDrive.add(springDrum);

    // Eccentric Crank Arm & Tension Linkage Rod extending up to the ventral shoulder humerus
    const crankPivot = new THREE.Group();
    crankPivot.position.set(side * 0.02, 0.032, 0.054);
    sideDrive.add(crankPivot);

    const crankPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.03, 10),
      mats.paleGold
    );
    crankPin.rotation.z = Math.PI / 2;
    crankPin.position.set(side * 0.01, 0.046, 0.0);
    crankPivot.add(crankPin);

    // Heavy Pectoralis Tension Linkage Rod connecting crank pin to shoulder ventral crest
    const rod = createLinkageRod(0.24, 0.009, mats);
    rod.position.set(side * 0.018, 0.046, 0.0);
    rod.rotation.z = -side * 0.58;
    rod.rotation.x = 0.25;
    crankPivot.add(rod);

    pectoralisGears.push(
      { mesh: pinionGear, ratio: 24 / 14, dir: 1 },
      { mesh: mainGear, ratio: -1.0, dir: -1, phaseOffset: 0.13 }
    );
    pectoralisCranks.push({ pivot: crankPivot, rod, side });

    registerExplodable(sideDrive, [side * 0.22, -0.06, 0.08], 0.5, 0.88);
  }

  tagSelectable(pectoralisGroup, 'pectoralis_drive');

  // ============================================================================
  // 5. DORSAL UPSTROKE TENDON DRIVE (Supracoracoideus & Triosseal Canal Pulley)
  // ============================================================================
  const supracoracoideusGroup = new THREE.Group();
  supracoracoideusGroup.name = 'SupracoracoideusDrive';
  thoraxRoot.add(supracoracoideusGroup);

  const triossealPulleys = [];
  const upstrokeDrums = [];

  for (const side of [1, -1]) {
    const unit = new THREE.Group();
    supracoracoideusGroup.add(unit);

    // Deep Ventral Tendon Hoist Drum along the base of the keel
    const hoistDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.032, 18),
      mats.agedBrass
    );
    hoistDrum.rotation.z = Math.PI / 2;
    hoistDrum.position.set(side * 0.042, -0.14, 0.18);
    unit.add(hoistDrum);
    upstrokeDrums.push(hoistDrum);

    // Triosseal Canal Redirect Pulley Housing at the apex of Coracoid, Furcula & Scapula
    const canalHousing = new THREE.Group();
    canalHousing.position.set(side * 0.205, 0.235, 0.255);
    unit.add(canalHousing);

    const pulleySheave = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.014, 18),
      mats.paleGold
    );
    pulleySheave.rotation.z = Math.PI / 2;
    canalHousing.add(pulleySheave);
    triossealPulleys.push(pulleySheave);

    const canalBracket = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.005, 8, 18, Math.PI * 1.4),
      mats.titanium
    );
    canalBracket.rotation.y = Math.PI / 2;
    canalHousing.add(canalBracket);

    // Braided Steel Tendon Cable routed from ventral hoist drum -> up through Triosseal Canal -> dorsal humerus
    const tendonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.045, -0.14, 0.19),
      new THREE.Vector3(side * 0.135, 0.05, 0.24),
      new THREE.Vector3(side * 0.205, 0.255, 0.26),
      new THREE.Vector3(side * 0.265, 0.22, 0.25)
    ]);
    const tendonCable = new THREE.Mesh(
      new THREE.TubeGeometry(tendonCurve, 16, 0.0042, 6, false),
      mats.springSteel
    );
    unit.add(tendonCable);

    registerExplodable(unit, [side * 0.16, 0.14, 0.12], 0.52, 0.88);
  }

  tagSelectable(supracoracoideusGroup, 'supracoracoideus_drive');

  // ============================================================================
  // 6. PNEUMATIC AIR-SAC NETWORK & PARABRONCHIAL EXCHANGE CORE
  // ============================================================================
  const respiratoryGroup = new THREE.Group();
  respiratoryGroup.name = 'RespiratorySystem';
  thoraxRoot.add(respiratoryGroup);

  const airSacs = [];

  // Anterior Interclavicular Air Sac (single median chamber)
  const clavicularSac = createAirSac({
    radiusX: 0.085,
    radiusY: 0.068,
    radiusZ: 0.095,
    ribCount: 4,
    mats
  });
  clavicularSac.group.position.set(0, 0.05, 0.24);
  respiratoryGroup.add(clavicularSac.group);
  airSacs.push({ ...clavicularSac, phase: 0.0 });
  registerExplodable(clavicularSac.group, [0, 0.08, 0.26], 0.6, 0.92);

  // Paired Anterior Thoracic & Posterior Abdominal Air Sacs
  for (const side of [1, -1]) {
    const thoracicSac = createAirSac({
      radiusX: 0.072,
      radiusY: 0.065,
      radiusZ: 0.115,
      ribCount: 5,
      mats
    });
    thoracicSac.group.position.set(side * 0.125, 0.02, 0.02);
    thoracicSac.group.rotation.y = side * 0.18;
    respiratoryGroup.add(thoracicSac.group);
    airSacs.push({ ...thoracicSac, phase: 0.6 });
    registerExplodable(thoracicSac.group, [side * 0.26, 0.02, 0.02], 0.6, 0.92);

    const abdominalSac = createAirSac({
      radiusX: 0.068,
      radiusY: 0.062,
      radiusZ: 0.135,
      ribCount: 5,
      mats
    });
    abdominalSac.group.position.set(side * 0.095, 0.0, -0.22);
    abdominalSac.group.rotation.y = -side * 0.12;
    respiratoryGroup.add(abdominalSac.group);
    airSacs.push({ ...abdominalSac, phase: 1.25 });
    registerExplodable(abdominalSac.group, [side * 0.22, -0.04, -0.22], 0.6, 0.92);

    // Brass pneumatic manifold duct connecting air sacs to dorsal lung core
    const manifoldCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.06, 0.06, 0.22),
      new THREE.Vector3(side * 0.12, 0.12, 0.04),
      new THREE.Vector3(side * 0.10, 0.08, -0.18)
    ]);
    const manifoldTube = new THREE.Mesh(
      new THREE.TubeGeometry(manifoldCurve, 14, 0.0075, 8, false),
      mats.agedBrass
    );
    respiratoryGroup.add(manifoldTube);
  }

  tagSelectable(respiratoryGroup, 'air_sac_network');

  // Rigid Dorsal Parabronchial Exchange Core (Avian Lungs)
  const lungCoreGroup = new THREE.Group();
  lungCoreGroup.name = 'ParabronchialExchangeCore';
  thoraxRoot.add(lungCoreGroup);

  for (const side of [1, -1]) {
    const lungUnit = new THREE.Group();
    lungUnit.position.set(side * 0.085, 0.145, -0.02);
    lungCoreGroup.add(lungUnit);

    // Perforated metallic/ceramic honeycomb exchange block
    const blockMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.062, 0.26),
      mats.lungLattice
    );
    lungUnit.add(blockMesh);

    // Titanium manifold frame & brass cross-tubes
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.072, 0.066, 0.268),
      mats.titanium
    );
    frameMesh.scale.set(1.02, 0.22, 1.01);
    lungUnit.add(frameMesh);

    for (let k = -2; k <= 2; k++) {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.08, 10),
        mats.agedBrass
      );
      tube.rotation.z = Math.PI / 2;
      tube.position.set(0, 0, k * 0.048);
      lungUnit.add(tube);
    }

    registerExplodable(lungUnit, [side * 0.20, 0.24, -0.06], 0.58, 0.92);
  }

  tagSelectable(lungCoreGroup, 'parabronchial_core');

  // ============================================================================
  // 7. AMBER FLIGHT CORE (Flywheel, Clockwork Escapement, Torque Shaft & Light)
  // ============================================================================
  const amberCoreGroup = new THREE.Group();
  amberCoreGroup.name = 'AmberFlightCore';
  amberCoreGroup.position.set(0, -0.03, 0.04);
  thoraxRoot.add(amberCoreGroup);

  // Inner Glowing Amber Torsion Crystal/Vessel
  const amberVessel = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.056, 2),
    mats.amberCore
  );
  amberVessel.scale.set(0.85, 0.95, 1.45);
  amberCoreGroup.add(amberVessel);

  // Outer Smoked-Glass Containment Cylinder & Brass End-Caps
  const glassChamber = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.068, 0.19, 20),
    mats.smokedGlass
  );
  glassChamber.rotation.x = Math.PI / 2;
  amberCoreGroup.add(glassChamber);

  // Rotating Pale-Gold Regulator Cage around the Amber Vessel
  const regulatorCage = new THREE.Group();
  amberCoreGroup.add(regulatorCage);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.062, 0.0035, 8, 24),
      mats.paleGold
    );
    hoop.rotation.y = a;
    regulatorCage.add(hoop);
  }

  // High-Inertia Brass Flywheel with Peripheral Balance Weights
  const flywheel = new THREE.Group();
  flywheel.position.set(0, 0, 0.115);
  amberCoreGroup.add(flywheel);

  const flywheelRim = createGear({
    radius: 0.088,
    thickness: 0.018,
    teeth: 32,
    boreRadius: 0.022,
    spokes: 6,
    material: mats.agedBrass
  });
  flywheel.add(flywheelRim);

  for (let w = 0; w < 6; w++) {
    const ang = (w / 6) * Math.PI * 2;
    const weight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.026, 10),
      mats.paleGold
    );
    weight.rotation.x = Math.PI / 2;
    weight.position.set(Math.cos(ang) * 0.072, Math.sin(ang) * 0.072, 0);
    flywheel.add(weight);
  }

  // Clockwork Escapement Wheel & Oscillating Anchor Pallet
  const escapementPivot = new THREE.Group();
  escapementPivot.position.set(0, 0.082, 0.115);
  amberCoreGroup.add(escapementPivot);

  const palletArm = new THREE.Mesh(
    new THREE.TorusGeometry(0.032, 0.0045, 6, 14, Math.PI * 0.85),
    mats.paleGold
  );
  palletArm.rotation.z = Math.PI * 1.08;
  escapementPivot.add(palletArm);

  // Central Torque Drive Shaft running through the Thorax
  const torqueShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.48, 14),
    mats.darkSteel
  );
  torqueShaft.rotation.x = Math.PI / 2;
  amberCoreGroup.add(torqueShaft);

  // Helical Spring Reservoir around posterior shaft
  const reservoirRings = new THREE.Group();
  reservoirRings.position.z = -0.14;
  amberCoreGroup.add(reservoirRings);
  for (let s = 0; s < 7; s++) {
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(0.038, 0.0045, 8, 20),
      mats.springSteel
    );
    coil.position.z = (s - 3) * 0.012;
    reservoirRings.add(coil);
  }

  // Localized Warm Candle-Like Amber Point Light
  const coreLight = new THREE.PointLight(0xff9428, 1.8, 1.6, 1.8);
  coreLight.position.set(0, 0, 0.02);
  amberCoreGroup.add(coreLight);

  tagSelectable(amberCoreGroup, 'amber_core');
  registerExplodable(amberCoreGroup, [0, -0.12, 0.24], 0.65, 0.98);

  // ============================================================================
  // 8. ABDOMINAL & TORSO PLATING (Overlapping Porcelain/Enamel Contour Shells)
  // ============================================================================
  const platingGroup = new THREE.Group();
  platingGroup.name = 'TorsoPlating';
  thoraxRoot.add(platingGroup);

  const breathingPlates = [];

  // Ventral Breast & Flank Overlapping Porcelain/Enamel Shells with Inspection Apertures
  for (const side of [1, -1]) {
    for (let p = 0; p < 4; p++) {
      const t = p / 3;
      const plateHolder = new THREE.Group();
      const zPos = 0.24 - t * 0.48;
      const yPos = -0.04 - Math.sin(t * Math.PI * 0.8) * 0.06;
      const xPos = side * (0.145 - t * 0.035);

      plateHolder.position.set(xPos, yPos, zPos);
      platingGroup.add(plateHolder);

      const plateGeo = new THREE.SphereGeometry(
        0.165 - t * 0.025,
        18,
        14,
        side > 0 ? -0.25 : Math.PI - 0.85,
        1.1,
        0.35,
        Math.PI * 0.48
      );
      plateGeo.scale(0.68, 0.85, 1.15);
      const mat = p % 2 === 0 ? mats.porcelainExterior : mats.blackEnamel;
      const plateMesh = new THREE.Mesh(plateGeo, mat);
      plateMesh.userData.isExterior = true;
      plateHolder.add(plateMesh);

      // Thin aged-brass edge trim strip
      const trimGeo = new THREE.TorusGeometry(0.12 - t * 0.015, 0.0028, 6, 18, Math.PI * 0.65);
      const trimMesh = new THREE.Mesh(trimGeo, mats.agedBrass);
      trimMesh.rotation.y = side * Math.PI * 0.45;
      plateHolder.add(trimMesh);

      breathingPlates.push({
        group: plateHolder,
        baseX: xPos,
        baseY: yPos,
        side,
        phase: t * 1.4
      });

      registerExplodable(
        plateHolder,
        [side * (0.28 + p * 0.03), -0.10 - p * 0.02, (0.12 - t * 0.24)],
        0.18,
        0.55
      );
    }
  }

  // Dorsal Mantle Overlapping Feather-Plate Array (InstancedMesh for high performance!)
  const mantleCovertGeo = createCovertFeatherGeometry(0.19, 0.065, 0.016);
  const dorsalRows = 6;
  const dorsalCols = 7;
  const totalDorsalCoverts = dorsalRows * dorsalCols;
  const dorsalMantleInst = new THREE.InstancedMesh(
    mantleCovertGeo,
    mats.covertPorcelain,
    totalDorsalCoverts
  );
  dorsalMantleInst.castShadow = true;
  dorsalMantleInst.receiveShadow = true;
  dorsalMantleInst.userData.isExterior = true;

  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let r = 0; r < dorsalRows; r++) {
    const tr = r / (dorsalRows - 1);
    const zRow = 0.28 - tr * 0.66;
    const rowWidth = Math.sin(tr * Math.PI * 0.82 + 0.25) * 0.21 + 0.05;
    const yArch = 0.225 + Math.sin(tr * Math.PI) * 0.035 - tr * 0.06;

    for (let c = 0; c < dorsalCols; c++) {
      const u = (c / (dorsalCols - 1)) - 0.5; // -0.5 to +0.5
      const xPos = u * 2 * rowWidth;
      const yPos = yArch - u * u * 0.09;

      dummy.position.set(xPos, yPos, zRow);
      // Point feather rearward (-Z) and bank with body contour
      dummy.rotation.set(
        -0.12 - tr * 0.14,
        Math.PI - u * 0.35,
        u * 0.65
      );
      const scale = 0.85 + Math.sin(tr * Math.PI) * 0.28;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      dorsalMantleInst.setMatrixAt(idx++, dummy.matrix);
    }
  }
  dorsalMantleInst.instanceMatrix.needsUpdate = true;

  const dorsalMantleHolder = new THREE.Group();
  dorsalMantleHolder.add(dorsalMantleInst);
  platingGroup.add(dorsalMantleHolder);
  registerExplodable(dorsalMantleHolder, [0, 0.32, -0.12], 0.05, 0.42);

  tagSelectable(platingGroup, 'keel_chassis', true);

  return {
    root: thoraxRoot,
    furculaRami,
    pectoralisGears,
    pectoralisCranks,
    triossealPulleys,
    upstrokeDrums,
    airSacs,
    amberVessel,
    regulatorCage,
    flywheel,
    escapementPivot,
    coreLight,
    breathingPlates
  };
}
