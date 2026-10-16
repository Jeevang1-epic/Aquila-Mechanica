import * as THREE from 'three';
import { buildHeadAssembly } from './HeadAssembly.js';
import { buildCervicalAssembly } from './CervicalAssembly.js';
import { buildThoraxAssembly } from './ThoraxAssembly.js';
import { buildWingAssembly } from './WingAssembly.js';
import { buildTailAssembly } from './TailAssembly.js';
import { buildLegTalonAssembly } from './LegTalonAssembly.js';

export class AquilaMechanica {
  constructor(mats, soundEngine = null) {
    this.mats = mats;
    this.sound = soundEngine;

    // Root container for whole eagle
    this.root = new THREE.Group();
    this.root.name = 'AquilaMechanica';

    // Body pivot that pitches/rolls/heaves while head can counter-stabilize
    this.bodyPivot = new THREE.Group();
    this.bodyPivot.name = 'BodyPivot';
    this.root.add(this.bodyPivot);

    // Build all hierarchical assemblies
    this.thorax = buildThoraxAssembly(mats);
    this.cervical = buildCervicalAssembly(mats);
    this.head = buildHeadAssembly(mats);
    this.wingL = buildWingAssembly(1, mats);
    this.wingR = buildWingAssembly(-1, mats);
    this.tail = buildTailAssembly(mats);
    this.legL = buildLegTalonAssembly(1, mats);
    this.legR = buildLegTalonAssembly(-1, mats);

    // Mount assemblies in anatomical hierarchy
    this.bodyPivot.add(this.thorax.root);

    this.cervical.root.position.set(0, 0.14, 0.36);
    this.bodyPivot.add(this.cervical.root);

    // Mount Head onto top of Cervical Stabilization Column
    this.head.root.position.set(0, 0.34, 0.11);
    this.cervical.root.add(this.head.root);

    this.bodyPivot.add(this.wingL.root);
    this.bodyPivot.add(this.wingR.root);
    this.bodyPivot.add(this.tail.root);
    this.bodyPivot.add(this.legL.root);
    this.bodyPivot.add(this.legR.root);

    // Collect all explodable nodes and system anchors for fast runtime updates
    this.explodableNodes = [];
    this.systemAnchors = new Map();
    this.exteriorMeshes = [];

    this.root.traverse((obj) => {
      if (obj.userData && obj.userData.explodable) {
        this.explodableNodes.push(obj);
      }
      if (obj.userData && obj.userData.systemId) {
        const sysId = obj.userData.systemId;
        if (!this.systemAnchors.has(sysId)) {
          this.systemAnchors.set(sysId, obj);
        }
      }
      if (obj.isMesh && obj.userData && obj.userData.isExterior) {
        this.exteriorMeshes.push(obj);
      }
    });

    // Prefer left-side anchors for paired wing/eye/leg systems so camera frames the 3/4 front-left side nicely
    this.systemAnchors.set('shoulder_joint', this.wingL.root.getObjectByName('Shoulder'));
    this.systemAnchors.set('wing_spars', this.wingL.elbowPivot);
    this.systemAnchors.set('carpal_joint', this.wingL.wristPivot);
    this.systemAnchors.set('alula_control', this.wingL.alulaGroup);
    this.systemAnchors.set('primary_feathers', this.wingL.primaryPivots[6].pivot);
    this.systemAnchors.set('secondary_feathers', this.wingL.secondaryPivots[5].pivot);
    this.systemAnchors.set('binocular_eyes', this.head.eyeLeft.root);
    this.systemAnchors.set('dual_fovea', this.head.eyeLeft.foveaModule);
    this.systemAnchors.set('nictitating_shield', this.head.eyeLeft.nictitatingShutter);
    this.systemAnchors.set('tendon_lock_talons', this.legL.anklePivot);

    // Unified Mechanical State
    this.mode = 'OBSERVE'; // OBSERVE | FLIGHT | EXPLODED | ANATOMY | SLOW_MOTION
    this.flightRegime = 'CRUISE'; // IDLE | GLIDE | CRUISE | POWER | LANDING | TAKEOFF
    this.stabilizationTestActive = false;

    // Special sequences
    this.heroProgress = 0; // 0..1 on initial load (6.5s awakening sequence)
    this.heroActive = true;
    this.signatureActive = false;
    this.signatureTime = 0;

    // Continuous accumulators
    this.time = 0;
    this.flightPhase = 0;
    this.flywheelAngle = 0;
    this.targetExplode = 0; // 0..1
    this.currentExplode = 0;
    this.targetAnatomyAlpha = 1.0;
    this.currentAnatomyAlpha = 1.0;

    // Smoothed kinematic state variables for blend transitions
    this.state = {
      bodyPitch: 0.14,
      bodyRoll: 0.0,
      bodyYaw: 0.0,
      bodyHeave: 0.0,
      shoulderElevation: 0.12,
      shoulderSweep: 0.0,
      shoulderPitch: 0.0,
      elbowFlex: 0.36, // 0 = fully extended, 1 = folded
      wristFlex: 0.32,
      primarySpread: 0.72,
      primaryPitch: 0.0,
      alulaDeploy: 0.08,
      tailSpread: 0.42,
      tailPitch: -0.06,
      tailBank: 0.0,
      legExtension: 0.28,
      talonClosure: 0.35,
      furculaStrain: 0.08,
      coreIntensity: 1.8,
      coreRpm: 142,
      headPitchOffset: 0.0,
      headYawOffset: 0.18,
      irisContract: 0.35,
      nictitatingL: 0.0,
      nictitatingR: 0.0,
      eyelidBlink: 0.0,
      beakOpen: 0.0
    };

    // Blink & Nictitating timers
    this.nextBlinkTime = 4.2;
    this.nextNictitateTime = 2.6;
  }

