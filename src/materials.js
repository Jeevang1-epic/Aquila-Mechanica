import * as THREE from 'three';
import {
  createFeatherBarbTexture,
  createBrushedMetalTexture,
  createPerforatedLatticeTexture,
  createEngravedDatumTexture
} from './textures.js';

export function createMaterialLibrary() {
  const barbTex = createFeatherBarbTexture();
  const brushedTex = createBrushedMetalTexture();
  const latticeTex = createPerforatedLatticeTexture();
  const datumTex = createEngravedDatumTexture();

  const materials = {
    // 1. Warm Ivory Porcelain (exterior cranial plates, contour plates, feather shafts, keel cradle)
    porcelain: new THREE.MeshPhysicalMaterial({
      name: 'porcelain',
      color: new THREE.Color(0xf1ebe0),
      roughness: 0.24,
      metalness: 0.02,
      clearcoat: 0.86,
      clearcoatRoughness: 0.11,
      reflectivity: 0.65,
      bumpMap: datumTex,
      bumpScale: 0.003
    }),

    // Exterior porcelain that becomes translucent in ANATOMY mode
    porcelainExterior: new THREE.MeshPhysicalMaterial({
      name: 'porcelainExterior',
      color: new THREE.Color(0xf0e9dc),
      roughness: 0.25,
      metalness: 0.02,
      clearcoat: 0.88,
      clearcoatRoughness: 0.1,
      bumpMap: datumTex,
      bumpScale: 0.004,
      transparent: true,
      opacity: 1.0
    }),

    // 2. Black Enamel (dark contrasting contour plates, eyelids, covert accents, cere trim)
    blackEnamel: new THREE.MeshPhysicalMaterial({
      name: 'blackEnamel',
      color: new THREE.Color(0x14161a),
      roughness: 0.18,
      metalness: 0.08,
      clearcoat: 0.92,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 1.0
    }),

    // 3. Gunmetal / Carbon-Black Steel (coracoids, claws, tomial edge, gimbal rings, shafts)
    darkSteel: new THREE.MeshPhysicalMaterial({
      name: 'darkSteel',
      color: new THREE.Color(0x1f2329),
      roughness: 0.32,
      metalness: 0.9,
      clearcoat: 0.15,
      clearcoatRoughness: 0.28,
      roughnessMap: brushedTex
    }),

    // Polished Carbon-Black Steel for Talons & Beak Tomial Cutting Edge
    polishedDarkSteel: new THREE.MeshPhysicalMaterial({
      name: 'polishedDarkSteel',
      color: new THREE.Color(0x15181d),
      roughness: 0.14,
      metalness: 0.94,
      clearcoat: 0.45,
      clearcoatRoughness: 0.1
    }),

    // 4. Brushed Titanium (Keel chassis, humerus/radius/ulna spars, cervical vertebrae, structural ribs)
    titanium: new THREE.MeshPhysicalMaterial({
      name: 'titanium',
      color: new THREE.Color(0x8c929b),
      roughness: 0.36,
      metalness: 0.87,
      roughnessMap: brushedTex,
      bumpMap: datumTex,
      bumpScale: 0.005
    }),

    // 5. Aged Brass (Spur gears, bearing cages, air ducts, hinge hardware, flywheel)
    agedBrass: new THREE.MeshPhysicalMaterial({
      name: 'agedBrass',
      color: new THREE.Color(0xa68952),
      roughness: 0.30,
      metalness: 0.91,
      clearcoat: 0.12,
      roughnessMap: brushedTex
    }),

    // 6. Pale Gold (Furcular Energy Spring outer laminate, precision optical mounts, escapement)
    paleGold: new THREE.MeshPhysicalMaterial({
      name: 'paleGold',
      color: new THREE.Color(0xd8c184),
      roughness: 0.19,
      metalness: 0.96,
      clearcoat: 0.25,
      clearcoatRoughness: 0.12
    }),

    // 7. Tempered Spring Steel (Furcula inner core, torsion springs, tendon cables)
    springSteel: new THREE.MeshPhysicalMaterial({
      name: 'springSteel',
      color: new THREE.Color(0x3a404a),
      roughness: 0.26,
      metalness: 0.92
    }),

    // 8. Primary & Secondary Feather Vane (Translucent etched glass + dark metallic bronze/slate vane with subtle thin-film iridescence)
    featherVanePrimary: new THREE.MeshPhysicalMaterial({
      name: 'featherVanePrimary',
      color: new THREE.Color(0x262422),
      roughness: 0.33,
      metalness: 0.62,
      clearcoat: 0.45,
      clearcoatRoughness: 0.22,
      iridescence: 0.38,
      iridescenceIOR: 1.34,
      iridescenceThicknessRange: [120, 380],
      normalMap: barbTex,
      normalScale: new THREE.Vector2(0.35, 0.35),
      side: THREE.DoubleSide
    }),

    // Translucent Etched Inner Vane / Alula Vane
    featherVaneTranslucent: new THREE.MeshPhysicalMaterial({
      name: 'featherVaneTranslucent',
      color: new THREE.Color(0x3a3630),
      roughness: 0.25,
      metalness: 0.35,
      transmission: 0.32,
      thickness: 0.08,
      ior: 1.48,
      iridescence: 0.45,
      iridescenceIOR: 1.38,
      iridescenceThicknessRange: [140, 420],
      normalMap: barbTex,
      normalScale: new THREE.Vector2(0.3, 0.3),
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    }),

    // Covert Feather Porcelain/Bronze (becomes translucent in ANATOMY mode)
    covertPorcelain: new THREE.MeshPhysicalMaterial({
      name: 'covertPorcelain',
      color: new THREE.Color(0xe6dfd0),
      roughness: 0.28,
      metalness: 0.06,
      clearcoat: 0.75,
      clearcoatRoughness: 0.15,
      normalMap: barbTex,
      normalScale: new THREE.Vector2(0.2, 0.2),
      transparent: true,
      opacity: 1.0
    }),

    covertDark: new THREE.MeshPhysicalMaterial({
      name: 'covertDark',
      color: new THREE.Color(0x22201e),
      roughness: 0.30,
      metalness: 0.45,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
      iridescence: 0.25,
      iridescenceIOR: 1.32,
      normalMap: barbTex,
      normalScale: new THREE.Vector2(0.22, 0.22),
      transparent: true,
      opacity: 1.0
    }),

    // 9. Smoked Optical Glass (Corneal dome, internal lens elements, core chamber)
    smokedGlass: new THREE.MeshPhysicalMaterial({
      name: 'smokedGlass',
      color: new THREE.Color(0x1c222b),
      roughness: 0.05,
      metalness: 0.05,
      transmission: 0.82,
      ior: 1.54,
      thickness: 0.32,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      iridescence: 0.68,
      iridescenceIOR: 1.36,
      iridescenceThicknessRange: [160, 460],
      transparent: true,
      opacity: 0.96
    }),

    // 10. Nictitating Membrane & Pneumatic Air-Sac Translucent Etched Glass
    etchedMembrane: new THREE.MeshPhysicalMaterial({
      name: 'etchedMembrane',
      color: new THREE.Color(0xd8d0c0),
      roughness: 0.22,
      metalness: 0.05,
      transmission: 0.72,
      ior: 1.46,
      thickness: 0.12,
      iridescence: 0.52,
      iridescenceIOR: 1.33,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide
    }),

    // 11. Parabronchial Exchange Core Perforated Ceramic/Metallic Lattice
    lungLattice: new THREE.MeshPhysicalMaterial({
      name: 'lungLattice',
      color: new THREE.Color(0x6e685f),
      roughness: 0.42,
      metalness: 0.68,
      bumpMap: latticeTex,
      bumpScale: 0.025,
      roughnessMap: latticeTex
    }),

    // 12. Amber Flight Core (Warm candle-like internal emissive)
    amberCore: new THREE.MeshPhysicalMaterial({
      name: 'amberCore',
      color: new THREE.Color(0xff9d2e),
      emissive: new THREE.Color(0xff7b14),
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.05,
      transmission: 0.6,
      ior: 1.55,
      thickness: 0.5
    }),

    // 13. Faint Optical Retinal Glint (Caught only at grazing angles / inside lens stack)
    opticalGlint: new THREE.MeshPhysicalMaterial({
      name: 'opticalGlint',
      color: new THREE.Color(0xd4a259),
      emissive: new THREE.Color(0xb87328),
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.92,
      iridescence: 0.85,
      iridescenceIOR: 1.45
    })
  };

  // Store baseline properties so we can cleanly modulate materials for ANATOMY mode or selection dimming
  Object.values(materials).forEach((mat) => {
    mat.userData.baseColor = mat.color.clone();
    mat.userData.baseEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000);
    mat.userData.baseEmissiveIntensity = mat.emissiveIntensity || 0;
    mat.userData.baseOpacity = mat.opacity;
  });

  return materials;
}
