export {
  sharedSphereGeo,
  sharedCylGeo,
  sharedHexGeo,
  sharedTorusGeo,
  tagSelectable,
  registerExplodable
} from './primitives/core.js';

export {
  createGear,
  createBearing,
  createRivetRing,
  createLinkageRod,
  createWingJoint
} from './primitives/hardware.js';

export {
  createPrimaryFeather,
  createFeather,
  createCovertFeatherGeometry
} from './primitives/feathers.js';

export {
  createOpticalEye,
  createTalonDigit,
  createAirSac,
  createCervicalSegment
} from './primitives/anatomy.js';