  setMode(newMode) {
    this.mode = newMode;
    if (newMode === 'ANATOMY') {
      this.targetAnatomyAlpha = 0.16;
    } else {
      this.targetAnatomyAlpha = 1.0;
    }

    if (newMode === 'EXPLODED' && this.targetExplode < 0.05) {
      this.targetExplode = 0.65;
    } else if (newMode !== 'EXPLODED' && this.targetExplode > 0) {
      // Allow user to keep or reset exploded state when leaving EXPLODED mode
      this.targetExplode = 0.0;
    }
  }

  setFlightRegime(regime) {
    this.flightRegime = regime;
    this.signatureActive = false;
    this.heroActive = false;
  }

  setExplodeAmount(normVal) {
    this.targetExplode = THREE.MathUtils.clamp(normVal, 0, 1);
  }

  toggleStabilizationTest() {
    this.stabilizationTestActive = !this.stabilizationTestActive;
    if (this.stabilizationTestActive) {
      this.heroActive = false;
      this.signatureActive = false;
    }
    return this.stabilizationTestActive;
  }

  triggerSignatureSequence() {
    this.signatureActive = true;
    this.signatureTime = 0;
    this.heroActive = false;
    this.stabilizationTestActive = false;
    if (this.sound) this.sound.triggerChime();
  }

