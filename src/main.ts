import './index.css';
import { GameEngine, GameRarity } from './game/physics';
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

window.addEventListener("error", (e) => {
  if (ctx) {
    ctx.fillStyle = "red";
    ctx.font = "14px monospace";
    ctx.fillText("ERR: " + e.message, 10, 20);
    ctx.fillText("Line: " + e.lineno + ":" + e.colno, 10, 40);
  } else {
    document.body.innerHTML += `<div style="color:red;position:absolute;top:0;left:0;z-index:999;background:black;">ERR: ${e.message} L${e.lineno}:${e.colno}</div>`;
  }
});
window.addEventListener("unhandledrejection", (e) => {
  if (ctx) {
    ctx.fillStyle = "red";
    ctx.font = "14px monospace";
    ctx.fillText("PROMISE REJ: " + e.reason, 10, 60);
  }
});

// Constant internal resolution for retro pixel scaling
const width = 640;
const height = 360;
const scale = 1; // Unused for rendering transforms because we render to internal buffer 1:1 and let CSS scale it

// Assign base dimensions
canvas.width = width;
canvas.height = height;

// Synchronize size constraints with physics limits
engine.world.width = width;
engine.world.height = height;

const resizeCanvas = () => {
  // We handle scaling purely through CSS aspect-ratio fitting now!
  // It guarantees the game always shrinks or grows to fit the screen
  // without changing the gameplay mechanics or dimensions.
};

// Menus Visibility States
let isShopOpen = false;
let isClosetOpen = false;

// Controller movement keys tracking
const keys: { [key: string]: boolean } = {};

// Initiate size scaling
resizeCanvas();

window.addEventListener('resize', resizeCanvas);

// Keyboard controls handler
const handleKeyDown = (e: KeyboardEvent) => {
  const code = e.code;
  keys[code] = true;

  // Prevent sliding page for arcade gaming keys
  if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(code)) {
    e.preventDefault();
  }

  // Double tap ignore check
  if (isShopOpen || isClosetOpen) {
    if (code === 'Escape' || code === 'KeyE') {
      isShopOpen = false;
      isClosetOpen = false;
      sound.playTick();
    }
    return;
  }

  // Interactivity single tap check
  if (code === 'KeyE') {
    // Proximity checks inside Lobby mode
    if (engine.gameMode === 'lobby') {
      const px = engine.player.x + engine.player.width / 2;
      const groundY = height - 32;

      // 1. Upgrades Shop Computer Proximity
      if (Math.abs(px - 210) < 32) {
        isShopOpen = true;
        sound.playUnlock();
        return;
      }

      // 2. Outfit Closet Proximity
      if (Math.abs(px - 370) < 32) {
        isClosetOpen = true;
        sound.playUnlock();
        return;
      }

      // 3. Lobby Truck unloading check
      if (Math.abs(px - 100) < 45 && engine.truckCargo.length > 0) {
        engine.tryUnloadCargoFromLobbyTruck();
        return;
      }
    }

    // Default: try lift physical crate
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
};

const handleKeyUp = (e: KeyboardEvent) => {
  keys[e.code] = false;
};

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// Coordinates translation
const getVirtualMouseCoords = (clientX: number, clientY: number) => {
  const rect = canvas.getBoundingClientRect();
  
  // Calculate actual rendered size due to object-fit: contain
  const scaleX = rect.width / width;
  const scaleY = rect.height / height;
  const actualScale = Math.min(scaleX, scaleY);
  
  const renderWidth = width * actualScale;
  const renderHeight = height * actualScale;
  
  const offsetX = (rect.width - renderWidth) / 2;
  const offsetY = (rect.height - renderHeight) / 2;
  
  const rx = clientX - rect.left - offsetX;
  const ry = clientY - rect.top - offsetY;
  
  return {
    mx: Math.floor(rx / actualScale),
    my: Math.floor(ry / actualScale),
  };
};

const handleMouseDown = (e: MouseEvent) => {
  if (!initClick) {
    initClick = true;
    sound.playTick();
  }

  const { mx, my } = getVirtualMouseCoords(e.clientX, e.clientY);

  // 🔊 Audio mute slider click check (Top-Left)
  if (mx >= 12 && mx <= 70 && my >= 10 && my <= 26) {
    sound.enabled = !sound.enabled;
    sound.playTick();
    return;
  }

  // IF OVERLAY WINDOW IS ACTIVE, INTERCEPT CLICK COORDINATES ONLY
  if (isShopOpen) {
    handleShopClicks(mx, my);
    return;
  }

  if (isClosetOpen) {
    handleClosetClicks(mx, my);
    return;
  }

  // Start elevator/portal quick clicking check in Lobby
  if (engine.gameMode === 'lobby') {
    const px = engine.player.x + engine.player.width / 2;
    // start gate is at 520
    if (Math.abs(mx - 520) < 25 && my > height - 80) {
      engine.startNewRun();
      return;
    }
    // Truck click unload
    if (Math.abs(mx - 100) < 50 && my > height - 80 && engine.truckCargo.length > 0) {
      engine.tryUnloadCargoFromLobbyTruck();
      return;
    }

    // Check click shop desk to open
    if (Math.abs(mx - 210) < 25 && my > height - 70) {
      isShopOpen = true;
      sound.playUnlock();
      return;
    }

    // Check click closet to open
    if (Math.abs(mx - 370) < 25 && my > height - 70) {
      isClosetOpen = true;
      sound.playUnlock();
      return;
    }
  }

  // Portal Gun Laser Projectiles (Left click = orange, Right click = blue!)
  if (engine.currentTool === 'portal_gun') {
    const isRightClick = e.button === 2;
    const bType = isRightClick ? 'blue' : 'orange';
    engine.shootPortalGun(bType, mx, my);
    e.preventDefault();
    return;
  }

  // Default Click physics grabbing / flinging
  engine.handleMouseDown(mx, my);
};

