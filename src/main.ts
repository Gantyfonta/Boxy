import { GameEngine } from './game/physics';
import { sprites } from './game/sprites';
import { sound } from './game/sound';
import { BoxType } from './game/types';

const makeId = () => Math.random().toString(36).substring(2, 11);

// Initialize Pure Vanilla Game Engine
const engine = new GameEngine();
let initClick = false;

// Grab elements from DOM
const container = document.getElementById('canvas-container') as HTMLDivElement;
const canvas = document.getElementById('retroGameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let animationId: number;
let width = 640;
let height = 360;
let scale = 2; // integer pixel scaling

const keys: { [key: string]: boolean } = {};

const resizeCanvas = () => {
  if (!container || !canvas) return;

  const rect = container.getBoundingClientRect();
  const displayWidth = Math.max(320, Math.floor(rect.width));
  const displayHeight = Math.max(240, Math.floor(rect.height));

  canvas.width = displayWidth;
  canvas.height = displayHeight;

  // Decide integer scale factor to maintain sharp pixel art
  scale = Math.max(1.5, Math.floor(displayHeight / 190));
  if (scale < 1) scale = 1;

  width = Math.floor(displayWidth / scale);
  height = Math.floor(displayHeight / scale);

  // Tell engine the size of our virtual world
  engine.world.width = width;
  engine.world.height = height;
};

// Initial resize
resizeCanvas();

const resizeObserver = new ResizeObserver(() => {
  resizeCanvas();
});
if (container) {
  resizeObserver.observe(container);
}

// Keyboard handlers
const handleKeyDown = (e: KeyboardEvent) => {
  const code = e.code;
  keys[code] = true;

  // Prevent default sliding for gaming keys
  if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(code)) {
    e.preventDefault();
  }

  // Single trigger actions
  if (code === 'KeyE') {
    engine.tryGrabBox();
  }
  if (code === 'KeyF') {
    engine.throwBox();
  }
  if (code === 'KeyQ') {
    engine.tryOpenBox();
  }
  if (code === 'KeyR') {
    engine.resetLevel();
    sound.playUnlock();
  }
  if (code === 'Digit1') {
    engine.selectedCrateType = 'wood';
    sound.playTone(300, 320, 0.05);
  }
  if (code === 'Digit2') {
    engine.selectedCrateType = 'metal';
    sound.playTone(360, 380, 0.05);
  }
  if (code === 'Digit3') {
    engine.selectedCrateType = 'present';
    sound.playTone(420, 445, 0.05);
  }
  if (code === 'Digit4') {
    engine.selectedCrateType = 'tnt';
    sound.playTone(480, 500, 0.05);
  }
  if (code === 'Digit5') {
    engine.selectedCrateType = 'hover';
    sound.playTone(550, 580, 0.05);
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  keys[e.code] = false;
};

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// Mouse to Virtual coordinates converter
const getVirtualMouseCoords = (clientX: number, clientY: number) => {
  const rect = canvas.getBoundingClientRect();
  const rx = clientX - rect.left;
  const ry = clientY - rect.top;
  return {
    mx: Math.floor(rx / scale),
    my: Math.floor(ry / scale),
  };
};

// Canvas click spawn buttons coordinates
const getSpawnButtonRegions = () => {
  const btnSize = 25;
  const spacing = 6;
  const bottomY = height - 28;
  const startX = 14;

  return [
    { type: 'wood' as BoxType, x: startX, y: bottomY, w: btnSize, h: 20, icon: 'crate_wood', label: '1' },
    { type: 'metal' as BoxType, x: startX + btnSize + spacing, y: bottomY, w: btnSize, h: 20, icon: 'crate_metal', label: '2' },
    { type: 'present' as BoxType, x: startX + (btnSize + spacing) * 2, y: bottomY, w: btnSize, h: 20, icon: 'crate_present', label: '3' },
    { type: 'tnt' as BoxType, x: startX + (btnSize + spacing) * 3, y: bottomY, w: btnSize, h: 20, icon: 'crate_tnt', label: '4' },
    { type: 'hover' as BoxType, x: startX + (btnSize + spacing) * 4, y: bottomY, w: btnSize, h: 20, icon: 'crate_hover', label: '5' },
  ];
};

const handleMouseDown = (e: MouseEvent) => {
  if (!initClick) {
    initClick = true;
    sound.playTick();
  }

  const { mx, my } = getVirtualMouseCoords(e.clientX, e.clientY);

  // Check toggler click (Sound button top left)
  if (mx >= 12 && mx <= 70 && my >= 10 && my <= 30) {
    const nextEnabled = !sound.enabled;
    sound.enabled = nextEnabled;
    sound.playTick();
    return;
  }

  // Check level reset button
  if (mx >= width - 65 && mx <= width - 10 && my >= 10 && my <= 30) {
    engine.resetLevel();
    sound.playUnlock();
    return;
  }

  // Check custom spawner bottom HUD bar buttons
  const buttons = getSpawnButtonRegions();
  for (const btn of buttons) {
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      engine.selectedCrateType = btn.type;
      sound.playTone(400, 420, 0.05);
      return;
    }
  }

  // Spawn crate on free empty space within upper screen if we shift-click,
  // otherwise, try grab and drag!
  if (e.shiftKey) {
    engine.spawnCrateAt(mx - 14, my - 14, engine.selectedCrateType);
    sound.playTone(320, 480, 0.1, "triangle", 0.6);
    return;
  }

  engine.handleMouseDown(mx, my);
};