  /**
   * Main per-frame kinematic & mechanical coupling update.
   */
  update(dt, cameraWorldPos) {
    // Apply slow-motion time scaling to flight mechanics while keeping UI/explode responsive
    const timeScale = this.mode === 'SLOW_MOTION' ? 0.20 : 1.0;
    const mechDt = dt * timeScale;
    this.time += mechDt;

    // 1. Compute target kinematic parameters based on active sequence or mode
    const target = {
      bodyPitch: 0.15,
      bodyRoll: 0.0,
      bodyYaw: 0.0,
      bodyHeave: Math.sin(this.time * 1.4) * 0.012,
      shoulderElevation: 0.08,
      shoulderSweep: -0.06,
      shoulderPitch: 0.04,
      elbowFlex: 0.34,
      wristFlex: 0.30,
      primarySpread: 0.72,
      primaryPitch: 0.0,
      alulaDeploy: 0.10,
      tailSpread: 0.42,
      tailPitch: -0.08,
      tailBank: Math.sin(this.time * 0.7) * 0.03,
      legExtension: 0.25,
      talonClosure: 0.38,
      furculaStrain: 0.06,
      coreIntensity: 1.9,
      coreRpm: 142,
      headPitchOffset: 0.0,
      headYawOffset: 0.16 + Math.sin(this.time * 0.45) * 0.08,
      irisContract: 0.35 + Math.sin(this.time * 0.9) * 0.12,
      beakOpen: 0.02
    };

    // Respiration double-cycle wave
    const respWave = Math.sin(this.time * 1.9) * 0.65 + Math.sin(this.time * 3.8) * 0.35;

    if (this.heroActive) {
      // ======================================================================
      // SECTION 24: HERO AWAKENING ANIMATION (0 -> 7.0 seconds on load)
      // ======================================================================
      this.heroProgress = Math.min(1, this.heroProgress + dt / 6.8);
      const p = this.heroProgress;

      // Smooth staged awakening
      const coreWake = THREE.MathUtils.smoothstep(p, 0.02, 0.35);
      const headWake = THREE.MathUtils.smoothstep(p, 0.18, 0.55);
      const wingWake = THREE.MathUtils.smoothstep(p, 0.36, 0.92);

      target.coreIntensity = 0.25 + coreWake * 1.85;
      target.coreRpm = Math.round(18 + coreWake * 128);
      target.headPitchOffset = (1 - headWake) * 0.38;
      target.headYawOffset = headWake * 0.18;
      target.irisContract = 0.1 + THREE.MathUtils.smoothstep(p, 0.22, 0.48) * 0.45;

      // Single nictitating sweep at p ~ 0.32
      if (p > 0.28 && p < 0.42) {
        const nicP = Math.sin(((p - 0.28) / 0.14) * Math.PI);
        this.state.nictitatingL = nicP;
      }

      // Wings unfold from folded perch (elbowFlex 0.78) to majestic 70% spread (elbowFlex 0.32)
      target.shoulderElevation = -0.22 + wingWake * 0.32;
      target.shoulderSweep = -0.28 + wingWake * 0.22;
      target.elbowFlex = 0.78 - wingWake * 0.44;
      target.wristFlex = 0.74 - wingWake * 0.44;
      target.primarySpread = 0.22 + wingWake * 0.52;
      target.furculaStrain = wingWake * 0.22;
      target.tailSpread = 0.18 + wingWake * 0.26;

      if (this.heroProgress >= 1.0) {
        this.heroActive = false;
      }
    } else if (this.signatureActive) {
      // ======================================================================
      // SECTION 39: SIGNATURE MOMENT SEQUENCE (11-second unforgettable sequence)
      // ======================================================================
      this.signatureTime += dt;
      const t = this.signatureTime;

      if (t < 2.2) {
        // Phase 1: Look toward camera, iris contracts, nictitating sweep, neck locks, core brightens
        const u = THREE.MathUtils.smoothstep(t, 0, 2.2);
        target.headYawOffset = 0.22 * (1 - u);
        target.headPitchOffset = -0.05 * u;
        target.irisContract = 0.35 + u * 0.52;
        target.coreIntensity = 1.9 + u * 1.4;
        target.coreRpm = Math.round(145 + u * 165);
        if (t > 0.7 && t < 1.35) {
          const sweep = Math.sin(((t - 0.7) / 0.65) * Math.PI);
          this.state.nictitatingL = sweep;
          this.state.nictitatingR = sweep;
        }
      } else if (t < 4.8) {
        // Phase 2: Shoulders preload, furcula compresses, wings unfold high, primaries fan out, alula lifts, talons tighten
        const u = THREE.MathUtils.smoothstep(t, 2.2, 4.8);
        target.headYawOffset = 0;
        target.coreIntensity = 3.3 + u * 0.9;
        target.coreRpm = Math.round(310 + u * 180);
        target.bodyPitch = 0.16 + u * 0.08;
        target.shoulderElevation = 0.08 + u * 0.58; // High upstroke preload
        target.shoulderSweep = -0.06 + u * 0.22;
        target. shoulderPitch = 0.04 - u * 0.18;
        target.elbowFlex = 0.34 * (1 - u * 0.88);
        target.wristFlex = 0.30 * (1 - u * 0.88);
        target.primarySpread = 0.72 + u * 0.28; // Full slotted fan
        target.alulaDeploy = 0.10 + u * 0.75;
        target.tailSpread = 0.42 + u * 0.45;
        target.talonClosure = 0.38 + u * 0.58; // Ratchet tightens!
        target.furculaStrain = 0.08 + u * 0.45;
        target.beakOpen = u * 0.22;
      } else if (t < 6.8) {
        // Phase 3: ONE ENORMOUS MECHANICALLY CORRECT DOWNSTROKE
        const u = (t - 4.8) / 2.0;
        const strokeCos = Math.cos(u * Math.PI); // +1 (top) -> -1 (bottom of downstroke)
        const strokeSin = Math.sin(u * Math.PI); // Peaks at mid-downstroke

        target.coreIntensity = 4.2 - u * 1.2;
        target.coreRpm = Math.round(490 - u * 150);
        target.bodyHeave = strokeSin * 0.11;
        target.bodyPitch = 0.24 - strokeSin * 0.14;
        target.shoulderElevation = strokeCos * 0.64;
        target.shoulderSweep = 0.16 + strokeSin * 0.18;
        // Aerodynamic washout pitch during strong downstroke
        target.shoulderPitch = -strokeSin * 0.28;
        target.elbowFlex = 0.04 + (1 - strokeSin) * 0.06;
        target.wristFlex = 0.04 + (1 - strokeSin) * 0.05;
        // Primaries align coherently under load and twist
        target.primarySpread = 0.96 - strokeSin * 0.12;
        target.primaryPitch = -strokeSin * 0.24;
        target.furculaStrain = 0.25 + strokeSin * 0.72; // Maximum wishbone elastic flexion
        target.alulaDeploy = 0.85 - u * 0.45;
        target.tailSpread = 0.87 - strokeSin * 0.15;
        target.tailPitch = -0.18 - strokeSin * 0.14;
        target.talonClosure = 0.95;
        target.beakOpen = 0.22 * (1 - u);

        if (u > 0.25 && u < 0.32 && this.sound) {
          this.sound.triggerWingbeat(1.0);
        }
      } else if (t < 9.5) {
        // Phase 4: Smoothly transition into a silent wide glide
        const u = THREE.MathUtils.smoothstep(t, 6.8, 8.2);
        target.coreIntensity = 2.4;
        target.coreRpm = 210;
        target.bodyPitch = 0.05;
        target.bodyHeave = Math.sin(this.time * 1.2) * 0.015;
        target.shoulderElevation = -0.64 * (1 - u) + 0.06 * u;
        target.shoulderSweep = 0.05;
        target.shoulderPitch = 0.02;
        target.elbowFlex = 0.06;
        target.wristFlex = 0.05;
        target.primarySpread = 0.94;
        target.primaryPitch = 0.04;
        target.furculaStrain = 0.16;
        target.tailSpread = 0.62;
        target.tailPitch = -0.04;
        target.legExtension = 0.12;
        target.talonClosure = 0.88;
      } else if (t < 11.2) {
        // Phase 5: Return to calm equilibrium
        const u = THREE.MathUtils.smoothstep(t, 9.5, 11.2);
        target.shoulderElevation = 0.06 + u * 0.02;
        target.elbowFlex = 0.06 + u * 0.28;
        target.wristFlex = 0.05 + u * 0.25;
        target.primarySpread = 0.94 - u * 0.22;
        target.talonClosure = 0.88 - u * 0.50;
      } else {
        this.signatureActive = false;
      }
    } else if (this.stabilizationTestActive) {
      // ======================================================================
      // SECTION 18: HEAD-STABILIZATION DEMONSTRATION (Gyroscopic Cervical Test)
      // ======================================================================
      target.bodyRoll = Math.sin(this.time * 1.45) * 0.32;
      target.bodyPitch = 0.14 + Math.cos(this.time * 1.15) * 0.24;
      target.bodyYaw = Math.sin(this.time * 0.85) * 0.26;
      target.bodyHeave = Math.sin(this.time * 2.3) * 0.065;

      // Wings balance subtly in response to body roll
      target.shoulderElevation = 0.10;
      target.elbowFlex = 0.26;
      target.wristFlex = 0.22;
      target.primarySpread = 0.82;
      target.tailSpread = 0.65;
      target.tailBank = -target.bodyRoll * 0.65;
      target.tailPitch = -target.bodyPitch * 0.5;
      target.coreRpm = 195;
      target.headYawOffset = 0;
      target.headPitchOffset = 0;
    } else if (this.mode === 'FLIGHT' || this.mode === 'SLOW_MOTION') {
      // ======================================================================
      // SECTION 15, 16, 17: FLIGHT REGIMES (IDLE, GLIDE, CRUISE, POWER, LANDING, TAKEOFF)
      // ======================================================================
      this._computeFlightRegimeTargets(mechDt, target);
    } else {
      // OBSERVE, EXPLODED, or ANATOMY default live micro-motion state
      // Gentle breathing and micro feather/shoulder preload adjustments
      target.shoulderElevation = 0.08 + respWave * 0.018;
      target.elbowFlex = 0.32 - respWave * 0.012;
      target.wristFlex = 0.28 - respWave * 0.012;
      target.primarySpread = 0.74 + respWave * 0.015;
      target.furculaStrain = 0.08 + Math.max(0, respWave) * 0.04;
      target.talonClosure = 0.42 + Math.sin(this.time * 0.55) * 0.08;
    }

    // 2. Smoothly damp state toward target (spring-like physical interpolation)
    const dampRate = Math.min(1, dt * 6.5);
    for (const key of Object.keys(target)) {
      if (this.state[key] !== undefined) {
        this.state[key] = THREE.MathUtils.lerp(this.state[key], target[key], dampRate);
      }
    }

    // 3. Apply Unified Mechanical Couplings to Scene Graph
    this._applyBodyAndCervicalStabilization(dt, cameraWorldPos);
    this._applyThoraxAndCoreMechanics(mechDt, respWave);
    this._applyWingKinematics(this.wingL);
    this._applyWingKinematics(this.wingR);
    this._applyTailKinematics();
    this._applyLegAndTalonKinematics(this.legL);
    this._applyLegAndTalonKinematics(this.legR);
    this._applyHeadAndOpticalMicroMotion(dt);

    // 4. Update Exploded View & Anatomy Mode Opacity
    this._updateExplodedAndAnatomy(dt);
  }

