import * as THREE from 'three';

/**
 * Generates procedural micro-detail textures on HTML5 Canvas so that close-up
 * inspection reveals feather barb striations, brushed metal grain, datum markings,
 * and perforated ceramic lung lattices without external image dependencies.
 */
export function createFeatherBarbTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Neutral normal/bump base
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 512, 512);

  // Diagonal herringbone barb striations radiating from central shaft
  ctx.lineWidth = 1.2;
  for (let i = -512; i < 1024; i += 4) {
    const shade = i % 8 === 0 ? 155 : 105;
    ctx.strokeStyle = `rgb(${shade}, ${shade}, 255)`;
    // Left vane barbs
    ctx.beginPath();
    ctx.moveTo(256, i);
    ctx.lineTo(0, i - 170);
    ctx.stroke();

    // Right vane barbs
    ctx.beginPath();
    ctx.moveTo(256, i);
    ctx.lineTo(512, i - 170);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function createBrushedMetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y++) {
    const v = 115 + Math.floor(Math.sin(y * 0.7) * 14 + ((y * 37) % 19));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, 256, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function createPerforatedLatticeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#909090';
  ctx.fillRect(0, 0, 256, 256);

  // Hexagonal parabronchial micro-pores
  const stepX = 16;
  const stepY = 14;
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 18; col++) {
      const cx = col * stepX + (row % 2 ? stepX * 0.5 : 0);
      const cy = row * stepY;
      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export function createEngravedDatumTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#b8b8b8';
  ctx.lineWidth = 1.5;

  // Fine vernier graduation ticks and panel seam lines
  ctx.strokeRect(8, 8, 496, 240);
  for (let x = 24; x < 488; x += 8) {
    const h = x % 32 === 0 ? 18 : 9;
    ctx.beginPath();
    ctx.moveTo(x, 8);
    ctx.lineTo(x, 8 + h);
    ctx.moveTo(x, 248);
    ctx.lineTo(x, 248 - h);
    ctx.stroke();
  }

  // Crosshair datum marks
  const marks = [96, 256, 416];
  for (const mx of marks) {
    ctx.beginPath();
    ctx.arc(mx, 128, 14, 0, Math.PI * 2);
    ctx.moveTo(mx - 22, 128);
    ctx.lineTo(mx + 22, 128);
    ctx.moveTo(mx, 128 - 22);
    ctx.lineTo(mx, 128 + 22);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
