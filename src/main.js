import * as THREE from 'three';
import { createMaterialLibrary } from './materials.js';
import { setupExhibitionEnvironment, setupPostProcessing } from './environment.js';
import { AquilaMechanica } from './eagle/AquilaMechanica.js';
import { ExhibitionInteractionController } from './interaction.js';
import { ClockworkSoundEngine } from './sound.js';

function initExhibition() {
  const container = document.getElementById('canvas-container');

  // 1. Renderer Configuration (Capped DPR at 2 for steady 60 FPS)
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({
    antialias: false, // Handled by post-processing SMAAPass
    powerPreference: 'high-performance',
    stencil: false
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 2. Scene & Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    38,
    window.innerWidth / window.innerHeight,
    0.04,
    45.0
  );

  // 3. Exhibition Lighting & Environment
  const lights = setupExhibitionEnvironment(scene, renderer, camera);

  // 4. Material Library & Sound Engine
  const mats = createMaterialLibrary();
  const sound = new ClockworkSoundEngine();

  // 5. Build Aquila Mechanica Hierarchical Automaton
  const eagle = new AquilaMechanica(mats, sound);
  scene.add(eagle.root);

  // 6. Post-Processing Pipeline (Selective Bloom + Vignette + ToneMapping + SMAA)
  const { composer, bloomPass, smaaPass } = setupPostProcessing(renderer, scene, camera);

  // 7. Camera, Raycasting & Exhibition UI Controller
  const interaction = new ExhibitionInteractionController({
    camera,
    renderer,
    scene,
    eagle,
    sound
  });

  // 8. Responsive Resize Handler
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const currentDpr = Math.min(window.devicePixelRatio || 1, 2);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(currentDpr);
    renderer.setSize(w, h);
    composer.setPixelRatio(currentDpr);
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
    if (smaaPass && smaaPass.setSize) {
      smaaPass.setSize(w * currentDpr, h * currentDpr);
    }
  });

  // 9. Optional URL query parameters for deterministic studio/screenshot framing
  const params = new URLSearchParams(window.location.search);
  const curtain = document.getElementById('loading-curtain');

  if (params.get('skipHero') === '1') {
    eagle.heroActive = false;
    eagle.heroProgress = 1.0;
    if (curtain) curtain.style.display = 'none';
  } else {
    setTimeout(() => {
      if (curtain) curtain.classList.add('fade-out');
    }, 350);
  }

  if (params.get('mode')) {
    const m = params.get('mode').toUpperCase();
    const btn = document.querySelector(`.mode-btn[data-mode="${m}"]`);
    if (btn) btn.click();
  }
  if (params.get('flight')) {
    const f = params.get('flight').toUpperCase();
    const btn = document.querySelector(`.sub-btn[data-flight="${f}"]`);
    if (btn) btn.click();
  }
  if (params.get('explode')) {
    const expVal = parseFloat(params.get('explode'));
    interaction._syncExplodeSlider(expVal);
    eagle.currentExplode = expVal / 100;
  }
  if (params.get('select')) {
    // Advance eagle one tick so world matrices are up-to-date before framing
    eagle.update(0.016, camera.position);
    eagle.root.updateMatrixWorld(true);
    interaction.selectSystem(params.get('select'));
    if (interaction.desiredCamPos && interaction.desiredTarget) {
      camera.position.copy(interaction.desiredCamPos);
      interaction.controls.target.copy(interaction.desiredTarget);
      interaction.controls.update();
      interaction.isTransitioningCam = false;
    }
  }

  window.__aquila = { eagle, interaction, camera, scene, renderer };

  // 10. Main 60 FPS Exhibition Loop
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);

    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    // During initial Hero Awakening (first 6.8 seconds), ramp scene lighting up from near-dark
    // so the Amber Flight Core is the first thing seen!
    if (eagle.heroActive) {
      const lightWake = THREE.MathUtils.smoothstep(eagle.heroProgress, 0.12, 0.72);
      lights.keyLight.intensity = 0.08 + lightWake * 2.32;
      lights.rimLight.intensity = 0.12 + lightWake * 1.98;
      lights.fillLight.intensity = 0.04 + lightWake * 0.68;
      scene.environmentIntensity = 0.10 + lightWake * 0.82;
    } else {
      lights.keyLight.intensity = 2.4;
      lights.rimLight.intensity = 2.1;
      lights.fillLight.intensity = 0.72;
      scene.environmentIntensity = 0.92;
    }

    eagle.update(dt, camera.position);
    interaction.update(dt);
    sound.update(dt, eagle.state.coreRpm);

    composer.render();
  }

  requestAnimationFrame(animate);
}

initExhibition();