  _computeFlightRegimeTargets(mechDt, target) {
    const regime = this.flightRegime;

    if (regime === 'IDLE') {
      // Perched / Hover Idle: wings partially folded, calm breathing
      target.bodyPitch = 0.22;
      target.shoulderElevation = -0.10;
      target.shoulderSweep = -0.18;
      target.elbowFlex = 0.62;
      target.wristFlex = 0.58;
      target.primarySpread = 0.34;
      target.alulaDeploy = 0.04;
      target.tailSpread = 0.24;
      target.tailPitch = -0.14;
      target.legExtension = 0.48;
      target.talonClosure = 0.55;
      target.coreIntensity = 1.5;
      target.coreRpm = 110;
      return;
    }

    if (regime === 'GLIDE') {
      // Thermal Glide: wings fully extended, slotted wingtip dihedral, active tail trim
      const gust = Math.sin(this.time * 1.6) * 0.5 + Math.cos(this.time * 2.7) * 0.5;
      target.bodyPitch = 0.04 + gust * 0.015;
      target.bodyRoll = Math.sin(this.time * 0.65) * 0.08;
      target.bodyHeave = Math.sin(this.time * 1.1) * 0.025;
      target.shoulderElevation = 0.09 + gust * 0.02;
      target.shoulderSweep = 0.06;
      target.shoulderPitch = 0.03;
      target.elbowFlex = 0.05;
      target.wristFlex = 0.04;
      target.primarySpread = 0.95;
      target.primaryPitch = 0.03 + gust * 0.025;
      target.alulaDeploy = 0.12;
      target.tailSpread = 0.58 + Math.sin(this.time * 1.3) * 0.06;
      target.tailPitch = -0.05 + gust * 0.03;
      target.tailBank = -target.bodyRoll * 0.8;
      target.legExtension = 0.05; // Tucked streamlined landing gear
      target.talonClosure = 0.85;
      target.furculaStrain = 0.18;
      target.coreIntensity = 2.0;
      target.coreRpm = 168;
      return;
    }

    if (regime === 'CRUISE' || regime === 'POWER') {
      const isPower = regime === 'POWER';
      const freq = isPower ? 2.15 : 1.55; // Wingbeat Hz
      const prevPhase = this.flightPhase;
      this.flightPhase = (this.flightPhase + mechDt * freq * Math.PI * 2) % (Math.PI * 2);

      // Trigger subtle wingbeat sound at peak downstroke acceleration
      if (prevPhase < 1.2 && this.flightPhase >= 1.2 && this.sound) {
        this.sound.triggerWingbeat(isPower ? 0.85 : 0.5);
      }

      // Avian asymmetric wingbeat wave: downstroke is powerful & extended; upstroke flexes elbow/wrist slightly to reduce drag
      const p = this.flightPhase;
      const stroke = Math.cos(p); // +1 at top of upstroke, -1 at bottom of downstroke
      const velocity = -Math.sin(p); // -1 during downstroke, +1 during upstroke
      const downstrokeLoad = Math.max(0, -velocity);
      const upstrokeRecovery = Math.max(0, velocity);

      const amp = isPower ? 0.56 : 0.40;
      target.bodyPitch = (isPower ? 0.12 : 0.06) - velocity * 0.045;
      target.bodyHeave = Math.sin(p - 0.6) * (isPower ? 0.065 : 0.038);

      target.shoulderElevation = stroke * amp + 0.06;
      target.shoulderSweep = -velocity * 0.16 + 0.04; // Figure-eight forward sweep on downstroke
      target.shoulderPitch = velocity * (isPower ? 0.22 : 0.14);

      // Wing folds slightly during recovery upstroke and extends fully on downstroke!
      target.elbowFlex = 0.06 + upstrokeRecovery * (isPower ? 0.34 : 0.24);
      target.wristFlex = 0.05 + upstrokeRecovery * (isPower ? 0.32 : 0.22);

      // Primaries align coherently on downstroke and separate slightly on upstroke to vent air
      target.primarySpread = 0.88 + downstrokeLoad * 0.10 - upstrokeRecovery * 0.12;
      target.primaryPitch = velocity * (isPower ? 0.26 : 0.16);

      // Furcular spring compresses under downstroke pectoralis load and rebounds on upstroke
      target.furculaStrain = 0.12 + downstrokeLoad * (isPower ? 0.68 : 0.42);
      target.alulaDeploy = isPower ? 0.32 + downstrokeLoad * 0.25 : 0.12;

      // Tail compensates for pitch moments
      target.tailSpread = (isPower ? 0.64 : 0.48) + downstrokeLoad * 0.12;
      target.tailPitch = -0.06 + velocity * 0.08;
      target.legExtension = isPower ? 0.18 : 0.06;
      target.talonClosure = 0.82;
      target.coreIntensity = isPower ? 3.5 + downstrokeLoad * 0.9 : 2.4 + downstrokeLoad * 0.5;
      target.coreRpm = Math.round((isPower ? 380 : 245) + downstrokeLoad * 95);
      return;
    }

    if (regime === 'LANDING') {
      // ======================================================================
      // SECTION 16: LANDING MODE (High angle of attack, flared tail, deployed alula, extended legs, open talons, braking stroke)
      // ======================================================================
      this.flightPhase = (this.flightPhase + mechDt * 1.85 * Math.PI * 2) % (Math.PI * 2);
      const p = this.flightPhase;
      const brakeStroke = Math.sin(p);

      target.bodyPitch = 0.42 + brakeStroke * 0.04; // Pitched strongly upward to flare
      target.bodyHeave = Math.cos(p) * 0.04;
      target.shoulderElevation = 0.18 + Math.cos(p) * 0.36;
      target.shoulderSweep = 0.24 + brakeStroke * 0.16; // Swept forward braking stroke
      target.shoulderPitch = 0.28; // High angle of attack
      target.elbowFlex = 0.14 + Math.max(0, -brakeStroke) * 0.16;
      target.wristFlex = 0.12 + Math.max(0, -brakeStroke) * 0.14;
      target.primarySpread = 0.98; // Maximum slotted primary spread
      target.primaryPitch = 0.18 * brakeStroke;
      target.alulaDeploy = 0.95; // Full leading-edge slat deployment!
      target.tailSpread = 0.96; // Dramatically spread braking fan tail!
      target.tailPitch = 0.22; // Pitched downward/flared against airflow
      target.legExtension = 0.92; // Legs extended forward & down for capture/touchdown
      target.talonClosure = 0.08 + Math.max(0, brakeStroke) * 0.18; // Talons spread wide open!
      target.furculaStrain = 0.38 + Math.max(0, brakeStroke) * 0.35;
      target.coreIntensity = 3.1;
      target.coreRpm = 320;
      target.headPitchOffset = -0.28; // Eyes locked downward toward landing perch
      return;
    }

    if (regime === 'TAKEOFF') {
      // ======================================================================
      // SECTION 17: TAKEOFF MODE (Cyclic 5-second launch sequence: crouch preload -> talon release -> leg launch -> wing sweep -> climb)
      // ======================================================================
      const cycle = (this.time * 0.65) % 4.0; // 0..4 repeating launch demonstration
      if (cycle < 1.0) {
        // Steps 1-3: Torso compresses, legs preload, talons release
        const u = THREE.MathUtils.smoothstep(cycle, 0, 1.0);
        target.bodyPitch = 0.24 - u * 0.16;
        target.bodyHeave = -u * 0.08;
        target.legExtension = 0.55 - u * 0.25; // Preload crouch
        target.talonClosure = 0.65 * (1 - u); // Talons release grip
        target.shoulderElevation = -0.12 + u * 0.72; // Wings sweep high overhead
        target.elbowFlex = 0.55 - u * 0.45;
        target.wristFlex = 0.50 - u * 0.42;
        target.primarySpread = 0.40 + u * 0.58;
        target.furculaStrain = 0.15 + u * 0.55; // Furcular spring loads
        target.alulaDeploy = 0.2 + u * 0.7;
        target.tailSpread = 0.35 + u * 0.55;
        target.coreIntensity = 2.2 + u * 1.8;
        target.coreRpm = Math.round(180 + u * 260);
      } else {
        // Steps 4-10: Legs extend to launch, powerful downstroke, landing gear retracts into climb
        const climbT = cycle - 1.0; // 0..3
        const p = climbT * Math.PI * 2 * 1.35;
        const stroke = Math.cos(p);
        const downLoad = Math.max(0, Math.sin(p));
        const gearRetract = THREE.MathUtils.smoothstep(climbT, 0.4, 2.2);

        target.bodyPitch = 0.18 - gearRetract * 0.08;
        target.bodyHeave = -0.08 + THREE.MathUtils.smoothstep(climbT, 0, 1.2) * 0.14 + Math.sin(p) * 0.045;
        target.shoulderElevation = stroke * 0.54 + 0.08;
        target.shoulderSweep = Math.sin(p) * 0.20 + 0.06;
        target.shoulderPitch = -Math.sin(p) * 0.22;
        target.elbowFlex = 0.06 + Math.max(0, -Math.sin(p)) * 0.28;
        target.wristFlex = 0.05 + Math.max(0, -Math.sin(p)) * 0.26;
        target.primarySpread = 0.95;
        target.primaryPitch = -Math.sin(p) * 0.22;
        target.furculaStrain = 0.25 + downLoad * 0.65;
        target.alulaDeploy = 0.85 - gearRetract * 0.55;
        target.tailSpread = 0.88 - gearRetract * 0.30;
        target.legExtension = (1 - gearRetract) * 0.95 + gearRetract * 0.10;
        target.talonClosure = gearRetract * 0.85;
        target.coreIntensity = 3.8;
        target.coreRpm = 420;
      }
    }
  }