// Handle clicks inside upgrades computer menu
const handleShopClicks = (mx: number, my: number) => {
  const panelW = 320;
  const panelH = 200;
  const px = (width - panelW) / 2;
  const py = (height - panelH) / 2;

  // X button at top right
  if (mx >= px + panelW - 18 && mx <= px + panelW - 4 && my >= py + 4 && my <= py + 18) {
    isShopOpen = false;
    sound.playTick();
    return;
  }

  // Click Upgrade Truck Capacity Item: Y: py + 55, H: 22
  const upgY = py + 52;
  if (my >= upgY && my <= upgY + 22) {
    if (engine.purchaseTruckCapacity()) {
      engine.spawnFloatingText("CAPACITY UPGRADED! 🚚", width / 2, upgY, "#73ef7d");
    } else {
      sound.playSplat();
      engine.spawnFloatingText("INSUFFICIENT COINS!", width / 2, upgY, "#ef7d57");
    }
  }

  // Click Mouse Cursor Tool: Y: py + 84
  const cY = py + 84;
  if (my >= cY && my <= cY + 22 && !engine.inventory.tools.includes('mouse_cursor')) {
    if (engine.purchaseToolUnlock('mouse_cursor', 50, 0)) {
      engine.spawnFloatingText("MOUSE DRAG UNLOCKED!", width / 2, cY, "#73ef7d");
    } else {
      sound.playSplat();
      engine.spawnFloatingText("INSUFFICIENT COINS!", width / 2, cY, "#ef7d57");
    }
  }

  // Click Blue Shamrock: Y: py + 114
  const sY = py + 114;
  if (my >= sY && my <= sY + 22 && !engine.inventory.tools.includes('shamrock')) {
    if (engine.purchaseToolUnlock('shamrock', 350, 0)) {
      engine.spawnFloatingText("LUCKY SHAMROCK ACQUIRED!", width / 2, sY, "#73ef7d");
    } else {
      sound.playSplat();
      engine.spawnFloatingText("INSUFFICIENT COINS!", width / 2, sY, "#ef7d57");
    }
  }

  // Click Portal Gun Laser: Y: py + 144
  const pY = py + 144;
  if (my >= pY && my <= pY + 22 && !engine.inventory.tools.includes('portal_gun')) {
    if (engine.purchaseToolUnlock('portal_gun', 500, 5)) {
      engine.spawnFloatingText("PORTAL GUN UNLOCKED!", width / 2, pY, "#73ef7d");
    } else {
      sound.playSplat();
      engine.spawnFloatingText("REQUIRES 500 COINS & 5 GEMS!", width / 2, pY, "#ef7d57");
    }
  }
};

// Handle equipping inside Wardrobe Costume closet
const handleClosetClicks = (mx: number, my: number) => {
  const panelW = 320;
  const panelH = 200;
  const px = (width - panelW) / 2;
  const py = (height - panelH) / 2;

  // X button
  if (mx >= px + panelW - 18 && mx <= px + panelW - 4 && my >= py + 4 && my <= py + 18) {
    isClosetOpen = false;
    sound.playTick();
    return;
  }

  // Handle Cosmetic column selections (Left sector)
  // Options: Hat, Glasses, Hair, Crown at Y slots: py + 60, py + 90, py + 120, py + 150
  const col1X = px + 20;
  const col1W = 130;

  if (mx >= col1X && mx <= col1X + col1W) {
    if (my >= py + 55 && my <= py + 75) {
      if (engine.inventory.cosmetics.includes('hat')) {
        engine.toggleEquipCosmetic('hat');
      } else {
        sound.playSplat();
        engine.spawnFloatingText("NOT UNBOXED YET! 📦", col1X + 60, py + 65, "#9fadbc");
      }
    } else if (my >= py + 85 && my <= py + 105) {
      if (engine.inventory.cosmetics.includes('glasses')) {
        engine.toggleEquipCosmetic('glasses');
      } else {
        sound.playSplat();
        engine.spawnFloatingText("NOT UNBOXED YET!", col1X + 60, py + 95, "#9fadbc");
      }
    } else if (my >= py + 115 && my <= py + 135) {
      if (engine.inventory.cosmetics.includes('hair')) {
        engine.toggleEquipCosmetic('hair');
      } else {
        sound.playSplat();
        engine.spawnFloatingText("NOT UNBOXED YET!", col1X + 60, py + 125, "#9fadbc");
      }
    } else if (my >= py + 145 && my <= py + 165) {
      if (engine.inventory.cosmetics.includes('crown')) {
        engine.toggleEquipCosmetic('crown');
      } else {
        sound.playSplat();
        engine.spawnFloatingText("NOT UNBOXED YET!", col1X + 60, py + 155, "#9fadbc");
      }
    }
  }

  // Handle Tools & Pets column selections (Right sector)
  // Tools: Mouse Cursor, Blue Shamrock, Portal Gun
  // Pets: Dog, Cat, Fish, Robot
  const col2X = px + 170;
  const col2W = 130;

  if (mx >= col2X && mx <= col2X + col2W) {
    // Tool slot 1: Cursor
    if (my >= py + 48 && my <= py + 64) {
      if (engine.inventory.tools.includes('mouse_cursor')) engine.toggleEquipTool('mouse_cursor');
      else sound.playSplat();
    }
    // Tool slot 2: Shamrock
    else if (my >= py + 68 && my <= py + 84) {
      if (engine.inventory.tools.includes('shamrock')) engine.toggleEquipTool('shamrock');
      else sound.playSplat();
    }
    // Tool slot 3: Portal Gun
    else if (my >= py + 88 && my <= py + 104) {
      if (engine.inventory.tools.includes('portal_gun')) engine.toggleEquipTool('portal_gun');
      else sound.playSplat();
    }
    // Pet slot 1: Dog
    else if (my >= py + 112 && my <= py + 126) {
      if (engine.inventory.pets.includes('dog')) engine.toggleEquipPet('dog');
      else sound.playSplat();
    }
    // Pet slot 2: Cat
    else if (my >= py + 128 && my <= py + 142) {
      if (engine.inventory.pets.includes('cat')) engine.toggleEquipPet('cat');
      else sound.playSplat();
    }
    // Pet slot 3: Fish
    else if (my >= py + 144 && my <= py + 158) {
      if (engine.inventory.pets.includes('fish')) engine.toggleEquipPet('fish');
      else sound.playSplat();
    }
    // Pet slot 4: Robot
    else if (my >= py + 160 && my <= py + 174) {
      if (engine.inventory.pets.includes('robot')) engine.toggleEquipPet('robot');
      else sound.playSplat();
    }
  }
};

