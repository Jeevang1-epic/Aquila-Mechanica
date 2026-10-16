import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SYSTEMS_CATALOG, CATALOG_BY_ID } from './catalog.js';

export class ExhibitionInteractionController {
  constructor({
    camera,
    renderer,
    scene,
    eagle,
    sound
  }) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.eagle = eagle;
    this.sound = sound;

    // Default 3/4 Frontal Profile, slightly below head eye-level, framing full wingspan + label negative space
    this.defaultCamPos = new THREE.Vector3(2.95, 0.36, 3.65);
    this.defaultTarget = new THREE.Vector3(0.0, 0.10, 0.04);

    this.camera.position.copy(this.defaultCamPos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.defaultTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.045;
    this.controls.rotateSpeed = 0.65;
    this.controls.zoomSpeed = 0.85;
    this.controls.panSpeed = 0.6;
    this.controls.minDistance = 0.42;
    this.controls.maxDistance = 10.5;
    this.controls.maxPolarAngle = Math.PI * 0.72;
    this.controls.minPolarAngle = Math.PI * 0.12;

    // Camera transition state
    this.savedCamPos = this.defaultCamPos.clone();
    this.savedTarget = this.defaultTarget.clone();
    this.desiredCamPos = null;
    this.desiredTarget = null;
    this.isTransitioningCam = false;
    this.userInteracting = false;
    this.lastInteractionTime = 0;

    // Raycasting state
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-999, -999);
    this.pointerDownPos = new THREE.Vector2();
    this.hoveredSystemId = null;
    this.selectedSystemId = null;

    // Collect interactive meshes once and create per-system material clones
    // so hovering a system gives a subtle material response and selecting a system
    // dims the rest of the eagle while emphasizing the selected mechanism.
    this.pickableMeshes = [];
    this.systemMaterials = new Map(); // systemId -> Set<Material>
    const clonedPairMap = new Map(); // `${systemId}:${mat.uuid}` -> clonedMat

    this.eagle.root.traverse((obj) => {
      if (obj.isMesh && obj.userData && obj.userData.systemId) {
        this.pickableMeshes.push(obj);
        const sysId = obj.userData.systemId;
        if (!this.systemMaterials.has(sysId)) {
          this.systemMaterials.set(sysId, new Set());
        }
        // Keep amberCore material shared so core intensity animation works directly
        if (obj.material && obj.material.name !== 'amberCore') {
          const key = `${sysId}:${obj.material.uuid}`;
          let cMat = clonedPairMap.get(key);
          if (!cMat) {
            cMat = obj.material.clone();
            cMat.userData = {
              baseColor: obj.material.color.clone(),
              baseEmissive: obj.material.emissive
                ? obj.material.emissive.clone()
                : new THREE.Color(0x000000),
              baseEmissiveIntensity: obj.material.emissiveIntensity || 0,
              isExterior: obj.userData.isExterior || false
            };
            clonedPairMap.set(key, cMat);
          }
          obj.material = cMat;
          this.systemMaterials.get(sysId).add(cMat);
        }
      }
    });

    // DOM Elements
    this.canvasContainer = document.getElementById('canvas-container');
    this.hoverLabel = document.getElementById('hover-label');
    this.hoverCode = document.getElementById('hover-label-code');
    this.hoverText = document.getElementById('hover-label-text');
    this.hoverLine = document.getElementById('hover-leader-line');
    this.hoverDot = document.getElementById('hover-leader-dot');
    this.activeLine = document.getElementById('active-leader-line');
    this.activeDot = document.getElementById('active-leader-dot');

    this.techPanel = document.getElementById('technical-panel');
    this.panelCode = document.getElementById('panel-code');
    this.panelTitle = document.getElementById('panel-title');
    this.panelAnalogue = document.getElementById('panel-analogue');
    this.panelInterpretation = document.getElementById('panel-interpretation');
    this.panelFunction = document.getElementById('panel-function');
    this.panelMaterial = document.getElementById('panel-material');
    this.panelMotion = document.getElementById('panel-motion');