  _applyBodyAndCervicalStabilization(dt, cameraWorldPos) {
    const s = this.state;

    // Apply torso orientation & heave
    this.bodyPivot.position.y = s.bodyHeave;
    this.bodyPivot.rotation.set(s.bodyPitch, s.bodyYaw, s.bodyRoll);

    // Cervical Stabilization Column: distribute compensatory inverse rotation across the 7 segments
    // so the eagle's head stays remarkably horizon-level and target-locked!
    const numSegs = this.cervical.segments.length;
    const compPitch = -(s.bodyPitch - 0.14) * 0.92;
    const compRoll = -s.bodyRoll * 0.94;
    const compYaw = -s.bodyYaw * 0.90;

    this.cervical.segments.forEach((seg, idx) => {
      const u = (idx + 1) / numSegs;
      // S-curve lateral & vertical translation compensation for torso heave
      seg.group.rotation.x = seg.basePitch + compPitch * u * 0.45;
      seg.group.rotation.z = compRoll * u * 0.42;
      seg.group.rotation.y = compYaw * u * 0.38;
    });

    // Final Head orientation: cancel remaining body motion + subtle predatory gaze offset
    this.head.root.rotation.set(
      compPitch * 0.65 + s.headPitchOffset,
      compYaw * 0.68 + s.headYawOffset,
      compRoll * 0.68
    );
    // Counteract vertical torso heave slightly in neck compression
    this.head.root.position.y = 0.34 - s.bodyHeave * 0.38;
  }