const handleMouseMove = (e: MouseEvent) => {
  const { mx, my } = getVirtualMouseCoords(e.clientX, e.clientY);
  engine.handleMouseMove(mx, my);
};

const handleMouseUp = () => {
  engine.handleMouseUp();
};

const handleTouchStart = (e: TouchEvent) => {
  if (!initClick) {
    initClick = true;
    sound.playTick();
  }
  if (e.touches[0]) {
    const { mx, my } = getVirtualMouseCoords(e.touches[0].clientX, e.touches[0].clientY);
    
    // Quick audio block click check
    if (mx >= 12 && mx <= 70 && my >= 10 && my <= 26) {
      sound.enabled = !sound.enabled;
      sound.playTick();
      return;
    }

    if (isShopOpen) {
      handleShopClicks(mx, my);
      return;
    }

    if (isClosetOpen) {
      handleClosetClicks(mx, my);
      return;
    }

    engine.handleMouseDown(mx, my);
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches[0]) {
    const { mx, my } = getVirtualMouseCoords(e.touches[0].clientX, e.touches[0].clientY);
    engine.handleMouseMove(mx, my);
  }
};

// Canvas binding
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
window.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
window.addEventListener('touchend', handleMouseUp);

// Prevent browser context menu flash during right click shooting!
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ------------------- Custom Lobby & Run Graphics -------------------

