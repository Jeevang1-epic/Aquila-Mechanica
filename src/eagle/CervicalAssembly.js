import * as THREE from 'three';
import {
  createCervicalSegment,
  createBearing,
  tagSelectable,
  registerExplodable
} from '../primitives.js';

export function buildCervicalAssembly(mats) {
  const cervicalRoot = new THREE.Group();
  cervicalRoot.name = 'CervicalColumn';

  const totalSegments = 7;
  const segments = [];

  // Base thoracic-cervical gimbal mount at anterior thorax
  const baseBearing = createBearing({
    outerRadius: 0.125,
    innerRadius: 0.068,
    width: 0.026,
    ballCount: 12,
    mats
  });
  baseBearing.rotation.x = Math.PI / 2 - 0.35;
  cervicalRoot.add(baseBearing);

  // Avian S-curve offsets per segment (rises upward and curves gently forward)
  for (let i = 0; i < totalSegments; i++) {
    const t = i / (totalSegments - 1);
    const radius = 0.112 * (1 - t * 0.24);
    const height = 0.048;

    const { segGroup, collar } = createCervicalSegment({
      index: i,
      total: totalSegments,
      radius,
      height,
      mats
    });

    // S-curve positioning relative to cervicalRoot
    const yPos = 0.032 + i * 0.041;
    const zPos = 0.012 + Math.sin(t * Math.PI * 1.15) * 0.036 + t * 0.045;
    const pitchAngle = 0.28 - Math.cos(t * Math.PI) * 0.22;

    segGroup.position.set(0, yPos, zPos);
    segGroup.rotation.x = pitchAngle;
    cervicalRoot.add(segGroup);

    // Lateral stabilization tension rods/cables between segments
    for (const side of [1, -1]) {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0022, 0.0022, height * 1.15, 6),
        mats.springSteel
      );
      cable.position.set(side * radius * 0.88, 0, -radius * 0.2);
      segGroup.add(cable);
    }

    // Register exploded view: outer collar slides forward/outward, segment expands vertically
    registerExplodable(collar, [0, 0.02, 0.14 + i * 0.015], 0.35, 0.75);
    registerExplodable(
      segGroup,
      [0, (i - 2.5) * 0.032, (i - 2) * 0.018],
      0.55,
      0.92
    );

    segments.push({
      group: segGroup,
      basePos: segGroup.position.clone(),
      basePitch: pitchAngle,
      t
    });
  }

  // Head Mount Gimbal Platform at the top of the cervical column
  const headMount = new THREE.Group();
  headMount.name = 'HeadMountNode';
  headMount.position.set(0, 0.325, 0.095);
  cervicalRoot.add(headMount);

  tagSelectable(cervicalRoot, 'cervical_column');

  return {
    root: cervicalRoot,
    segments,
    headMount
  };
}