  _applyThoraxAndCoreMechanics(mechDt, respWave) {
    const s = this.state;

    // 1. Amber Flight Core & Flywheel rotation
    const omega = (s.coreRpm / 60) * Math.PI * 2;
    this.flywheelAngle = (this.flywheelAngle + mechDt * omega) % (Math.PI * 2);

    this.thorax.flywheel.rotation.z = this.flywheelAngle;
    this.thorax.regulatorCage.rotation.z = -this.flywheelAngle * 0.5;
    this.thorax.regulatorCage.rotation.x = Math.sin(this.time * 2.2) * 0.15;

    // Clockwork escapement pallet oscillation
    this.thorax.escapementPivot.rotation.z = Math.sin(this.flywheelAngle * 8) * 0.18;

    // Candle-like warm amber core fluctuation
    const candleFlicker =
      Math.sin(this.time * 5.3) * 0.08 + Math.cos(this.time * 11.7) * 0.04;
    this.mats.amberCore.emissiveIntensity = Math.max(0.2, s.coreIntensity + candleFlicker);
    this.thorax.coreLight.intensity = Math.max(0.2, (s.coreIntensity + candleFlicker) * 0.85);

    // 2. Meshed Pectoralis Spur Gears & Crankshafts
    // Respect exact gear ratios and opposite rotation directions!
    this.thorax.pectoralisGears.forEach((g) => {
      g.mesh.rotation.z = this.flywheelAngle * g.ratio * g.dir + (g.phaseOffset || 0);
    });

    // Pectoralis Crankshafts & Tension Linkages coupled directly to shoulder elevation
    this.thorax.pectoralisCranks.forEach((crank) => {
      const crankAngle = -s.shoulderElevation * 1.45;
      crank.pivot.rotation.x = crankAngle;
      crank.rod.rotation.x = 0.25 - crankAngle * 0.65;
    });

    // 3. Supracoracoideus Tendon Hoist & Triosseal Canal Pulleys
    this.thorax.upstrokeDrums.forEach((drum, i) => {
      const side = i === 0 ? 1 : -1;
      drum.rotation.x = side * s.shoulderElevation * 2.4;
    });
    this.thorax.triossealPulleys.forEach((pulley, i) => {
      const side = i === 0 ? 1 : -1;
      pulley.rotation.x = -side * s.shoulderElevation * 3.2;
    });

    // 4. Furcular Energy Spring (Wishbone elastic lateral flexion during wingbeat load)
    this.thorax.furculaRami.forEach((ramus) => {
      ramus.pivot.rotation.z = -ramus.side * s.furculaStrain * 0.14;
      ramus.pivot.rotation.x = s.furculaStrain * 0.06;
    });

    // 5. Pneumatic Air-Sac Network expansion & contraction
    this.thorax.airSacs.forEach((sac) => {
      const pulse = 1.0 + Math.sin(this.time * 2.2 + sac.phase) * 0.085;
      sac.group.scale.set(pulse, pulse, 1.0 + (pulse - 1.0) * 0.5);
    });

    // 6. Overlapping Torso Plates subtle respiratory shift
    this.thorax.breathingPlates.forEach((bp) => {
      const shift = Math.sin(this.time * 2.2 + bp.phase) * 0.005;
      bp.group.rotation.z = bp.side * shift * 4.5;
    });
  }