const drawWarehouseBackground = (w: number, h: number) => {
  ctx.fillStyle = '#1f2030'; // Dark elegant background matching Vibrant Palette theme
  ctx.fillRect(0, 0, w, h);

  // Background structural grid lines
  ctx.strokeStyle = '#333c57';
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 1;
  const brickSize = 32;
  for (let x = 0; x < w; x += brickSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // Heavy steel support lines
  ctx.fillStyle = '#10121c';
  ctx.fillRect(0, 0, 10, h);
  ctx.fillRect(w - 10, 0, 10, h);
};

const drawInteractiveSectorDecorations = (w: number, h: number) => {
  const groundY = h - 32;

  if (engine.gameMode === 'lobby') {
    // 1. Upgrades shop Computer Desk
    const deskX = 210;
    ctx.fillStyle = '#333c57';
    ctx.strokeStyle = '#10121c';
    ctx.lineWidth = 1.5;
    ctx.fillRect(deskX - 16, groundY - 14, 32, 14);
    ctx.strokeRect(deskX - 16, groundY - 14, 32, 14);

    // CRT Screen Glow
    const shineFreq = Math.sin(Date.now() * 0.004) * 0.15 + 0.85;
    ctx.fillStyle = `rgba(115, 239, 125, ${shineFreq})`;
    ctx.fillRect(deskX - 10, groundY - 24, 20, 10);
    ctx.fillStyle = '#10121c';
    ctx.strokeRect(deskX - 10, groundY - 24, 20, 10);
    // Keyboard key accent
    ctx.fillRect(deskX - 8, groundY - 3, 16, 2);

    ctx.font = 'bold 5.5px monospace';
    ctx.fillStyle = '#73ef7d';
    ctx.textAlign = 'center';
    ctx.fillText("UPGRADE", deskX, groundY - 28);

    // 2. Outfit wardrobe closet stand
    const closetX = 370;
    ctx.fillStyle = '#a24b31'; // terracotta red
    ctx.fillRect(closetX - 14, groundY - 28, 28, 28);
    ctx.strokeStyle = '#10121c';
    ctx.strokeRect(closetX - 14, groundY - 28, 28, 28);
    // Wardrobe mirror screen slot
    ctx.fillStyle = '#36e5f0';
    ctx.fillRect(closetX - 8, groundY - 24, 16, 16);
    ctx.strokeRect(closetX - 8, groundY - 24, 16, 16);

    ctx.font = 'bold 5.5px monospace';
    ctx.fillStyle = '#ffcd75';
    ctx.fillText("CLOSET", closetX, groundY - 32);

    // 3. START ELEVATOR PORTAL
    const exitX = 520;
    // Glowing chamber pillar outline
    ctx.strokeStyle = '#73ef7d';
    ctx.lineWidth = 2;
    ctx.strokeRect(exitX - 16, groundY - 42, 32, 42);
    ctx.fillStyle = 'rgba(115, 239, 125, 0.18)';
    ctx.fillRect(exitX - 16, groundY - 42, 32, 42);

    // Grid vertical lines glowing oscillation
    ctx.fillStyle = '#73ef7d';
    ctx.fillRect(exitX - 13 + Math.floor(Date.now() / 150) % 22, groundY - 40, 2, 40);

    ctx.font = 'bold 6.5px monospace';
    ctx.fillStyle = '#73ef7d';
    ctx.fillText("RUN PORTAL", exitX, groundY - 46);
  } else if (engine.gameMode === 'game_run') {
    // Draw sliding crane bracket tracks
    ctx.fillStyle = '#333c57';
    ctx.fillRect(10, 8, w - 20, 5);
    ctx.fillStyle = '#10121c';
    ctx.fillRect(10, 13, w - 20, 1);

    // Draw active Crane
    const cx = engine.craneX;
    sprites.drawSprite(ctx, 'crane_cabin', cx - 14, engine.craneY - 14, 28, 28);

    // Draw crane thin cable hanging down to target drop space!
    ctx.strokeStyle = '#9fadbc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, engine.craneY + 8);
    ctx.lineTo(cx, engine.craneY + 44);
    ctx.stroke();

    // Draw cable grabber hook
    ctx.fillStyle = '#10121c';
    ctx.fillRect(cx - 3, engine.craneY + 43, 6, 3);
    
    // Draw dangling block if drop gets closer!
    if (engine.nextDropTimer < 40) {
      // Bobbing dangle animation
      const dangleY = engine.craneY + 45 + Math.sin(Date.now() * 0.01) * 2;
      const typeMap: { [key in GameRarity]: string } = {
        common: 'wood',
        rare: 'metal',
        epic: 'present',
        legendary: 'hover'
      };
      const type = typeMap[engine.activeDroppedRarity] || 'wood';
      sprites.drawSprite(ctx, `crate_${type}`, cx - 10, dangleY, 20, 20);
    }
  }
};

const drawLobbyCargoTruck = (w: number, h: number) => {
  const groundY = h - 32;
  // Lobby Truck is parked on the left: Cabin facing right (towards room)
  if (engine.gameMode === 'lobby') {
    const tx = 22;
    const ty = groundY - 24; // 24 instead of 44 to account for sprite whitespace
    // Draw body segments
    sprites.drawSprite(ctx, 'truck_bed', tx, ty, 38, 44);
    sprites.drawSprite(ctx, 'truck_cabin', tx + 33, ty, 30, 44, { flipX: true });

    // Draw cargo boxes piled customly inside truck bed based on count!
    const items = engine.truckCargo;
    const typeMap: { [key in GameRarity]: string } = {
      common: 'wood',
      rare: 'metal',
      epic: 'present',
      legendary: 'hover'
    };

    for (let i = 0; i < items.length; i++) {
      const bType = typeMap[items[i]] || 'wood';
      const col = i % 2;
      const row = Math.floor(i / 2);
      sprites.drawSprite(ctx, `crate_${bType}`, tx + col * 12 + 6, ty + 12 - row * 10, 14, 14);
    }
  } else if (engine.gameMode === 'game_run') {
    // Cargo Truck is parked on the Right: Cabin facing right, bed facing left!
    // Bed is at X: w - 105, cabin is at w - 45
    const bedX = w - 100;
    const cabX = w - 62;
    const ty = groundY - 24;

    sprites.drawSprite(ctx, 'truck_bed', bedX, ty, 42, 44);
    sprites.drawSprite(ctx, 'truck_cabin', cabX, ty, 30, 44);

    // Glowing green Loading tray border visual!
    ctx.strokeStyle = `rgba(115, 239, 125, ${0.4 + Math.sin(Date.now() * 0.007) * 0.25})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bedX + 2, ty + 4, 38, 22);

    ctx.fillStyle = 'rgba(115, 239, 125, 0.08)';
    ctx.fillRect(bedX + 2, ty + 4, 38, 22);

    ctx.fillStyle = '#73ef7d';
    ctx.font = 'bold 5.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("LOADING BAY", bedX + 21, ty + 18);

    // Draw loaded count visually piling up!
    const items = engine.truckCargo;
    const typeMap: { [key in GameRarity]: string } = {
      common: 'wood',
      rare: 'metal',
      epic: 'present',
      legendary: 'hover'
    };

    for (let i = 0; i < items.length; i++) {
      const bType = typeMap[items[i]] || 'wood';
      const col = i % 2;
      const row = Math.floor(i / 2);
      sprites.drawSprite(ctx, `crate_${bType}`, bedX + col * 12 + 6, ty + 12 - row * 10, 14, 14);
    }
  }
};

const drawWarehouseFloor = (w: number, h: number) => {
  const floorY = h - 32;

  // Solid deep concrete beam
  ctx.fillStyle = '#292b3c';
  ctx.fillRect(0, floorY, w, 32);

  // Surface steel line
  ctx.fillStyle = '#10121c';
  ctx.fillRect(0, floorY, w, 4);

  // Decorative safety yellow/orange slanted bars
  ctx.fillStyle = '#df9c5c';
  const slantW = 6;
  for (let x = 16; x < w - 16; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, floorY + 4);
    ctx.lineTo(x + slantW, floorY + 4);
    ctx.lineTo(x + slantW + 6, floorY + 12);
    ctx.lineTo(x + 6, floorY + 12);
    ctx.closePath();
    ctx.fill();
  }
};

// Draw Cosmetics worn on robot's cute square head!
const drawWornCosmetics = (px: number, py: number, flipX: boolean) => {
  if (!engine.currentCosmetic) return;

  const facingMod = flipX ? -1 : 1;
  const isCrouchingOffset = engine.player.state === 'jump' ? -1 : 0;

  // Perfect pivot aligning relative to facing orientation
  // Square head sits at py + 4, bounding box px + 4, py + 4
  const headX = px + 4 + (flipX ? 0 : 0);
  const headY = py - 4 + isCrouchingOffset;

  if (engine.currentCosmetic === 'hat') {
    sprites.drawSprite(ctx, 'cosmetic_hat', headX - 4 * facingMod, headY - 4, 20, 16, { flipX: flipX });
  } else if (engine.currentCosmetic === 'glasses') {
    sprites.drawSprite(ctx, 'cosmetic_glasses', headX - 1 * facingMod, headY + 5, 18, 12, { flipX: flipX });
  } else if (engine.currentCosmetic === 'hair') {
    sprites.drawSprite(ctx, 'cosmetic_hair', headX - 3 * facingMod, headY - 1, 20, 14, { flipX: flipX });
  } else if (engine.currentCosmetic === 'crown') {
    sprites.drawSprite(ctx, 'loot_crown', headX - 2 * facingMod, headY - 5, 18, 14, { flipX: flipX });
  }
};

// Draw Tool in hands
const drawCarriedTool = (px: number, py: number, flipX: boolean) => {
  if (!engine.currentTool) return;

  const facingMod = flipX ? -1 : 1;
  // Hand coordinates sit on stomach at Y: py + 16
  const tx = px + 12 + (8 * facingMod);
  const ty = py + 14;

  let toolSprite = 'tool_mouse_cursor';
  if (engine.currentTool === 'portal_gun') toolSprite = 'tool_portal_gun';
  else if (engine.currentTool === 'shamrock') toolSprite = 'tool_shamrock';

  sprites.drawSprite(ctx, toolSprite, tx, ty, 12, 12, { flipX: flipX });
};

// Draw swirl ring portals with glowing circular gradients
const drawPortalHoles = () => {
  const oPort = engine.portals.orange;
  const bPort = engine.portals.blue;

  const glowTime = Date.now() * 0.01;
  const swell = 1.0 + Math.sin(glowTime * 0.8) * 0.15;

  if (oPort) {
    ctx.save();
    ctx.translate(oPort.x, oPort.y);
    ctx.rotate(oPort.angle);
    ctx.strokeStyle = '#ef7d57';
    ctx.lineWidth = 1.8 * swell;
    
    // Draw swirling portal oval
    ctx.beginPath();
    ctx.ellipse(0, 0, 11 * swell, 5 * swell, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(239, 125, 87, 0.25)';
    ctx.fill();
    ctx.restore();
  }

  if (bPort) {
    ctx.save();
    ctx.translate(bPort.x, bPort.y);
    ctx.rotate(bPort.angle);
    ctx.strokeStyle = '#4fa9ff';
    ctx.lineWidth = 1.8 * swell;

    ctx.beginPath();
    ctx.ellipse(0, 0, 11 * swell, 5 * swell, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(79, 169, 255, 0.25)';
    ctx.fill();
    ctx.restore();
  }
};

const drawInteractiveBannersAndHUD = (w: number, h: number) => {
  const groundY = h - 32;

  // Render Top Level Bar
  ctx.fillStyle = '#10121c';
  ctx.fillRect(10, 4, w - 20, 24);

  // Mode Indicator
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = '#ffcd75';
  ctx.textAlign = 'left';
  const prefix = engine.gameMode === 'lobby' ? '📂 LOBBY' : '🛠️ CARGO HARVEST';
  ctx.fillText(`${prefix} | COINS: ${engine.coins} | GEMS: ${engine.gems}`, 22, 18);

  ctx.textAlign = 'right';
  if (engine.gameMode === 'game_run') {
    ctx.fillStyle = '#73ef7d';
    ctx.fillText(`TRUCK CAPACITY: ${engine.truckCargoCount}/${engine.getTruckCapacity()}`, w - 22, 18);
  } else {
    ctx.fillStyle = '#9fadbc';
    ctx.fillText(`TRUCK RESERVOID: ${engine.truckCargo.length} CRATES`, w - 22, 18);
  }

  // Audio Indicator Click Bounds Left
  ctx.textAlign = 'center';
  ctx.fillStyle = sound.enabled ? '#333c57' : '#a24b31';
  ctx.fillRect(w / 2 - 32, 9, 64, 14);
  ctx.strokeStyle = '#10121c';
  ctx.lineWidth = 1;
  ctx.strokeRect(w / 2 - 32, 9, 64, 14);
  
  ctx.fillStyle = '#f4f4f4';
  ctx.font = '6px monospace';
  ctx.fillText(sound.enabled ? '🔊 SOUND' : '🔇 MUTED', w / 2, 18);

  // Active floating prompt warnings inside Lobby
  if (engine.gameMode === 'lobby') {
    const px = engine.player.x + engine.player.width / 2;

    // Lobby Truck unload bubble
    if (Math.abs(px - 100) < 45 && engine.truckCargo.length > 0) {
      drawKeyInteractiveBubble(100, groundY - 45, "[E] UNLOAD CRATE CARGO");
    }

    // Shop Upgrade bubble
    if (Math.abs(px - 210) < 32) {
      drawKeyInteractiveBubble(210, groundY - 32, "[E] SHOP & COMPUTER UPGRADES");
    }

    // Outfit Wardrobe bubble
    if (Math.abs(px - 370) < 32) {
      drawKeyInteractiveBubble(370, groundY - 36, "[E] DRESS CUSTOM CLOSET");
    }

    // Elevator Start level
    if (Math.abs(px - 520) < 26) {
      drawKeyInteractiveBubble(520, groundY - 50, "[E] START NEW FACILITY RUN");
    }
  }

  // Draw Lobby instructional bottom tip bar
  ctx.fillStyle = '#10121c';
  ctx.fillRect(10, h - 16, w - 20, 12);
  ctx.font = 'bold 5.5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.textAlign = 'center';
  
  let infoTip = "KEYS: [A/D/Arrows] Run | [W/Space/Up] Jump | [Q] Open unboxed boxes | Shift+Click spawns custom crates!";
  if (engine.currentTool === 'portal_gun') {
    infoTip = "🔮 PORTAL GUN ACTIVE: [Left-Click] shoots ORANGE portal, [Right-Click] shoots BLUE portal!";
  } else if (engine.currentTool === 'mouse_cursor') {
    infoTip = "🖱️ MOUSE HAND ACTIVE: Click & drag physics boxes on the ground to stack or fling them!";
  }
  ctx.fillText(infoTip, w / 2, h - 8);
};

// Help helper
const drawKeyInteractiveBubble = (x: number, y: number, text: string) => {
  ctx.setLineDash([]);
  ctx.fillStyle = '#10121c';
  const textWidth = ctx.measureText(text).width + 8;
  ctx.fillRect(x - textWidth / 2, y - 10, textWidth, 12);
  
  ctx.strokeStyle = '#ffcd75';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - textWidth / 2, y - 10, textWidth, 12);

  ctx.fillStyle = '#ffe385';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 2);
};

// Render pop-up CRT menu for upgrades Shop Computer desk
const drawShopWindowModal = (w: number, h: number) => {
  const panelW = 320;
  const panelH = 200;
  const px = (w - panelW) / 2;
  const py = (h - panelH) / 2;

  // Background
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(px, py, panelW, panelH);
  ctx.strokeStyle = '#10121c';
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, panelW, panelH);

  // Secondary grid lines
  ctx.strokeStyle = '#333c57';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 4, py + 4, panelW - 8, panelH - 8);

  // CRT Screen Headers
  ctx.fillStyle = '#10121c';
  ctx.fillRect(px + 4, py + 4, panelW - 8, 16);
  ctx.fillStyle = '#ffcd75';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText("💻 COMPUTER LAB: SECTOR 7 STORE", px + 12, py + 14);

  // X Close button icon
  ctx.fillStyle = '#a24b31';
  ctx.fillRect(px + panelW - 18, py + 4, 14, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("X", px + panelW - 11, py + 13);

  // Money labels
  ctx.textAlign = 'right';
  ctx.fillStyle = '#73ef7d';
  ctx.fillText(`COINS: ${engine.coins} | GEMS: ${engine.gems}`, px + panelW - 12, py + 32);

  // 1. Upgrade Capacity Line item
  const upLevel = engine.truckCapacityUpgradeLevel;
  const nextCapacity = 3 + upLevel;
  const upCost = engine.getTruckUpgradeCost();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f4f4f4';
  ctx.font = 'bold 7px monospace';
  ctx.fillText(`🚚 TRUCK CAPACITY LEVEL +1 [Currently: ${nextCapacity}]`, px + 12, py + 52);
  ctx.font = '5.8px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText(`Upgrades loaded boxes limit. LEVEL Cost: ${upCost} COINS`, px + 12, py + 62);

  ctx.fillStyle = engine.coins >= upCost ? '#73ef7d' : '#333c57';
  ctx.fillRect(px + panelW - 60, py + 46, 50, 18);
  ctx.fillStyle = '#10121c';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("BUY UP", px + panelW - 35, py + 57);

  // 2. Mouse Hand drag unlock tool
  const hasCursor = engine.inventory.tools.includes('mouse_cursor');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f4f4f4';
  ctx.font = 'bold 7px monospace';
  ctx.fillText("🖱️ RETRO CURSOR MOUSE FLING TOOL", px + 12, py + 84);
  ctx.font = '5.8px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("Allows you to drag & fling crates physics with the mouse!", px + 12, py + 94);

  ctx.fillStyle = hasCursor ? '#333c57' : (engine.coins >= 50 ? '#73ef7d' : '#a24b31');
  ctx.fillRect(px + panelW - 60, py + 78, 50, 18);
  ctx.fillStyle = '#10121c';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hasCursor ? "OWNED" : "50 COINS", px + panelW - 35, py + 89);

  // 3. Blue Shamrock Lucky charm tool
  const hasLucky = engine.inventory.tools.includes('shamrock');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f4f4f4';
  ctx.font = 'bold 7px monospace';
  ctx.fillText("🍀 BLUE SHAMROCK LUCKY MULTIPLIER", px + 12, py + 114);
  ctx.font = '5.8px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("Vastly highers the chances of dropping rare & epic crates!", px + 12, py + 124);

  ctx.fillStyle = hasLucky ? '#333c57' : (engine.coins >= 350 ? '#73ef7d' : '#a24b31');
  ctx.fillRect(px + panelW - 60, py + 108, 50, 18);
  ctx.fillStyle = '#10121c';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hasLucky ? "OWNED" : "350 COIN", px + panelW - 35, py + 119);

  // 4. Portal Gun tool
  const hasGun = engine.inventory.tools.includes('portal_gun');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f4f4f4';
  ctx.font = 'bold 7px monospace';
  ctx.fillText("🔮 HIGH-TECH QUANTUM PORTAL GUN", px + 12, py + 144);
  ctx.font = '5.8px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("Shoots portals connecting spatial loops. Fling physical crates!", px + 12, py + 154);

  ctx.fillStyle = hasGun ? '#333c57' : (engine.coins >= 500 && engine.gems >= 5 ? '#73ef7d' : '#a24b31');
  ctx.fillRect(px + panelW - 60, py + 138, 50, 18);
  ctx.fillStyle = '#10121c';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hasGun ? "OWNED" : "500C/5G", px + panelW - 35, py + 149);

  // Escape notification footer
  ctx.textAlign = 'center';
  ctx.font = '6px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("PRESS ESCAPE KEY OR E KEY TO SHUT COMPUTER SCREEN", px + panelW / 2, py + panelH - 12);
};

// Render Closet profile wardrobe equip menu
const drawClosetWindowModal = (w: number, h: number) => {
  const panelW = 320;
  const panelH = 200;
  const px = (w - panelW) / 2;
  const py = (h - panelH) / 2;

  // Frame
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(px, py, panelW, panelH);
  ctx.strokeStyle = '#10121c';
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, panelW, panelH);

  ctx.strokeStyle = '#a24b31';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 4, py + 4, panelW - 8, panelH - 8);

  ctx.fillStyle = '#10121c';
  ctx.fillRect(px + 4, py + 4, panelW - 8, 16);
  ctx.fillStyle = '#ffcd75';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText("👚 FACILITY CLOSET: EQUIP COSMETICS & AMULETS", px + 12, py + 14);

  // X Button
  ctx.fillStyle = '#a24b31';
  ctx.fillRect(px + panelW - 18, py + 4, 14, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("X", px + panelW - 11, py + 13);

  // LEFT COLUMN - COSMETICS (Hats)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ff8be6';
  ctx.font = 'bold 7.5px monospace';
  ctx.fillText("👒 UNBOXABLE HEAD COSMETICS", px + 15, py + 38);

  const cosItems = [
    { id: 'hat', name: "Top Hat 🎩" },
    { id: 'glasses', name: "Cool Shades 😎" },
    { id: 'hair', name: "Punk Pink Hair 🧑‍🎤" },
    { id: 'crown', name: "Crown 👑" }
  ];

  for (let i = 0; i < cosItems.length; i++) {
    const item = cosItems[i];
    const hasUnlocked = engine.inventory.cosmetics.includes(item.id);
    const isWorn = engine.currentCosmetic === item.id;

    ctx.fillStyle = isWorn ? '#73ef7d' : (hasUnlocked ? '#333c57' : '#10121c');
    ctx.fillRect(px + 15, py + 52 + i * 30, 130, 22);
    ctx.strokeStyle = '#10121c';
    ctx.strokeRect(px + 15, py + 52 + i * 30, 130, 22);

    ctx.fillStyle = isWorn ? '#10121c' : (hasUnlocked ? '#f4f4f4' : '#566c86');
    ctx.font = 'bold 6.5px monospace';
    ctx.fillText(`${item.name} ${isWorn ? '(WORN)' : ''}`, px + 22, py + 62 + i * 30);
    ctx.font = '5.5px monospace';
    ctx.fillText(hasUnlocked ? "Click to Equip/Mute" : "🔒 Collect crates to unlock", px + 22, py + 70 + i * 30);
  }

  // RIGHT COLUMN - GADGETS & COMPANIONS
  ctx.fillStyle = '#36e5f0';
  ctx.font = 'bold 7.5px monospace';
  ctx.fillText("🛠️ TOOLS & ACTIVE COMPANIONS", px + 165, py + 38);

  const toolsList = [
    { id: 'mouse_cursor', name: "Cursor Pointer Hand" },
    { id: 'shamrock', name: "Clover Shamrock" },
    { id: 'portal_gun', name: "Quantum Portal Gun" }
  ];

  for (let i = 0; i < toolsList.length; i++) {
    const t = toolsList[i];
    const isEquipped = engine.currentTool === t.id;
    const hasU = engine.inventory.tools.includes(t.id);

    ctx.fillStyle = isEquipped ? '#73ef7d' : (hasU ? '#333c57' : '#10121c');
    ctx.fillRect(px + 165, py + 46 + i * 18, 140, 15);
    ctx.strokeRect(px + 165, py + 46 + i * 18, 140, 15);

    ctx.fillStyle = isEquipped ? '#10121c' : (hasU ? '#ffffff' : '#566c86');
    ctx.font = '6px monospace';
    ctx.fillText(`${t.name} ${isEquipped ? '(HOLD)' : ''}`, px + 171, py + 56 + i * 18);
  }

  // PETS LISTING
  ctx.fillStyle = '#ffcd75';
  ctx.font = 'bold 7px monospace';
  ctx.fillText("🐾 LITTLE MINI PET TRAILING COMPANION", px + 165, py + 106);

  const petsList = [
    { id: 'dog', name: "Cute Golden Dog 🐶" },
    { id: 'cat', name: "Black Kitten 🐱" },
    { id: 'fish', name: "Fish Tank Orb 🐠" },
    { id: 'robot', name: "Companion Droid 🤖" }
  ];

  for (let i = 0; i < petsList.length; i++) {
    const p = petsList[i];
    const isEquipped = engine.currentPet === p.id;
    const hasU = engine.inventory.pets.includes(p.id);

    ctx.fillStyle = isEquipped ? '#73ef7d' : (hasU ? '#333c57' : '#10121c');
    ctx.fillRect(px + 165, py + 112 + i * 15, 140, 12);
    ctx.strokeRect(px + 165, py + 112 + i * 15, 140, 12);

    ctx.fillStyle = isEquipped ? '#10121c' : (hasU ? '#ffffff' : '#566c86');
    ctx.font = '5.8px monospace';
    ctx.fillText(`${p.name} ${isEquipped ? '(TRAIL)' : ''}`, px + 171, py + 120 + i * 15);
  }

  // Exit info
  ctx.textAlign = 'center';
  ctx.font = '6px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("PRESS ESCAPE OR PLAY OR E TO CLOSE BACKSTAGE CLOSET WINDOW", px + panelW / 2, py + panelH - 8);
};

// Render loading screen with progress loops
const drawLoadingScreen = (w: number, h: number) => {
  ctx.fillStyle = '#10121c';
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#ffcd75';
  ctx.textAlign = 'center';
  ctx.fillText(engine.loadingText, w / 2, h / 2 - 25);

  // Subtips
  ctx.font = '7px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("Retrieving sector sandbox resources...", w / 2, h / 2 - 10);

  // Progress Bar
  const barW = 200;
  const barH = 16;
  const bx = (w - barW) / 2;
  const by = h / 2 + 10;

  ctx.strokeStyle = '#566c86';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx, by, barW, barH);
  ctx.fillStyle = '#1f2030';
  ctx.fillRect(bx, by, barW, barH);

  // Active loaded chunk representing percentage
  const filledW = (engine.loadingProgress / 100) * barW;
  ctx.fillStyle = '#73ef7d';
  ctx.fillRect(bx + 2, by + 2, Math.max(0, filledW - 4), barH - 4);

  // Percentage percentage
  ctx.font = 'bold 7.5px monospace';
  ctx.fillStyle = '#10121c';
  ctx.fillText(`${Math.floor(engine.loadingProgress)}%`, w / 2, by + 11);
};

// Interactive context HUD bubbles
const drawInteractBubbles = () => {
  let targetText: string | null = null;
  let tx = 0;
  let ty = 0;

  for (const b of engine.boxes) {
    if (b.grabbed || b.isOpened) continue;
    
    const px = engine.player.x + engine.player.width / 2;
    const py = engine.player.y + engine.player.height / 2;
    const bx = b.x + b.width / 2;
    const by = b.y + b.height / 2;
    const dist = Math.hypot(bx - px, by - py);

    if (dist < 46) {
      if (b.type === 'present') {
        targetText = "Q: OPEN CARGO  E: LIFT";
      } else if (b.type === 'wood') {
        targetText = "E: LIFT  Q: SMASH CRATE";
      } else if (b.type === 'tnt') {
        targetText = "E: LIFT  Q: LIGHT TNT FUSE";
      } else {
        targetText = "E: LIFT";
      }
      tx = bx;
      ty = b.y - 12;
      break;
    }
  }

  // If carrying box, show instructions
  if (engine.player.grabbingBox && !targetText) {
    targetText = "E: PLACE IN FRONT  F: FLING/THROW";
    tx = engine.player.x + engine.player.width / 2;
    ty = engine.player.y - engine.player.grabbingBox.height - 12;
  }

  if (targetText) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#10121c';
    const textWidth = ctx.measureText(targetText).width + 8;
    ctx.fillRect(tx - textWidth / 2, ty - 10, textWidth, 12);
    
    ctx.strokeStyle = '#566c86';
    ctx.strokeRect(tx - textWidth / 2, ty - 10, textWidth, 12);

    ctx.fillStyle = '#f4f4f4';
    ctx.font = '6px monospace';
    ctx.fillText(targetText, tx, ty - 2);

    ctx.beginPath();
    ctx.moveTo(tx - 3, ty + 2);
    ctx.lineTo(tx + 3, ty + 2);
    ctx.lineTo(tx, ty + 5);
    ctx.closePath();
    ctx.fillStyle = '#10121c';
    ctx.fill();
  }
};

// ----------------- Master Animation Loop -----------------

const loop = () => {
  try {
    const p = engine.player;
    const walkSpeed = p.grabbingBox ? 1.75 : 2.5;
    const accel = 0.52;

    // Track WSAD arcade joystick buttons
    if (!isShopOpen && !isClosetOpen && engine.gameMode !== 'loading') {
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
        const weightMult = p.grabbingBox ? (p.grabbingBox.type === 'metal' ? 0.65 : 0.85) : 1.0;
        p.vy = -5.4 * weightMult;
        p.onGround = false;
        sound.playJump();
        engine.spawnDust(p.x + p.width / 2, height - 32, 4);
      }
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

    // Render different modes
    if (engine.gameMode === 'loading') {
      drawLoadingScreen(width, height);
    } else {
      // Render sandbox workspace backdrop
      drawWarehouseBackground(width, height);
      drawInteractiveSectorDecorations(width, height);
      drawLobbyCargoTruck(width, height);
      drawWarehouseFloor(width, height);

      // Draw active swirling portals
      drawPortalHoles();

      // Boxes
      for (const b of engine.boxes) {
        if (b.grabbed) continue;

        // Draw highlighted drag contour outer glow if Mouse Cursor tool drags it!
        if (engine.currentTool === 'mouse_cursor' && engine.dragJoint.box?.id === b.id) {
          ctx.strokeStyle = '#36e5f0';
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
        }

        let tintColor: string | undefined;
        if (b.type === 'tnt' && b.fuseTimer !== null) {
          const freqTick = b.fuseTimer < 25 ? 4 : 10;
          if (Math.floor(b.fuseTimer / freqTick) % 2 === 0) {
            tintColor = 'rgba(255, 75, 75, 0.5)';
          }
        }

        ctx.save();
        ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
        ctx.scale(b.squishX, b.squishY);

        sprites.drawSprite(ctx, `crate_${b.type}`, -b.width / 2, -b.height / 2, b.width, b.height, {
          angle: b.angle,
          tint: tintColor || b.customColor
        });

        // Shimmer sparkles on high rarities
        const gBox = b as any;
        if (gBox.rarity && gBox.rarity !== 'common') {
          gBox.sparkleTimer = (gBox.sparkleTimer || 0) + 1;
          if (gBox.sparkleTimer % 24 === 0) {
            const sparkColor = gBox.rarity === 'rare' ? '#4fa9ff' : (gBox.rarity === 'epic' ? '#ce5ffc' : '#ffcd75');
            engine.particles.push({
              id: makeId(),
              type: 'sparkle',
              x: b.x + Math.random() * b.width,
              y: b.y + Math.random() * b.height,
              vx: 0,
              vy: -0.2,
              color: sparkColor,
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

      // Flying Loot Items
      for (const item of engine.lootItems) {
        const spriteName = item.type === 'coin'
          ? `loot_coin_${Math.floor(item.shineTimer / 6) % 3 + 1}`
          : `loot_${item.type}`;
        
        sprites.drawSprite(ctx, spriteName, item.x, item.y, item.width, item.height, {
          angle: item.angle
        });
      }

      // Player character setup
      let playerSprite = 'player_idle_1';
      if (p.state === 'walk') {
        const walkFrames = ['player_walk_1', 'player_walk_2', 'player_walk_3', 'player_walk_4'];
        playerSprite = walkFrames[p.animFrame] || 'player_walk_1';
      } else if (p.state === 'grab_idle' || p.state === 'grab_walk') {
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

      // Core Player Draw
      sprites.drawSprite(ctx, playerSprite, p.x, p.y, p.width, p.height, {
        flipX: p.facing === 'left'
      });

      // Worn Costume (Hat/Glasses/Hair/Crown) & Carried Tool (Portal gun/Shamrock) overlays
      drawWornCosmetics(p.x, p.y, p.facing === 'left');
      drawCarriedTool(p.x, p.y, p.facing === 'left');

      // Trail companion Pet if active
      if (engine.currentPet) {
        sprites.drawSprite(ctx, `pet_${engine.currentPet}`, engine.petX, engine.petY, 16, 16, {
          flipX: p.facing === 'left'
        });
      }

      // Draw interaction tooltips
      drawInteractBubbles();

      // Particles physics
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
          ctx.lineWidth = 1.5;
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

      // Floating text feedback popups
      ctx.textAlign = 'center';
      for (const txt of engine.floatingTexts) {
        ctx.fillStyle = 'rgba(16, 20, 31, 0.82)';
        const tW = ctx.measureText(txt.text).width + 6;
        ctx.fillRect(txt.x - tW / 2, txt.y - 10, tW, 12);

        ctx.fillStyle = txt.color;
        ctx.font = 'bold 7.5px monospace';
        ctx.fillText(txt.text, txt.x, txt.y - 1);
      }

      // Spring Joint indicator line when dragging with mouse hand
      if (engine.currentTool === 'mouse_cursor' && engine.dragJoint.box) {
        const b = engine.dragJoint.box;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(54, 229, 240, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 2]);
        ctx.moveTo(b.x + b.width / 2, b.y + b.height / 2);
        ctx.lineTo(engine.dragJoint.mouseX, engine.dragJoint.mouseY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Render interactive banners
      drawInteractiveBannersAndHUD(width, height);

      // Overlay Shop Popup Menu if open
      if (isShopOpen) {
        drawShopWindowModal(width, height);
      }

      // Overlay Closet profile dressing menu if open
      if (isClosetOpen) {
        drawClosetWindowModal(width, height);
      }
    }

    ctx.restore();
  } catch (err) {
    if (ctx) {
      ctx.restore();
      ctx.fillStyle = "red";
      ctx.font = "14px monospace";
      ctx.fillText("CRASH IN LOOP: " + (err as Error).message, 10, 80);
    }
  }

  requestAnimationFrame(loop);
};

// Start rendering
loop();