    this._bindEvents();
    this._buildSystemsDrawer();
  }

  _bindEvents() {
    const dom = this.renderer.domElement;

    this.controls.addEventListener('start', () => {
      this.userInteracting = true;
      this.isTransitioningCam = false;
      this.lastInteractionTime = performance.now();
    });
    this.controls.addEventListener('end', () => {
      this.userInteracting = false;
      this.lastInteractionTime = performance.now();
    });

    dom.addEventListener('pointermove', (e) => {
      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    dom.addEventListener('pointerdown', (e) => {
      this.pointerDownPos.set(e.clientX, e.clientY);
    });

    dom.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(
        e.clientX - this.pointerDownPos.x,
        e.clientY - this.pointerDownPos.y
      );
      if (dist < 6) {
        this._handleSceneClick();
      }
    });

    // Mode Buttons (OBSERVE · FLIGHT · EXPLODED · ANATOMY · SLOW MOTION)
    const modeBtns = document.querySelectorAll('.mode-btn');
    const flightPanel = document.getElementById('flight-subcontrols');
    const explodePanel = document.getElementById('exploded-subcontrols');

    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        modeBtns.forEach((b) => b.classList.toggle('active', b === btn));

        this.eagle.setMode(mode);
        if (this.sound) this.sound.triggerClick(1950, 0.035);

        flightPanel.classList.toggle(
          'hidden',
          mode !== 'FLIGHT' && mode !== 'SLOW_MOTION'
        );
        explodePanel.classList.toggle('hidden', mode !== 'EXPLODED');

        if (mode === 'EXPLODED') {
          this._syncExplodeSlider(65);
          if (!this.selectedSystemId) {
            this.desiredCamPos = new THREE.Vector3(3.35, 0.46, 4.15);
            this.desiredTarget = new THREE.Vector3(0.0, 0.08, 0.0);
            this.isTransitioningCam = true;
          }
        } else if (!this.selectedSystemId) {
          this.desiredCamPos = this.defaultCamPos.clone();
          this.desiredTarget = this.defaultTarget.clone();
          this.isTransitioningCam = true;
        }
      });
    });

    // Flight Regime Sub-Buttons
    const flightBtns = document.querySelectorAll('.sub-btn[data-flight]');
    flightBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const regime = btn.dataset.flight;
        flightBtns.forEach((b) => b.classList.toggle('active', b === btn));
        this.eagle.setFlightRegime(regime);
        if (this.sound) this.sound.triggerClick(2100, 0.03);
      });
    });

    // Exploded View Slider & Presets
    const slider = document.getElementById('exploded-slider');
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this._syncExplodeSlider(val);
    });

    document.querySelectorAll('.preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const val = parseFloat(chip.dataset.explode);
        this._syncExplodeSlider(val);
        if (this.sound) this.sound.triggerClick(2300, 0.03);
      });
    });

    // Header Special Action Buttons
    const btnSignature = document.getElementById('btn-signature');
    btnSignature.addEventListener('click', () => {
      this.eagle.triggerSignatureSequence();
      this.clearSelection();
      // Frame eagle heroically for signature sequence
      this.desiredCamPos = new THREE.Vector3(3.15, 0.34, 3.85);
      this.desiredTarget = new THREE.Vector3(0, 0.12, 0.05);
      this.isTransitioningCam = true;
    });

    const btnStabilize = document.getElementById('btn-stabilize');
    btnStabilize.addEventListener('click', () => {
      const active = this.eagle.toggleStabilizationTest();
      btnStabilize.classList.toggle('active', active);
      document.getElementById('tel-gyro').textContent = active
        ? 'TEST ACTIVE'
        : 'ACTIVE';
      if (active) {
        // Frame head and cervical neck closely so viewer sees the eerie stabilization
        this.desiredCamPos = new THREE.Vector3(1.55, 0.42, 1.85);
        this.desiredTarget = new THREE.Vector3(0, 0.34, 0.36);
        this.isTransitioningCam = true;
      } else {
        this.desiredCamPos = this.defaultCamPos.clone();
        this.desiredTarget = this.defaultTarget.clone();
        this.isTransitioningCam = true;
      }
    });

    const btnAudio = document.getElementById('btn-audio');
    const audioInd = document.getElementById('audio-indicator');
    btnAudio.addEventListener('click', () => {
      if (!this.sound) return;
      const on = this.sound.toggle();
      btnAudio.classList.toggle('active', on);
      audioInd.textContent = on ? 'AUDIO: ON' : 'AUDIO: MUTE';
    });

    // Technical Panel Navigation & Close
    document.getElementById('panel-close').addEventListener('click', () => {
      this.clearSelection();
    });
    document.getElementById('btn-reset-camera').addEventListener('click', () => {
      this.clearSelection();
    });
    document.getElementById('panel-prev').addEventListener('click', () => {
      this._stepSelection(-1);
    });
    document.getElementById('panel-next').addEventListener('click', () => {
      this._stepSelection(1);
    });

    // Systems Catalog Drawer
    const drawer = document.getElementById('systems-drawer');
    document.getElementById('btn-toggle-index').addEventListener('click', () => {
      drawer.classList.toggle('hidden');
    });
    document.getElementById('drawer-close').addEventListener('click', () => {
      drawer.classList.add('hidden');
    });
  }

  _buildSystemsDrawer() {
    const grid = document.getElementById('systems-grid');
    const toggleBtn = document.getElementById('btn-toggle-index');
    toggleBtn.textContent = `SYSTEMS INDEX (${SYSTEMS_CATALOG.length})`;

    SYSTEMS_CATALOG.forEach((sys) => {
      const btn = document.createElement('button');
      btn.className = 'system-card-btn';
      btn.dataset.sysId = sys.id;
      btn.innerHTML = `
        <span class="sys-card-code">${sys.code}</span>
        <span class="sys-card-name">${sys.name}</span>
      `;
      btn.addEventListener('click', () => {
        this.selectSystem(sys.id);
        document.getElementById('systems-drawer').classList.add('hidden');
      });
      grid.appendChild(btn);
    });
  }

  _syncExplodeSlider(val) {
    const slider = document.getElementById('exploded-slider');
    const desc = document.getElementById('exploded-stage-desc');
    slider.value = val;
    this.eagle.setExplodeAmount(val / 100);

    let stageLabel = 'ASSEMBLED SPECIMEN';
    if (val > 80) stageLabel = 'STAGE 4: CORE, OPTICS & PHALANGES EXPOSED';
    else if (val > 50) stageLabel = 'STAGE 3: KEEL, ACTUATORS & RESPIRATORY NETWORK';
    else if (val > 20) stageLabel = 'STAGE 2: PRIMARY ARRAYS & WING SPARS';
    else if (val > 2) stageLabel = 'STAGE 1: CONTOUR & COVERT SEPARATION';

    desc.textContent = `${Math.round(val)}% — ${stageLabel}`;
  }

  _handleSceneClick() {
    if (this.hoveredSystemId) {
      this.selectSystem(this.hoveredSystemId);
    } else if (this.selectedSystemId) {
      this.clearSelection();
    }
  }

  _stepSelection(delta) {
    const currentIdx = this.selectedSystemId
      ? CATALOG_BY_ID[this.selectedSystemId].index
      : 0;
    const nextIdx =
      (currentIdx + delta + SYSTEMS_CATALOG.length) % SYSTEMS_CATALOG.length;
    this.selectSystem(SYSTEMS_CATALOG[nextIdx].id);
  }

  selectSystem(systemId) {
    const info = CATALOG_BY_ID[systemId];
    if (!info) return;

    if (!this.selectedSystemId) {
      // Save current overview camera pose before entering inspection
      this.savedCamPos.copy(this.camera.position);
      this.savedTarget.copy(this.controls.target);
    }

    this.selectedSystemId = systemId;
    if (this.sound) this.sound.triggerClick(2500, 0.04);

    // Populate Technical Information Panel
    this.panelCode.textContent = `${info.code} / ${SYSTEMS_CATALOG.length}`;
    this.panelTitle.textContent = info.name;
    this.panelAnalogue.textContent = info.analogue;
    this.panelInterpretation.textContent = info.interpretation;
    this.panelFunction.textContent = info.function;
    this.panelMaterial.textContent = info.material;
    this.panelMotion.textContent = info.motion;
    this.techPanel.classList.remove('hidden');

    // Highlight active card in Systems Index drawer
    document.querySelectorAll('.system-card-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.sysId === systemId);
    });

    // If internal thorax/optical mechanism is selected while exterior is opaque,
    // softly reveal internal anatomy so the selected mechanism is crystal-clear!
    const internalSystems = new Set([
      'dual_fovea',
      'keel_chassis',
      'pectoralis_drive',
      'supracoracoideus_drive',
      'amber_core',
      'air_sac_network',
      'parabronchial_core'
    ]);
    if (internalSystems.has(systemId) && this.eagle.currentExplode < 0.25) {
      this.eagle.targetAnatomyAlpha = 0.22;
    } else if (this.eagle.mode !== 'ANATOMY') {
      this.eagle.targetAnatomyAlpha = 1.0;
    }

    // Compute world position of system anchor and set smooth inspection camera pose
    const anchorPos = this._getSystemWorldPosition(systemId);
    const camOff = new THREE.Vector3(...info.cameraOffset);
    const lookOff = new THREE.Vector3(...info.lookOffset);

    this.desiredTarget = anchorPos.clone().add(lookOff);
    this.desiredCamPos = anchorPos.clone().add(camOff);
    this.isTransitioningCam = true;

    // Adjust near/far clipping planes for close-up precision inspection
    this.camera.near = 0.02;
    this.camera.far = 35.0;
    this.camera.updateProjectionMatrix();
  }

  clearSelection() {
    if (!this.selectedSystemId) return;
    this.selectedSystemId = null;
    this.techPanel.classList.add('hidden');
    if (this.sound) this.sound.triggerClick(1600, 0.03);

    if (this.eagle.mode !== 'ANATOMY') {
      this.eagle.targetAnatomyAlpha = 1.0;
    }

    document.querySelectorAll('.system-card-btn').forEach((b) => {
      b.classList.remove('active');
    });

    this.desiredCamPos = this.savedCamPos.clone();
    this.desiredTarget = this.savedTarget.clone();
    this.isTransitioningCam = true;
  }

  _getSystemWorldPosition(systemId) {
    const obj = this.eagle.systemAnchors.get(systemId);
    const targetVec = new THREE.Vector3();
    if (obj) {
      obj.getWorldPosition(targetVec);
    }
    return targetVec;
  }

  update(dt) {
    // 1. Camera smooth cinematic interpolation or subtle orbital drift
    if (this.isTransitioningCam && this.desiredCamPos && this.desiredTarget) {
      const ease = Math.min(1, dt * 4.2);
      this.camera.position.lerp(this.desiredCamPos, ease);
      this.controls.target.lerp(this.desiredTarget, ease);

      if (
        this.camera.position.distanceTo(this.desiredCamPos) < 0.012 &&
        this.controls.target.distanceTo(this.desiredTarget) < 0.008
      ) {
        this.isTransitioningCam = false;
      }
    } else if (
      !this.userInteracting &&
      !this.selectedSystemId &&
      performance.now() - this.lastInteractionTime > 2500
    ) {
      // Extremely slow, mesmerizing museum orbital movement when idle
      const orbitSpeed = 0.045;
      const offset = this.camera.position.clone().sub(this.controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * orbitSpeed);
      this.camera.position.copy(this.controls.target).add(offset);
    }

    this.controls.update();

    // 2. Raycast for hover detection
    this._updateHoverRaycast();

    // 2b. Update per-system material hover response, selection dimming & anatomy opacity
    this._updateMaterialEmphasis(dt);

    // 3. Project 3D hover & active selection callouts to 2D SVG/HTML overlay
    this._updateProjectedLabels();

    // 4. Update bottom telemetry bar
    this._updateTelemetryReadout();
  }

  _updateMaterialEmphasis(dt) {
    const hasSelection = !!this.selectedSystemId;
    const anatomyAlpha = this.eagle.currentAnatomyAlpha;
    const isTranslucent = anatomyAlpha < 0.98;
    const exteriorMatNames = new Set([
      'porcelainExterior',
      'blackEnamel',
      'covertPorcelain',
      'covertDark'
    ]);

    this.systemMaterials.forEach((matSet, sysId) => {
      const isHovered = sysId === this.hoveredSystemId;
      const isSelected = sysId === this.selectedSystemId;

      const targetDim = hasSelection ? (isSelected ? 1.08 : 0.44) : (isHovered ? 1.05 : 1.0);
      const targetEnv = hasSelection ? (isSelected ? 1.35 : 0.42) : (isHovered ? 1.18 : 1.0);
      const targetEmissive = isSelected ? 0.22 : isHovered ? 0.16 : 0.0;

      matSet.forEach((mat) => {
        const baseCol = mat.userData.baseColor;
        mat.color.setRGB(
          baseCol.r * targetDim,
          baseCol.g * targetDim,
          baseCol.b * targetDim
        );
        mat.envMapIntensity = targetEnv;

        if (targetEmissive > 0) {
          mat.emissive.setHex(0xd4bc7c);
          mat.emissiveIntensity = targetEmissive;
        } else {
          mat.emissive.copy(mat.userData.baseEmissive);
          mat.emissiveIntensity = mat.userData.baseEmissiveIntensity;
        }

        if (exteriorMatNames.has(mat.name) || mat.userData.isExterior) {
          mat.transparent = true;
          mat.opacity = isSelected ? Math.max(0.78, anatomyAlpha) : anatomyAlpha;
          mat.depthWrite = mat.opacity > 0.95;
        }
      });
    });
  }

  _updateHoverRaycast() {
    if (this.pointer.x < -1 || this.pointer.x > 1) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickableMeshes, false);

    // Filter out translucent exterior shells if ANATOMY mode is active so internal organs can be clicked directly!
    let chosenHit = null;
    for (const hit of hits) {
      if (
        this.eagle.currentAnatomyAlpha < 0.5 &&
        hit.object.userData.isExterior
      ) {
        continue;
      }
      chosenHit = hit;
      break;
    }

    const newHoverId = chosenHit ? chosenHit.object.userData.systemId : null;
    if (newHoverId !== this.hoveredSystemId) {
      this.hoveredSystemId = newHoverId;
      this.canvasContainer.classList.toggle('hovering-part', !!newHoverId);
    }
  }

  _updateProjectedLabels() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Hover Callout Pill & Leader Line
    if (this.hoveredSystemId && CATALOG_BY_ID[this.hoveredSystemId]) {
      const info = CATALOG_BY_ID[this.hoveredSystemId];
      const worldPos = this._getSystemWorldPosition(this.hoveredSystemId);
      const screenPos = worldPos.clone().project(this.camera);

      if (screenPos.z < 1.0) {
        const sx = (screenPos.x * 0.5 + 0.5) * width;
        const sy = (-screenPos.y * 0.5 + 0.5) * height;
        const labelX = THREE.MathUtils.clamp(sx + (sx > width * 0.5 ? -65 : 65), 110, width - 110);
        const labelY = THREE.MathUtils.clamp(sy - 48, 60, height - 60);

        this.hoverLabel.style.left = `${labelX}px`;
        this.hoverLabel.style.top = `${labelY}px`;
        this.hoverCode.textContent = info.code;
        this.hoverText.textContent = info.name;
        this.hoverLabel.classList.remove('hidden');

        this.hoverDot.setAttribute('cx', sx);
        this.hoverDot.setAttribute('cy', sy);
        this.hoverDot.style.opacity = '1';

        this.hoverLine.setAttribute('x1', sx);
        this.hoverLine.setAttribute('y1', sy);
        this.hoverLine.setAttribute('x2', labelX);
        this.hoverLine.setAttribute('y2', labelY);
        this.hoverLine.style.opacity = '1';
      }
    } else {
      this.hoverLabel.classList.add('hidden');
      this.hoverDot.style.opacity = '0';
      this.hoverLine.style.opacity = '0';
    }

    // Active Selected System Leader Line toward Technical Panel
    if (this.selectedSystemId) {
      const worldPos = this._getSystemWorldPosition(this.selectedSystemId);
      const screenPos = worldPos.clone().project(this.camera);
      if (screenPos.z < 1.0) {
        const sx = (screenPos.x * 0.5 + 0.5) * width;
        const sy = (-screenPos.y * 0.5 + 0.5) * height;
        const panelRect = this.techPanel.getBoundingClientRect();

        this.activeDot.setAttribute('cx', sx);
        this.activeDot.setAttribute('cy', sy);
        this.activeDot.style.opacity = '1';

        this.activeLine.setAttribute('x1', sx);
        this.activeLine.setAttribute('y1', sy);
        this.activeLine.setAttribute('x2', panelRect.left);
        this.activeLine.setAttribute('y2', panelRect.top + 38);
        this.activeLine.style.opacity = '1';
      }
    } else {
      this.activeDot.style.opacity = '0';
      this.activeLine.style.opacity = '0';
    }
  }

  _updateTelemetryReadout() {
    const s = this.eagle.state;
    document.getElementById('tel-rpm').textContent = `${Math.round(s.coreRpm)} RPM`;
    document.getElementById('tel-strain').textContent = `${(s.furculaStrain * 6.4).toFixed(1)}°`;
    const spanPct = Math.round((1 - s.elbowFlex * 0.55) * 100);
    document.getElementById('tel-span').textContent = `${spanPct}%`;
  }
}