  _applyWingKinematics(wing) {
    const s = this.state;
    const side = wing.side;

    // 1. Glenohumeral Shoulder Joint (3-axis coupled motion)
    wing.shoulderPivot.rotation.set(
      s.shoulderPitch,
      -side * s.shoulderSweep,
      side * s.shoulderElevation
    );

    // 2. Elbow Joint (Pinned mechanical hinge flexing rearward in wing plane)
    const elbowAngle = side * s.elbowFlex * 1.18;
    wing.elbowPivot.rotation.set(0, elbowAngle, -side * s.elbowFlex * 0.12);
    wing.elbowGear.rotation.z = -elbowAngle * 1.5;

    // 3. Carpal Wrist Folding Joint (Coupled via four-bar pantograph to fold opposite the elbow!)
    const wristAngle = -side * s.wristFlex * 1.32;
    wing.wristPivot.rotation.set(
      s.primaryPitch * 0.35,
      wristAngle,
      -side * s.wristFlex * 0.15
    );
    wing.wristGear.rotation.z = wristAngle * 1.8;

    // 4. Alula Leading-Edge Slat Deployment
    wing.alulaGroup.rotation.set(
      -s.alulaDeploy * 0.38,
      side * s.alulaDeploy * 0.32,
      side * s.alulaDeploy * 0.22
    );

    // 5. Individually Articulated Primary Feathers (P1–P10)
    // Fan apart when wing extends; overlap neatly like a folded deck when wrist flexes!
    const foldFactor = THREE.MathUtils.clamp(s.wristFlex * 1.15, 0, 1);
    const spreadFactor = s.primarySpread * (1 - foldFactor * 0.72);

    wing.primaryPivots.forEach((prim) => {
      const u = prim.u; // 0 = innermost P1, 1 = outermost P10
      // Micro aerodynamic flutter at feather tips
      const microFlutter =
        Math.sin(this.time * 3.4 + prim.index * 0.7) * 0.006;

      // When folded, outer primaries rotate rearward to stack over inner primaries
      const foldedYaw = -side * (1.28 - u * 0.18);
      const activeYaw = THREE.MathUtils.lerp(foldedYaw, prim.spreadYaw, spreadFactor);

      // Individual feather pitch twist during downstroke/upstroke
      const pitchTwist =
        prim.basePitch + s.primaryPitch * (0.4 + u * 0.75) + microFlutter;

      // Upward aerodynamic tip dihedral during glide & downstroke load
      const dihedral =
        prim.baseDihedral * spreadFactor +
        side * s.furculaStrain * u * 0.12;

      prim.pivot.rotation.set(pitchTwist, activeYaw, dihedral);
    });

    // Pitch-control bus bar shifts axially as primaries twist
    wing.busBar.position.z = -0.045 + s.primaryPitch * 0.018;

    // 6. Secondary Feathers (S1–S12 along Ulna)
    wing.secondaryPivots.forEach((sec, idx) => {
      const micro = Math.sin(this.time * 2.6 + idx * 0.5) * 0.004;
      const camberPitch =
        sec.basePitch + s.primaryPitch * 0.35 - s.elbowFlex * 0.08 + micro;
      const fanYaw =
        sec.baseYaw + side * s.elbowFlex * (1 - sec.u) * 0.32;
      sec.pivot.rotation.set(camberPitch, fanYaw, sec.baseBank);
    });
  }

  _applyTailKinematics() {
    const s = this.state;

    // Caudal Control Gearbox differential gears rotate with tail spread & pitch
    this.tail.centerGear.rotation.z = s.tailSpread * 2.2;
    this.tail.pinionGear.rotation.z = -s.tailSpread * (16 / 10) * 2.2;

    this.tail.root.rotation.set(s.tailPitch, 0, s.tailBank);

    // 12 Individually Pivoted Rectrices fan out symmetrically or deflect in turns
    this.tail.rectrixPivots.forEach((rec, i) => {
      const micro = Math.cos(this.time * 2.1 + i * 0.4) * 0.004;
      const fanAngle = -rec.u * (0.12 + s.tailSpread * 0.52);
      const yaw = Math.PI + fanAngle;
      const pitch = rec.basePitch - s.tailSpread * rec.absU * 0.06 + micro;
      const roll = rec.u * (0.04 + s.tailSpread * 0.12) + s.tailBank * 0.25;

      rec.pivot.rotation.set(pitch, yaw, roll);
    });
  }

  _applyLegAndTalonKinematics(leg) {
    const s = this.state;
    const ext = s.legExtension; // 0 = tucked in flight, 1 = extended for landing/capture
    const grip = s.talonClosure; // 0 = wide open talons, 1 = locked closed fist

    // 1. Hip, Knee, and Intertarsal Ankle coupled extension
    leg.hipPivot.rotation.x = -0.55 + ext * 0.68;
    leg.kneePivot.rotation.x = 0.65 - ext * 0.52;
    leg.anklePivot.rotation.x = -0.35 + ext * 0.42;

    // 2. Intertarsal Heel Pulley & Ratchet Lock Gear
    leg.heelPulley.rotation.y = grip * 1.8;
    leg.ratchetGear.rotation.z = grip * 2.1;
    // Ratchet pawl clicks into teeth when grip > 0.5
    leg.ratchetPawl.rotation.x = grip > 0.5 ? -0.25 : 0.15;

    // 3. Sequential Proximal-to-Distal Phalange Curl across all 4 Anisodactyl Digits
    leg.digits.forEach((d) => {
      const curlSign = 1; // Local +Z is forward along each digit; +X rotation curls downward
      d.phalangePivots.forEach((pivot, pIdx) => {
        // Distal segments and claws curl progressively tighter as tension propagates!
        const stageFactor = 0.38 + pIdx * 0.24;
        const openAngle = -0.18;
        const closedAngle = 0.85 * stageFactor;
        pivot.rotation.x = curlSign * THREE.MathUtils.lerp(openAngle, closedAngle, grip);
      });
    });
  }