const handleMouseMove = (e: MouseEvent) => {
  const { mx, my } = getVirtualMouseCoords(e.clientX, e.clientY);
  engine.handleMouseMove(mx, my);
};

const handleMouseUp = () => {
  engine.handleMouseUp();
};

// Touch event supports
const handleTouchStart = (e: TouchEvent) => {
  if (!initClick) {
    initClick = true;
    sound.playTick();
  }
  if (e.touches[0]) {
    const { mx, my } = getVirtualMouseCoords(e.touches[0].clientX, e.touches[0].clientY);
    engine.handleMouseDown(mx, my);
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches[0]) {
    const { mx, my } = getVirtualMouseCoords(e.touches[0].clientX, e.touches[0].clientY);
    engine.handleMouseMove(mx, my);
  }
};

canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
window.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
window.addEventListener('touchend', handleMouseUp);

// ----------------- Drawing Helpers -----------------

const drawHangingLamp = (x: number, len: number) => {
  ctx.strokeStyle = '#566c86';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, len);
  ctx.stroke();

  // Golden cap lamp shade (Vibrant Palette style matching header boxes)
  ctx.fillStyle = '#333c57';
  ctx.strokeStyle = '#10121c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 12, len);
  ctx.lineTo(x + 12, len);
  ctx.lineTo(x + 6, len - 4);
  ctx.lineTo(x - 6, len - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Warm light cone bulb oscillation
  const time = Date.now() * 0.0015;
  const glowIntensity = 0.15 + Math.sin(time * 2.0) * 0.03;
  
  // Draw glowing light cone gradient
  const coneGrad = ctx.createLinearGradient(x, len, x, len + 100);
  coneGrad.addColorStop(0, `rgba(255, 205, 117, ${glowIntensity})`); // Peach gold light
  coneGrad.addColorStop(1, 'rgba(255, 205, 117, 0)');
  ctx.fillStyle = coneGrad;

  ctx.beginPath();
  ctx.moveTo(x - 4, len);
  ctx.lineTo(x + 4, len);
  ctx.lineTo(x + 45, len + 120);
  ctx.lineTo(x - 45, len + 120);
  ctx.closePath();
  ctx.fill();

  // Little bulb slot
  ctx.fillStyle = '#ffcd75';
  ctx.beginPath();
  ctx.arc(x, len + 1, 2, 0, Math.PI * 2);
  ctx.fill();
};

