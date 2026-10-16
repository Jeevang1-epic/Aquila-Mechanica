# AQUILA MECHANICA

**An Anatomical Flight Automaton** (*Aquila chrysaetos* · Scale 1:1)

An interactive Three.js study of a mechanical Golden Eagle constructed from warm ivory porcelain, black enamel, pale gold, aged brass, brushed titanium, carbon-black steel, and smoked optical glass. Every biological system of the raptor is reinterpreted as believable precision horological and aerospace machinery.

---

## Architectural Systems

### 1. Head — Optical & Targeting Assembly (`src/eagle/HeadAssembly.js`)
- **Cranial Housing**: Porcelain-and-titanium monocoque shell with removable side inspection plates, internal structural ribs, and predatory supraorbital brow ridges.
- **Binocular Raptor Eyes**: Forward-convergent telephoto lens barrels with 12-blade radial iris diaphragms and smoked-glass corneal domes.
- **Dual-Fovea Optical Targeting Assembly**: Internal central and temporal foveal sensors mounted on precision focusing rails and stabilizing micro-gimbals.
- **Nictitating Optical Shield**: Translucent thin-film etched-glass protective shutters traveling on curved guides.
- **Beak & Mandibular Linkage**: Hooked porcelain upper rostrum, carbon-black steel tomial cutting edge, brass quadrate hinge, articulated lower mandible, and ram-air **Cere & Nasal Intake** manifold.

### 2. Neck — Cervical Stabilization Column (`src/eagle/CervicalAssembly.js`)
- 7 nested S-curve gimbaled cervical vertebrae with opposing tension cables and return springs that isolate the head from thoracic pitch, roll, yaw, and heave.

### 3. Thorax — The Flight Engine (`src/eagle/ThoraxAssembly.js`)
- **Keel Chassis**: Truss-milled titanium carina and ribs with avian uncinate processes.
- **Furcular Energy Spring**: Laminated pale-gold and spring-steel wishbone that stores and returns elastic strain energy during wingbeats.
- **Coracoid Compression Struts & Scapular Rails**: Forged darkened-steel compression columns and dorsal titanium guide rails.
- **Primary Downstroke Actuator**: Counter-rotating meshed spur gears, mainspring drums, and crankshaft linkages driving the ventral humerus.
- **Dorsal Upstroke Tendon Drive**: Ventral hoist cable routed upward through a machined **Triosseal Canal** pulley sheave.
- **Pneumatic Air-Sac Network & Parabronchial Exchange Core**: Rhythmic smoked-glass bellows chambers and perforated ceramic lung blocks.
- **Amber Flight Core**: Candle-like internal optical torsion vessel driving a high-inertia brass flywheel and clockwork escapement.

### 4. Wings & Feathers (`src/eagle/WingAssembly.js`)
- **Glenohumeral Flight Joint**, **Humerus Spar**, four-bar coupled **Elbow Joint**, paired **Radius & Ulna Spars** with 12 feather-root bearings, and geared **Carpal Folding Joint**.
- **Alula — Low-Speed Leading-Edge Control**: Articulated 3-vane leading-edge high-lift slat mechanism.
- **Primary (`P1–P10`) & Secondary (`S1–S12`) Flight Feathers**: Individually articulated feathers with emarginated outer wingtip fingers, pitch-control bus bar, and sliding `InstancedMesh` covert arrays.

### 5. Tail & Talons (`src/eagle/TailAssembly.js`, `src/eagle/LegTalonAssembly.js`)
- **Caudal Control Gearbox**: Differential bevel/spur gearbox driving 12 individually pivoted rectrices.
- **Tendon-Lock Capture Mechanism**: Retractable femur/tibiotarsus, scaled tarsometatarsus, heel-routed flexor cable, toothed ratchet pawl lock, and 4 multi-phalange anisodactyl talons.

---

## Running Locally

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```