  _applyHeadAndOpticalMicroMotion(dt) {
    const s = this.state;

    // 1. Rare calm blink & independent Nictitating Membrane shutter sweeps
    if (this.time > this.nextNictitateTime) {
      this.nextNictitateTime = this.time + 4.5 + (Math.sin(this.time * 7.1) * 0.5 + 0.5) * 5.0;
      this.nictitateStart = this.time;
    }
    if (this.nictitateStart && this.time - this.nictitateStart < 0.36) {
      const u = (this.time - this.nictitateStart) / 0.36;
      const sweep = Math.sin(u * Math.PI);
      s.nictitatingL = sweep;
      s.nictitatingR = sweep * 0.85;
    } else if (!this.heroActive && !this.signatureActive) {
      s.nictitatingL = THREE.MathUtils.lerp(s.nictitatingL, 0, dt * 14);
      s.nictitatingR = THREE.MathUtils.lerp(s.nictitatingR, 0, dt * 14);
    }

    if (this.time > this.nextBlinkTime) {
      this.nextBlinkTime = this.time + 7.5 + (Math.cos(this.time * 3.7) * 0.5 + 0.5) * 6.0;
      this.blinkStart = this.time;
    }
    if (this.blinkStart && this.time - this.blinkStart < 0.42) {
      const u = (this.time - this.blinkStart) / 0.42;
      s.eyelidBlink = Math.sin(u * Math.PI);
    } else {
      s.eyelidBlink = THREE.MathUtils.lerp(s.eyelidBlink, 0, dt * 12);
    }

    // Apply Iris Diaphragm contraction, Nictitating Shutter, and Enamel Eyelids to both eyes
    for (const [eye, nicVal] of [
      [this.head.eyeLeft, s.nictitatingL],
      [this.head.eyeRight, s.nictitatingR]
    ]) {
      eye.irisBlades.forEach((blade) => {
        blade.rotation.z = 0.18 + s.irisContract * 0.52;
      });
      eye.nictitatingShutter.rotation.x = -1.35 + nicVal * 1.45;
      eye.upperLid.rotation.x = -1.15 + s.eyelidBlink * 0.95;
      eye.lowerLid.rotation.x = 2.05 - s.eyelidBlink * 0.65;
    }

    // 2. Lower Mandible & Linkage subtle movement
    this.head.lowerMandiblePivot.rotation.x = s.beakOpen;
  }

  _updateExplodedAndAnatomy(dt) {
    // Smooth interpolation of Exploded View (0 -> 1)
    this.currentExplode = THREE.MathUtils.lerp(
      this.currentExplode,
      this.targetExplode,
      Math.min(1, dt * 5.5)
    );

    const e = this.currentExplode;
    this.explodableNodes.forEach((node) => {
      const meta = node.userData.explodable;
      // Progressive layer window activation
      const localT = THREE.MathUtils.smoothstep(e, meta.startProgress, meta.endProgress);
      node.position.copy(meta.basePos).addScaledVector(meta.offsetVec, localT);
    });

    // Macro-assembly separation along major anatomical axes so all 15 layers breathe cleanly
    const macroWing = THREE.MathUtils.smoothstep(e, 0.30, 0.85);
    this.wingL.root.position.set(0.235 + macroWing * 0.22, 0.175 + macroWing * 0.05, 0.235);
    this.wingR.root.position.set(-0.235 - macroWing * 0.22, 0.175 + macroWing * 0.05, 0.235);

    const macroHead = THREE.MathUtils.smoothstep(e, 0.40, 0.90);
    this.head.root.position.set(
      0,
      0.34 - this.state.bodyHeave * 0.38 + macroHead * 0.15,
      0.11 + macroHead * 0.24
    );

    const macroTail = THREE.MathUtils.smoothstep(e, 0.25, 0.80);
    this.tail.root.position.set(0, -0.02, -0.43 - macroTail * 0.22);

    const macroLegs = THREE.MathUtils.smoothstep(e, 0.45, 0.92);
    this.legL.root.position.set(0.165 + macroLegs * 0.08, -0.135 - macroLegs * 0.16, -0.06);
    this.legR.root.position.set(-0.165 - macroLegs * 0.08, -0.135 - macroLegs * 0.16, -0.06);

    // Smooth interpolation of ANATOMY exterior shell transparency
    this.currentAnatomyAlpha = THREE.MathUtils.lerp(
      this.currentAnatomyAlpha,
      this.targetAnatomyAlpha,
      Math.min(1, dt * 5.0)
    );

    const alpha = this.currentAnatomyAlpha;
    const isTranslucent = alpha < 0.98;
    for (const mat of [
      this.mats.porcelainExterior,
      this.mats.blackEnamel,
      this.mats.covertPorcelain,
      this.mats.covertDark
    ]) {
      mat.opacity = alpha;
      mat.depthWrite = !isTranslucent;
    }
  }
}