const drawWarehouseBackground = (w: number, h: number) => {
  ctx.fillStyle = '#292d3e'; // Viewport background
  ctx.fillRect(0, 0, w, h);

  // Grid lines block
  ctx.strokeStyle = '#566c86';
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 1;
  const brickSize = 32;
  for (let x = 0; x < w; x += brickSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // Left and Right robust warehouse walls
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(0, 0, 8, h);
  ctx.fillRect(w - 8, 0, 8, h);

  // Dark layout border column stripes
  ctx.fillStyle = '#10121c';
  ctx.fillRect(8, 0, 2, h);
  ctx.fillRect(w - 10, 0, 2, h);

  // Industrial hanging yellow pendant lights
  drawHangingLamp(w / 4, 30);
  drawHangingLamp((w * 3) / 4, 30);
};

const drawWarehouseFloor = (w: number, h: number) => {
  const floorY = h - 32;
  // Heavy support background wall beam
  ctx.fillStyle = '#333c57';
  ctx.fillRect(0, floorY, w, 32);

  // Thick black outline separation separator
  ctx.fillStyle = '#10121c';
  ctx.fillRect(0, floorY, w, 4);

  // Soft bubble support plates drawn below ground
  ctx.fillStyle = '#10121c';
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.arc(w / 4, floorY + 16, 24, 0, Math.PI, false);
  ctx.arc(w * 3 / 4, floorY + 16, 32, 0, Math.PI, false);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Warnings orange stripe highlights (Vibrant Theme style)
  ctx.fillStyle = '#ef7d57'; 
  const widthStripe = 6;
  for (let x = 16; x < w - 16; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, floorY + 6);
    ctx.lineTo(x + widthStripe, floorY + 6);
    ctx.lineTo(x + widthStripe + 6, floorY + 12);
    ctx.lineTo(x + 6, floorY + 12);
    ctx.closePath();
    ctx.fill();
  }
};

const drawLevelGoalPoster = (w: number, h: number) => {
  const bw = 240;
  const bh = 54;
  const bx = (w - bw) / 2;
  const by = 42;

  ctx.fillStyle = '#333c57';
  ctx.fillRect(bx, by, bw, bh);

  ctx.strokeStyle = '#10121c';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(bx, by, bw, bh);

  ctx.textAlign = 'left';
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = '#ffcd75';
  ctx.fillText("FACILITY OBJECTIVES - SECTOR 7-B", bx + 10, by + 14);

  const crownCompleted = engine.stats.crownsFound >= 1;
  ctx.fillStyle = crownCompleted ? '#73ef7d' : '#f4f4f4';
  ctx.fillText(`${crownCompleted ? '[V]' : '[ ]'} Find the King Crown 👑`, bx + 15, by + 28);
  ctx.font = '5.5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("(Smash Present for Key 🔑 -> Unlock Right Crown Crate)", bx + 152, by + 28);

  const stackCompleted = engine.stats.cratesStacked >= 3;
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = stackCompleted ? '#73ef7d' : '#f4f4f4';
  ctx.fillText(`${stackCompleted ? '[V]' : '[ ]'} Stack 3 Present Boxes vertically 🎁`, bx + 15, by + 42);
  ctx.font = '5.5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText(`(Current Stack: ${engine.stats.cratesStacked}/3)`, bx + 194, by + 42);

  if (engine.isGoalCompleted) {
    ctx.fillStyle = 'rgba(115, 239, 125, 0.1)';
    ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
  }
};

const drawInteractBubbles = () => {
  let target: string | null = null;
  let targetX = 0;
  let targetY = 0;

  for (const b of engine.boxes) {
    if (b.grabbed || b.isOpened) continue;
    
    const px = engine.player.x + engine.player.width / 2;
    const py = engine.player.y + engine.player.height / 2;
    const bx = b.x + b.width / 2;
    const by = b.y + b.height / 2;
    const dist = Math.hypot(bx - px, by - py);

    if (dist < 42) {
      if (b.id === 'locked_crown_box') {
        target = "NEED KEY 🔑";
      } else if (b.type === 'present') {
        target = "Q: OPEN  E: LIFT";
      } else if (b.type === 'wood') {
        target = "E: LIFT  Q: SMASH";
      } else if (b.type === 'tnt') {
        target = "E: LIFT  Q: IGNITE FUSE";
      } else {
        target = "E: LIFT";
      }
      targetX = bx;
      targetY = b.y - 12;
      break;
    }
  }

  if (engine.player.grabbingBox && !target) {
    target = "E: DROP  F: THROW";
    targetX = engine.player.x + engine.player.width / 2;
    targetY = engine.player.y - engine.player.grabbingBox.height - 10;
  }

  if (target) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#10121c';
    const textWidth = ctx.measureText(target).width + 8;
    ctx.fillRect(targetX - textWidth / 2, targetY - 10, textWidth, 12);
    
    ctx.fillStyle = '#f4f4f4';
    ctx.font = '6px monospace';
    ctx.fillText(target, targetX, targetY - 2);

    ctx.beginPath();
    ctx.moveTo(targetX - 3, targetY + 2);
    ctx.lineTo(targetX + 3, targetY + 2);
    ctx.lineTo(targetX, targetY + 5);
    ctx.closePath();
    ctx.fillStyle = '#10121c';
    ctx.fill();
  }
};

