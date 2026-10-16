import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Builds a custom procedural Museum Studio Light-Probe Environment for PMREMGenerator
 * so clearcoat porcelain, brushed titanium, aged brass, pale gold, and smoked glass
 * catch physically believable reflections as the camera orbits.
 */
function buildMuseumEnvironmentTexture(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x090a0d);

  // Soft overhead diffused museum light bank
  const topPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdfd7c8), side: THREE.DoubleSide })
  );
  topPanel.position.set(2, 8, 3);
  topPanel.lookAt(0, 0, 0);
  envScene.add(topPanel);

  // Warm rim strip light behind and to the left
  const rimStripL = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 3.5),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf5e2be), side: THREE.DoubleSide })
  );
  rimStripL.position.set(6, 3.5, -6);
  rimStripL.lookAt(0, 0, 0);
  envScene.add(rimStripL);

  // Secondary cool-neutral rim strip on right
  const rimStripR = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 3),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9aa4b4), side: THREE.DoubleSide })
  );
  rimStripR.position.set(-7, 2.5, -4);
  rimStripR.lookAt(0, 0, 0);
  envScene.add(rimStripR);

  // Subtle warm floor bounce
  const floorBounce = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0x241f18), side: THREE.DoubleSide })
  );
  floorBounce.position.set(0, -7, 0);
  floorBounce.lookAt(0, 0, 0);
  envScene.add(floorBounce);

  const renderTarget = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  return renderTarget.texture;
}

export function setupExhibitionEnvironment(scene, renderer, camera) {
  // Dark charcoal / near-black museum exhibition background
  scene.background = new THREE.Color(0x08090b);
  scene.fog = new THREE.FogExp2(0x08090b, 0.065);

  // Apply studio reflection environment
  const envTex = buildMuseumEnvironmentTexture(renderer);
  scene.environment = envTex;
  scene.environmentIntensity = 0.92;

  // 1. Large Soft Key Light (3/4 frontal-top-left)
  const keyLight = new THREE.DirectionalLight(0xfff6e8, 2.4);
  keyLight.position.set(3.8, 5.2, 4.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 1.0;
  keyLight.shadow.camera.far = 14.0;
  const d = 2.8;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.015;
  scene.add(keyLight);

  // 2. Controlled Rim Light (Back-top-right to reveal primary feather silhouettes, beak hook & ceramic contours)
  const rimLight = new THREE.DirectionalLight(0xf7e7ce, 2.1);
  rimLight.position.set(-3.2, 3.6, -4.6);
  scene.add(rimLight);

  // Secondary grazing wingtip rim light (Back-left)
  const rimLightLeft = new THREE.DirectionalLight(0xd8e0ec, 1.15);
  rimLightLeft.position.set(4.5, 1.8, -3.8);
  scene.add(rimLightLeft);

  // 3. Faint Frontal & Ventral Fill Light (prevents crushed shadows and keeps internal thorax machinery readable)
  const fillLight = new THREE.DirectionalLight(0xc8d0dc, 0.72);
  fillLight.position.set(-2.2, -1.6, 3.8);
  scene.add(fillLight);

  const hemiFill = new THREE.HemisphereLight(0xdad4c8, 0x1c1a17, 0.45);
  scene.add(hemiFill);

  // 4. Subtle Exhibition Shadow-Catcher / Reflection Floor Disc far below eagle
  const floorGeo = new THREE.CircleGeometry(6.5, 48);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x090a0d),
    roughness: 0.45,
    metalness: 0.1,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.y = -1.35;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Faint engraved museum floor datum ring
  const floorRing = new THREE.Mesh(
    new THREE.RingGeometry(1.45, 1.462, 64),
    new THREE.MeshBasicMaterial({
      color: 0xd4bc7c,
      transparent: true,
      opacity: 0.11,
      side: THREE.DoubleSide
    })
  );
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = -1.348;
  scene.add(floorRing);

  return { keyLight, rimLight, fillLight, floorMesh };
}

/**
 * Sets up minimal, museum-grade Post-Processing:
 * - RenderPass
 * - Extremely subtle Selective UnrealBloomPass (high threshold so ONLY the Amber Flight Core blooms)
 * - Subtle Vignette ShaderPass
 * - OutputPass (ACESFilmicToneMapping) + SMAAPass anti-aliasing
 */
export function setupPostProcessing(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const pixelRatio = renderer.getPixelRatio();

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(size.x, size.y);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Selective bloom: high threshold (0.92) ensures porcelain/gold never glow artificially,
  // while the emissive Amber Flight Core gets a soft candle-like halo.
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    0.24, // Very restrained strength
    0.35, // Soft radius
    0.92  // High threshold: only genuinely emissive internal core blooms
  );
  composer.addPass(bloomPass);

  // Subtle exhibition vignette pass
  const VignetteShader = {
    uniforms: {
      tDiffuse: { value: null },
      offset: { value: 1.05 },
      darkness: { value: 0.85 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float offset;
      uniform float darkness;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
        float vig = clamp(1.0 - dot(uv, uv) * darkness * 0.38, 0.0, 1.0);
        gl_FragColor = vec4(texel.rgb * vig, texel.a);
      }
    `
  };
  const vignettePass = new ShaderPass(VignetteShader);
  composer.addPass(vignettePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const smaaPass = new SMAAPass(size.x * pixelRatio, size.y * pixelRatio);
  composer.addPass(smaaPass);

  return { composer, bloomPass, smaaPass };
}