const drawGameHud = (
  w: number,
  h: number,
  buttons: Array<{ type: BoxType; x: number; y: number; w: number; h: number; icon: string; label: string }>
) => {
  // Sound indicator
  ctx.fillStyle = sound.enabled ? '#333c57' : '#a24b31';
  ctx.strokeStyle = '#10121c';
  ctx.lineWidth = 1.5;
  ctx.fillRect(12, 10, 58, 16);
  ctx.strokeRect(12, 10, 58, 16);

  ctx.fillStyle = '#f4f4f4';
  ctx.textAlign = 'center';
  ctx.font = '6.5px monospace';
  ctx.fillText(sound.enabled ? '🔊 SOUND' : '🔇 MUTED', 41, 21);

  // Goal Completed
  if (engine.isGoalCompleted) {
    ctx.fillStyle = 'rgba(26, 28, 44, 0.9)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffcd75';
    ctx.textAlign = 'center';
    ctx.fillText("★ CHALLENGE COMPLETED ★", w / 2, h / 2 - 25);

    ctx.fillStyle = '#f4f4f4';
    ctx.fillText("You successfully extracted the Crown & Stacked Boxes!", w / 2, h / 2 - 5);

    ctx.fillStyle = '#ef7d57';
    ctx.strokeStyle = '#10121c';
    ctx.fillRect(w / 2 - 60, h / 2 + 15, 120, 22);
    ctx.strokeRect(w / 2 - 60, h / 2 + 15, 120, 22);

    ctx.fillStyle = '#10121c';
    ctx.font = 'bold 8px monospace';
    ctx.fillText("PRESS R TO RESET SANDBOX", w / 2, h / 2 + 29);
    return;
  }

  // Reset & Statistics
  const resetX = w - 65;
  ctx.fillStyle = '#ef7d57';
  ctx.strokeStyle = '#10121c';
  ctx.fillRect(resetX, 10, 55, 16);
  ctx.strokeRect(resetX, 10, 55, 16);
  ctx.fillStyle = '#10121c';
  ctx.font = 'bold 6.5px monospace';
  ctx.fillText("🔄 RESET (R)", resetX + 27, 21);

  const statsX = w - 74;
  ctx.fillStyle = '#333c57';
  ctx.strokeStyle = '#10121c';
  ctx.lineWidth = 1.5;
  ctx.fillRect(statsX - 60, 32, 130, 11);
  ctx.strokeRect(statsX - 60, 32, 130, 11);

  ctx.fillStyle = '#f4f4f4';
  ctx.font = '6px monospace';
  ctx.fillText(`💎 GEMS: ${engine.stats.gemsCollected}`, statsX - 54, 40);
  ctx.fillText(`🎁 OPENED: ${engine.stats.cratesOpened}`, statsX - 4, 40);

  // Spawner Bar
  const spawnHUDw = 175;
  const spawnHUDh = 30;
  const spawnHUDx = 8;
  const spawnHUDy = h - 35;

  ctx.fillStyle = '#333c57';
  ctx.strokeStyle = '#10121c';
  ctx.fillRect(spawnHUDx, spawnHUDy, spawnHUDw, spawnHUDh);
  ctx.strokeRect(spawnHUDx, spawnHUDy, spawnHUDw, spawnHUDh);

  ctx.textAlign = 'left';
  ctx.font = 'bold 6px monospace';
  ctx.fillStyle = '#ffcd75';
  ctx.fillText("SPAWNER (SELECT KEY 1-5 OR CLICK / SHIFT+CLICK CANVAS TO SPAWN):", spawnHUDx + 6, spawnHUDy + 8);

  for (const btn of buttons) {
    const isSelected = engine.selectedCrateType === btn.type;
    ctx.fillStyle = isSelected ? '#ffcd75' : '#1a1c2c';
    ctx.strokeStyle = '#10121c';
    ctx.lineWidth = isSelected ? 1.8 : 1;
    
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    
    sprites.drawSprite(ctx, btn.icon, btn.x + 6, btn.y + 2, 13, 13);

    ctx.fillStyle = isSelected ? '#10121c' : '#f4f4f4';
    ctx.font = 'bold 5.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(btn.type.substring(0, 3).toUpperCase(), btn.x + btn.w / 2, btn.y + 18);
  }

  const spawnerPlaceHUDX = spawnHUDx + spawnHUDw + 4;
  ctx.fillStyle = '#333c57';
  ctx.strokeStyle = '#10121c';
  ctx.fillRect(spawnerPlaceHUDX, spawnHUDy, w - spawnerPlaceHUDX - 8, spawnHUDh);
  ctx.strokeRect(spawnerPlaceHUDX, spawnHUDy, w - spawnerPlaceHUDX - 8, spawnHUDh);

  ctx.font = '5px monospace';
  ctx.fillStyle = '#ffcd75';
  ctx.fillText(`SELECTED CRATE: ${engine.selectedCrateType.toUpperCase()}`, spawnerPlaceHUDX + 6, spawnHUDy + 9);
  
  let featureDesc = "";
  if (engine.selectedCrateType === 'wood') featureDesc = "Medium gravity. Smashable & splinters high! 🪵";
  if (engine.selectedCrateType === 'metal') featureDesc = "Super heavy. Rigid support blocks layout.";
  if (engine.selectedCrateType === 'present') featureDesc = "Light bouncy & elastic. Collectibles inside! 🎁";
  if (engine.selectedCrateType === 'tnt') featureDesc = "Highly dangerous! Ignites if shaken or dropped.";
  if (engine.selectedCrateType === 'hover') featureDesc = "Defies gravity! Stays locked, floats in place.";

  ctx.fillStyle = '#f4f4f4';
  ctx.fillText(featureDesc, spawnerPlaceHUDX + 6, spawnHUDy + 17);
  ctx.fillStyle = '#ef7d57';
  ctx.fillText("TIP: Drag boxes with MOUSE cursor to throw them!", spawnerPlaceHUDX + 6, spawnHUDy + 25);
};

// ----------------- Main Loop -----------------

const loop = () => {
  const p = engine.player;
  const walkSpeed = p.grabbingBox ? 1.75 : 2.5;
  const accel = 0.55;

  if (keys['KeyA'] || keys['ArrowLeft']) {
    p.vx -= accel;
    if (p.vx < -walkSpeed) p.vx = -walkSpeed;
    p.facing = 'left';
  } else if (keys['KeyD'] || keys['ArrowRight']) {
    p.vx += accel;
    if (p.vx > walkSpeed) p.vx = walkSpeed;
    p.facing = 'right';
  }

  if ((keys['KeyW'] || keys['Space'] || keys['ArrowUp']) && p.onGround) {
    const weightMult = p.grabbingBox ? (p.grabbingBox.type === 'metal' ? 0.68 : 0.85) : 1.0;
    p.vy = -5.7 * weightMult;
    p.onGround = false;
    sound.playJump();
    engine.spawnDust(p.x + p.width/2, height - 32, 4);
  }

  engine.update();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  
  if (engine.cameraShake > 0) {
    const dx = (Math.random() - 0.5) * engine.cameraShake;
    const dy = (Math.random() - 0.5) * engine.cameraShake;
    ctx.translate(dx, dy);
  }

  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  drawWarehouseBackground(width, height);
  drawLevelGoalPoster(width, height);
  drawWarehouseFloor(width, height);

  // Boxes
  for (const b of engine.boxes) {
    if (b.grabbed) continue;

    if (engine.dragJoint.box?.id === b.id) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
    }

    let tintColor: string | undefined;
    if (b.type === 'tnt' && b.fuseTimer !== null) {
      const frequency = b.fuseTimer < 25 ? 4 : 10;
      if (Math.floor(b.fuseTimer / frequency) % 2 === 0) {
        tintColor = 'rgba(255, 255, 255, 0.45)';
      }
    }

    ctx.save();
    ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
    ctx.scale(b.squishX, b.squishY);
    
    sprites.drawSprite(ctx, `crate_${b.type}`, -b.width / 2, -b.height / 2, b.width, b.height, {
      angle: b.angle,
      tint: tintColor || b.customColor
    });

    if (b.customColor) {
      b.sparkleTimer = (b.sparkleTimer || 0) + 1;
      if (b.sparkleTimer % 18 === 0) {
        engine.particles.push({
          id: makeId(),
          type: 'sparkle',
          x: b.x + Math.random() * b.width,
          y: b.y + Math.random() * b.height,
          vx: 0,
          vy: -0.2,
          color: '#ffe385',
          size: Math.random() * 2 + 1,
          life: 1.0,
          decay: 0.05,
          angle: 0,
          angularVelocity: 0
        });
      }
    }

    ctx.restore();
  }

  // Loot
  for (const item of engine.lootItems) {
    const spriteName = item.type === 'coin' 
      ? `loot_coin_${Math.floor(item.shineTimer / 6) % 3 + 1}` 
      : `loot_${item.type}`;
    
    sprites.drawSprite(ctx, spriteName, item.x, item.y, item.width, item.height, {
      angle: item.angle
    });
  }

  // Player state setup
  let playerSprite = 'player_idle_1';
  if (p.state === 'walk') {
    const walkFrames = ['player_walk_1', 'player_walk_2', 'player_walk_3', 'player_walk_4'];
    playerSprite = walkFrames[p.animFrame] || 'player_walk_1';
  } else if (p.state === 'grab_idle') {
    playerSprite = 'player_carry_idle';
  } else if (p.state === 'grab_walk') {
    playerSprite = 'player_carry_idle';
  } else if (p.state === 'jump') {
    playerSprite = p.grabbingBox ? 'player_carry_idle' : 'player_jump';
  }

  // Draw carried box
  if (p.grabbingBox) {
    const b = p.grabbingBox;
    ctx.save();
    ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
    ctx.scale(b.squishX, b.squishY);
    sprites.drawSprite(ctx, `crate_${b.type}`, -b.width / 2, -b.height / 2, b.width, b.height, {
      angle: b.angle
    });
    ctx.restore();
  }

  sprites.drawSprite(ctx, playerSprite, p.x, p.y, p.width, p.height, {
    flipX: p.facing === 'left'
  });

  drawInteractBubbles();

  // Draw particles
  for (const part of engine.particles) {
    ctx.save();
    ctx.globalAlpha = part.life;

    if (part.type === 'smoke') {
      ctx.beginPath();
      ctx.fillStyle = part.color;
      ctx.arc(part.x, part.y, part.size * (1.5 - part.life * 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else if (part.type === 'fire') {
      ctx.beginPath();
      ctx.fillStyle = part.color;
      ctx.arc(part.x, part.y, part.size * part.life, 0, Math.PI * 2);
      ctx.fill();
    } else if (part.type === 'shockwave') {
      ctx.beginPath();
      ctx.strokeStyle = part.color;
      ctx.lineWidth = 2;
      ctx.arc(part.x, part.y, part.size * (1.0 - part.life) * 4.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (part.type === 'star' || part.type === 'sparkle') {
      ctx.translate(part.x, part.y);
      ctx.rotate(part.angle);
      ctx.fillStyle = part.color;
      const sz = part.size;
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.lineTo(sz * 0.3, -sz * 0.3);
      ctx.lineTo(sz, 0);
      ctx.lineTo(sz * 0.3, sz * 0.3);
      ctx.lineTo(0, sz);
      ctx.lineTo(-sz * 0.3, sz * 0.3);
      ctx.lineTo(-sz, 0);
      ctx.lineTo(-sz * 0.3, -sz * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (part.type === 'wood_splinter') {
      ctx.translate(part.x, part.y);
      ctx.rotate(part.angle);
      ctx.fillStyle = part.color;
      ctx.fillRect(-part.size / 2, -1, part.size, 2);
    }

    ctx.restore();
  }

  ctx.textAlign = 'center';
  for (const txt of engine.floatingTexts) {
    ctx.fillStyle = 'rgba(16, 20, 31, 0.75)';
    const txtWidth = ctx.measureText(txt.text).width + 6;
    ctx.fillRect(txt.x - txtWidth/2, txt.y - 10, txtWidth, 12);

    ctx.fillStyle = txt.color;
    ctx.font = 'bold 8px monospace';
    ctx.fillText(txt.text, txt.x, txt.y - 1);
  }

  if (engine.dragJoint.box) {
    const b = engine.dragJoint.box;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(54, 229, 240, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.moveTo(b.x + b.width / 2, b.y + b.height / 2);
    ctx.lineTo(engine.dragJoint.mouseX, engine.dragJoint.mouseY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawGameHud(width, height, getSpawnButtonRegions());

  ctx.restore();

  animationId = requestAnimationFrame(loop);
};

// Fire loop
loop();
