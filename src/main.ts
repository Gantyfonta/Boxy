import './index.css';
import { GameEngine, GameRarity } from './game/physics';
import { sprites } from './game/sprites';
import { sound } from './game/sound';
import { BoxType } from './game/types';
import { CROP_TYPES, CROP_SIZES, CROP_MUTATIONS, FarmPlantBed } from './game/farming';

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
const scale = 2; // Double pixel count for crisp text and asset rendering

// Assign base dimensions
canvas.width = width * scale;
canvas.height = height * scale;

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

  // Handle Main Menu keys
  if (engine.gameMode === 'main_menu') {
    if (code === 'Digit1' || code === 'Numpad1') {
      engine.setLobbyMode();
      sound.playUnlock();
    } else if (code === 'Digit2' || code === 'Numpad2') {
      engine.setFarmingMode();
      sound.playUnlock();
    }
    return;
  }

  // Handle Escape transitions
  if (code === 'Escape') {
    if (isShopOpen || isClosetOpen) {
      isShopOpen = false;
      isClosetOpen = false;
      sound.playTick();
      return;
    }
    if (engine.gameMode === 'farming') {
      if (engine.farmingState.isDeporcusOpen) {
        engine.farmingState.isDeporcusOpen = false;
        sound.playTick();
      } else if (engine.farmingState.activePlantingBedId !== null) {
        engine.farmingState.activePlantingBedId = null;
        sound.playTick();
      } else {
        engine.setLobbyMode();
        sound.playTick();
      }
      return;
    }
    if (engine.gameMode === 'game_run') {
      engine.setLobbyMode();
      sound.playTick();
      return;
    }
  }

  // Double tap ignore check for active lobby menus
  if (isShopOpen || isClosetOpen) {
    if (code === 'KeyE') {
      isShopOpen = false;
      isClosetOpen = false;
      sound.playTick();
    }
    return;
  }

  // Interactivity single tap check
  if (code === 'KeyE') {
    // 🐖 Proximity checks inside Farming mode
    if (engine.gameMode === 'farming') {
      const px = engine.player.x + 12;
      const py = engine.player.y + 16;

      // Check near Deporcus
      const distDep = Math.abs(px - 520);
      if (distDep < 32 && py > 260) {
        engine.farmingState.isDeporcusOpen = !engine.farmingState.isDeporcusOpen;
        engine.farmingState.activePlantingBedId = null;
        sound.playUnlock();
        return;
      }

      // Check near some beds
      const beds = [
        { id: 0, x: 140, y: 110 }, { id: 1, x: 220, y: 110 }, { id: 2, x: 460, y: 110 },
        { id: 3, x: 140, y: 220 }, { id: 4, x: 460, y: 220 }, { id: 5, x: 540, y: 220 },
        { id: 6, x: 140, y: 328 }, { id: 7, x: 220, y: 328 }, { id: 8, x: 460, y: 328 },
      ];
      let closestBed = null;
      let minDist = 25;
      for (const b of beds) {
        const dx = Math.abs(px - b.x);
        const dy = Math.abs(py - b.y);
        if (dy < 20 && dx < minDist) {
          closestBed = b;
          minDist = dx;
        }
      }

      if (closestBed !== null) {
        const bed = engine.farmingState.beds.find(x => x.id === closestBed.id);
        if (bed) {
          if (!bed.unlocked) {
            engine.purchasePlantBed(bed.id);
          } else if (!bed.plantedCropId) {
            engine.farmingState.activePlantingBedId = bed.id;
            engine.farmingState.isDeporcusOpen = false;
            sound.playUnlock();
          } else if (bed.growthProgress >= 1.0) {
            engine.harvestBed(bed.id);
          }
        }
        return;
      }

      // Default fallback for farming mode: toggle Closet/Inventory anywhere!
      isClosetOpen = !isClosetOpen;
      sound.playUnlock();
      return;
    }

    // Proximity checks inside Lobby mode
    if (engine.gameMode === 'lobby') {
      const px = engine.player.x + engine.player.width / 2;

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

      // 4. Farm Portal Proximity (X = 580, cozy garden)
      if (Math.abs(px - 580) < 32) {
        engine.setFarmingMode();
        sound.playUnlock();
        return;
      }

      // 5. Run Portal Proximity (X = 480, infinite box run)
      if (Math.abs(px - 480) < 32) {
        engine.startNewRun();
        sound.playUnlock();
        return;
      }
    }

    // Default: try lift physical crate. If none closer than 45px, toggle Closet Inventory!
    let hasNearBox = false;
    if (engine.player.grabbingBox) {
      hasNearBox = true;
    } else {
      const px = engine.player.x + engine.player.width / 2;
      const py = engine.player.y + engine.player.height / 2;
      for (const b of engine.boxes) {
        if (b.isOpened) continue;
        const bx = b.x + b.width / 2;
        const by = b.y + b.height / 2;
        if (Math.hypot(bx - px, by - py) < 45) {
          hasNearBox = true;
          break;
        }
      }
    }

    if (hasNearBox) {
      engine.tryGrabBox();
    } else {
      isClosetOpen = !isClosetOpen;
      sound.playUnlock();
    }
    return;
  }

  if (code === 'KeyF') {
    engine.throwBox();
  }

  if (code === 'KeyC') {
    engine.clearAllRopes();
    engine.spawnFloatingText("ROPES CLEARED! ✂️", engine.player.x + 12, engine.player.y - 12, "#ffcd75");
  }

  if (code === 'KeyQ') {
    engine.tryOpenBox();
  }

  if (code === 'KeyR') {
    if (engine.gameMode !== 'farming') {
      engine.resetLevel();
      sound.playUnlock();
    }
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

  // --- MAIN MENU CARDS INTERACTIONS ---
  if (engine.gameMode === 'main_menu') {
    const c1X = 40;
    const c2X = 330;
    const cardY = 115;
    const cardW = 270;
    const cardH = 152;

    if (mx >= c1X && mx <= c1X + cardW && my >= cardY && my <= cardY + cardH) {
      engine.setLobbyMode();
      sound.playUnlock();
    } else if (mx >= c2X && mx <= c2X + cardW && my >= cardY && my <= cardY + cardH) {
      engine.setFarmingMode();
      sound.playUnlock();
    }
    return;
  }

  // --- FARMING SECTOR ROAD INTERACTIONS ---
  if (engine.gameMode === 'farming') {
    if (engine.farmingState.isDeporcusOpen) {
      handleDeporcusClicks(mx, my);
      return;
    }
    if (engine.farmingState.activePlantingBedId !== null) {
      handleSeedPlantingClicks(mx, my);
      return;
    }

    // Return menu top right button
    if (mx >= 540 && mx <= 628 && my >= 4 && my <= 28) {
      engine.setLobbyMode();
      sound.playTick();
      return;
    }

    // Deporcus Click
    const distDep = Math.abs(mx - 520);
    if (distDep < 32 && my > 260) {
      const px = engine.player.x + 12;
      const py = engine.player.y + 16;
      if (Math.abs(px - 520) < 64 && py > 255) {
        engine.farmingState.isDeporcusOpen = !engine.farmingState.isDeporcusOpen;
        engine.farmingState.activePlantingBedId = null;
        sound.playUnlock();
        return;
      }
    }

    // Soil Bed Clicks
    const beds = [
      { id: 0, x: 140, y: 110 }, { id: 1, x: 220, y: 110 }, { id: 2, x: 460, y: 110 },
      { id: 3, x: 140, y: 220 }, { id: 4, x: 460, y: 220 }, { id: 5, x: 540, y: 220 },
      { id: 6, x: 140, y: 328 }, { id: 7, x: 220, y: 328 }, { id: 8, x: 460, y: 328 },
    ];
    for (const b of beds) {
      if (Math.abs(mx - b.x) < 22 && Math.abs(my - b.y) < 22) {
        const px = engine.player.x + 12;
        const py = engine.player.y + 16;
        if (Math.abs(px - b.x) < 42 && Math.abs(py - b.y) < 42) {
          const bed = engine.farmingState.beds.find(x => x.id === b.id);
          if (bed) {
            if (!bed.unlocked) {
              engine.purchasePlantBed(bed.id);
            } else if (!bed.plantedCropId) {
              engine.farmingState.activePlantingBedId = bed.id;
              engine.farmingState.isDeporcusOpen = false;
              sound.playUnlock();
            } else if (bed.growthProgress >= 1.0) {
              engine.harvestBed(bed.id);
            }
          }
        }
        return;
      }
    }
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
    // start gate (Run Portal) is at 480
    if (Math.abs(mx - 480) < 25 && my > height - 80) {
      engine.startNewRun();
      return;
    }
    // farm gate is at 580
    if (Math.abs(mx - 580) < 25 && my > height - 80) {
      engine.setFarmingMode();
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

  // Hookshot Drag Line check
  if (engine.currentTool === 'hookshot') {
    engine.fireHookshot(mx, my);
    return;
  }

  // Rope Toolgun Anchor Placement check
  if (engine.currentTool === 'toolgun') {
    engine.useToolgun(mx, my);
    return;
  }

  // Laser Cutter trigger
  if (engine.currentTool === 'laser_cutter') {
    engine.shootLaserCutter(mx, my);
    return;
  }

  // Vacuum Harvester magnetic suction trigger
  if (engine.currentTool === 'vacuum_harvester') {
    engine.shootVacuumHarvester(mx, my);
    return;
  }

  // Default Click physics grabbing / flinging
  engine.handleMouseDown(mx, my);
};

// Handle clicks inside upgrades computer menu
const handleShopClicks = (mx: number, my: number) => {
  const panelW = 320;
  const panelH = 235;
  const px = (width - panelW) / 2;
  const py = (height - panelH) / 2;

  // X button at top right
  if (mx >= px + panelW - 18 && mx <= px + panelW - 4 && my >= py + 4 && my <= py + 18) {
    isShopOpen = false;
    sound.playTick();
    return;
  }

  // Column 1 (Left column click)
  if (mx >= px + 10 && mx <= px + 155) {
    // Row 1: Upgrade Truck Capacity
    if (my >= py + 40 && my <= py + 72) {
      if (engine.purchaseTruckCapacity()) {
        engine.spawnFloatingText("CAPACITY UPGRADED! 🚚", width / 2, py + 56, "#73ef7d");
      } else {
        sound.playSplat();
        engine.spawnFloatingText("INSUFFICIENT COINS!", width / 2, py + 56, "#ef7d57");
      }
    }
    // Row 2: Mouse Cursor Tool
    else if (my >= py + 76 && my <= py + 108 && !engine.inventory.tools.includes('mouse_cursor')) {
      if (engine.purchaseToolUnlock('mouse_cursor', 50, 0)) {
        engine.spawnFloatingText("MOUSE DRAG UNLOCKED!", width / 2, py + 92, "#73ef7d");
      } else {
        sound.playSplat();
        engine.spawnFloatingText("INSUFFICIENT COINS!", width / 2, py + 92, "#ef7d57");
      }
    }
    // Row 3: Blue Shamrock Lucky charm
    else if (my >= py + 112 && my <= py + 144 && !engine.inventory.tools.includes('shamrock')) {
      if (engine.purchaseToolUnlock('shamrock', 350, 0)) {
        engine.spawnFloatingText("LUCKY SHAMROCK ACQUIRED!", width / 2, py + 128, "#73ef7d");
      } else {
        sound.playSplat();
        engine.spawnFloatingText("INSUFFICIENT COINS!", width / 2, py + 128, "#ef7d57");
      }
    }
    // Row 4: Laser Cutter Tool option
    else if (my >= py + 148 && my <= py + 180 && !engine.inventory.tools.includes('laser_cutter')) {
      if (engine.purchaseToolUnlock('laser_cutter', 600, 4)) {
        engine.spawnFloatingText("LASER CUTTER UNLOCKED! ⚡", width / 2, py + 164, "#73ef7d");
      } else {
        sound.playSplat();
        engine.spawnFloatingText("REQUIRES 600 COINS & 4 GEMS!", width / 2, py + 164, "#ef7d57");
      }
    }
  }

  // Column 2 (Right column click)
  if (mx >= px + 160 && mx <= px + 310) {
    // Row 1: Portal Gun
    if (my >= py + 40 && my <= py + 72 && !engine.inventory.tools.includes('portal_gun')) {
      if (engine.purchaseToolUnlock('portal_gun', 500, 5)) {
        engine.spawnFloatingText("PORTAL GUN UNLOCKED!", width / 2, py + 56, "#73ef7d");
      } else {
        sound.playSplat();
        engine.spawnFloatingText("REQUIRES 500 COINS & 5 GEMS!", width / 2, py + 56, "#ef7d57");
      }
    }
    // Row 2: Magnetic Hookshot
    else if (my >= py + 76 && my <= py + 108 && !engine.inventory.tools.includes('hookshot')) {
      if (engine.purchaseToolUnlock('hookshot', 200, 2)) {
        engine.spawnFloatingText("HOOKSHOT UNLOCKED! 🪝", width / 2, py + 92, "#73ef7d");
      } else {
        sound.playSplat();
        engine.spawnFloatingText("REQUIRES 200 COINS & 2 GEMS!", width / 2, py + 92, "#ef7d57");
      }
    }
    // Row 3: Rope Toolgun
    else if (my >= py + 112 && my <= py + 144 && !engine.inventory.tools.includes('toolgun')) {
      if (engine.purchaseToolUnlock('toolgun', 400, 3)) {
        engine.spawnFloatingText("ROPE TOOLGUN UNLOCKED! 🔫", width / 2, py + 128, "#73ef7d");
      } else {
        sound.playSplat();
        engine.spawnFloatingText("REQUIRES 400 COINS & 3 GEMS!", width / 2, py + 128, "#ef7d57");
      }
    }
    // Row 4: Vacuum Harvester option
    else if (my >= py + 148 && my <= py + 180 && !engine.inventory.tools.includes('vacuum_harvester')) {
      if (engine.purchaseToolUnlock('vacuum_harvester', 450, 1)) {
        engine.spawnFloatingText("VACUUM HARVESTER UNLOCKED! 🌀", width / 2, py + 164, "#73ef7d");
      } else {
        sound.playSplat();
        engine.spawnFloatingText("REQUIRES 450 COINS & 1 GEM!", width / 2, py + 164, "#ef7d57");
      }
    }
  }
};

// Handle equipping inside Wardrobe Costume closet
const handleClosetClicks = (mx: number, my: number) => {
  const panelW = 480;
  const panelH = 240;
  const px = (width - panelW) / 2;
  const py = (height - panelH) / 2;

  // X button
  if (mx >= px + panelW - 18 && mx <= px + panelW - 4 && my >= py + 4 && my <= py + 18) {
    isClosetOpen = false;
    sound.playTick();
    return;
  }

  // Handle Cosmetic column selections (Column 1)
  const cosItems = [
    { id: 'hat', name: "Top Hat 🎩" },
    { id: 'glasses', name: "Cool Shades 😎" },
    { id: 'hair', name: "Punk Pink Hair 🧑‍🎤" },
    { id: 'crown', name: "Crown 👑" },
    { id: 'cowboy_hat', name: "Cowboy Hat 🤠" },
    { id: 'chef_hat', name: "Chef Hat 🧑‍🍳" },
    { id: 'wizard_hat', name: "Wizard Hat 🧙" },
    { id: 'goggled_helmet', name: "Astronaut Helmet 👨‍🚀" }
  ];

  if (mx >= px + 12 && mx <= px + 150) {
    const i = Math.floor((my - (py + 44)) / 22);
    if (i >= 0 && i < cosItems.length) {
      const item = cosItems[i];
      if (engine.inventory.cosmetics.includes(item.id)) {
        engine.toggleEquipCosmetic(item.id);
      } else {
        sound.playSplat();
        engine.spawnFloatingText("NOT UNBOXED YET! 📦", px + 80, py + 54 + i * 22, "#9fadbc");
      }
    }
  }

  // Handle Tools & Pets column selections (Column 2)
  const toolsList = [
    { id: 'mouse_cursor', name: "Cursor Pointer Hand 🖱️" },
    { id: 'shamrock', name: "Clover Shamrock 🍀" },
    { id: 'portal_gun', name: "Quantum Portal Gun 🔮" },
    { id: 'hookshot', name: "Magnetic Hookshot 🪝" },
    { id: 'toolgun', name: "Rope Toolgun 🔫" },
    { id: 'laser_cutter', name: "Laser Cutter ⚡" },
    { id: 'vacuum_harvester', name: "Vacuum Harvester 🌀" }
  ];

  const petsList = [
    { id: 'dog', name: "Cute Golden Dog 🐶" },
    { id: 'cat', name: "Black Kitten 🐱" },
    { id: 'fish', name: "Fish Tank Orb 🐠" },
    { id: 'robot', name: "Companion Droid 🤖" },
    { id: 'ufo', name: "Mini UFO 🛸" },
    { id: 'slime', name: "Slime Companion 🦠" },
    { id: 'dragon', name: "Baby Dragon 🐉" },
    { id: 'piglet', name: "Gardener Piglet 🐷" }
  ];

  if (mx >= px + 162 && mx <= px + 310) {
    // Tools check
    if (my >= py + 42 && my <= py + 119) {
      const i = Math.floor((my - (py + 42)) / 11);
      if (i >= 0 && i < toolsList.length) {
        const t = toolsList[i];
        if (engine.inventory.tools.includes(t.id)) {
          engine.toggleEquipTool(t.id);
        } else {
          sound.playSplat();
          engine.spawnFloatingText("NOT BOUGHT YET! 🔒", px + 236, py + 46 + i * 11, "#9fadbc");
        }
      }
    }
    // Pets check
    else if (my >= py + 138 && my <= py + 226) {
      const i = Math.floor((my - (py + 138)) / 11);
      if (i >= 0 && i < petsList.length) {
        const p = petsList[i];
        if (engine.inventory.pets.includes(p.id)) {
          engine.toggleEquipPet(p.id);
        } else {
          sound.playSplat();
          engine.spawnFloatingText("NOT UNBOXED YET! 📦", px + 236, py + 142 + i * 11, "#9fadbc");
        }
      }
    }
  }

  // Handle Orbiting Crop Selection (Column 3)
  if (mx >= px + 324 && mx <= px + 462) {
    if (my >= py + 50 && my <= py + 210) {
      const i = Math.floor((my - (py + 50)) / 16);
      if (i >= 0 && i < engine.farmingState.inventory.length && i < 10) {
        const stack = engine.farmingState.inventory[i];
        if (!engine.equippedCrops) engine.equippedCrops = [];
        
        const idx = engine.equippedCrops.findIndex((c: any) => 
          c.cropId === stack.cropId && c.size === stack.size && c.mutation === stack.mutation
        );

        if (idx !== -1) {
          // Unequip
          engine.equippedCrops.splice(idx, 1);
          sound.playTick();
          engine.spawnFloatingText("SHOWCASE REMOVED! 🌾", width / 2, height / 2 - 20, "#df9c5c");
        } else {
          // Equip
          if (engine.equippedCrops.length >= 3) {
            sound.playSplat();
            engine.spawnFloatingText("MAX 3 SHOWCASE CROPS!", width / 2, height / 2 - 20, "#ef7d57");
          } else {
            engine.equippedCrops.push({
              cropId: stack.cropId,
              size: stack.size,
              mutation: stack.mutation
            });
            sound.playUnlock();
            engine.spawnFloatingText("★ SHOWCASE EQUIPPED! ★", width / 2, height / 2 - 20, "#73ef7d");
          }
        }
        engine.saveProfileToStorage();
      }
    }
  }
};

const handleMouseMove = (e: MouseEvent) => {
  const { mx, my } = getVirtualMouseCoords(e.clientX, e.clientY);
  engine.handleMouseMove(mx, my);
};

const handleMouseUp = () => {
  engine.handleMouseUp();
  engine.releaseHookshot();
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

    if (engine.currentTool === 'hookshot') {
      engine.fireHookshot(mx, my);
      return;
    }

    if (engine.currentTool === 'toolgun') {
      engine.useToolgun(mx, my);
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

    // 3. RUN PORTAL
    const runX = 480;
    // Glowing chamber pillar outline
    ctx.strokeStyle = '#73ef7d';
    ctx.lineWidth = 2;
    ctx.strokeRect(runX - 16, groundY - 42, 32, 42);
    ctx.fillStyle = 'rgba(115, 239, 125, 0.18)';
    ctx.fillRect(runX - 16, groundY - 42, 32, 42);

    // Grid vertical lines glowing oscillation
    ctx.fillStyle = '#73ef7d';
    ctx.fillRect(runX - 13 + Math.floor(Date.now() / 150) % 22, groundY - 40, 2, 40);

    ctx.font = 'bold 6.5px monospace';
    ctx.fillStyle = '#73ef7d';
    ctx.fillText("RUN PORTAL", runX, groundY - 46);

    // 4. FARM PORTAL
    const farmX = 580;
    // Glowing warm amber outline
    ctx.strokeStyle = '#ffe385';
    ctx.lineWidth = 2;
    ctx.strokeRect(farmX - 16, groundY - 42, 32, 42);
    ctx.fillStyle = 'rgba(255, 227, 133, 0.18)';
    ctx.fillRect(farmX - 16, groundY - 42, 32, 42);

    // Grid vertical lines glowing oscillation
    ctx.fillStyle = '#ffe385';
    ctx.fillRect(farmX - 13 + Math.floor(Date.now() / 150) % 22, groundY - 40, 2, 40);

    ctx.font = 'bold 6.5px monospace';
    ctx.fillStyle = '#ffe385';
    ctx.fillText("FARM PORTAL", farmX, groundY - 46);
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
// --- RETRO MAIN MENU GRAPHICS ---
const drawMainMenu = () => {
  // Cosmic grid backdrop
  ctx.fillStyle = '#0f101d';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(54, 229, 240, 0.08)';
  ctx.lineWidth = 1;
  for (let cx = 0; cx < width; cx += 40) {
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, height); ctx.stroke();
  }
  for (let cy = 0; cy < height; cy += 40) {
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke();
  }

  // Large radiant icons
  sprites.drawSprite(ctx, 'crate_wood', width / 2 - 40, 24, 24, 24);
  sprites.drawSprite(ctx, 'deporcus_idle_1', width / 2 + 16, 26, 24, 24);

  // Facility titles
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#ffcd75';
  ctx.textAlign = 'center';
  ctx.fillText("FACILITY SECTOR 7-B", width / 2, 78);

  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = '#36e5f0';
  ctx.fillText("INTEGRATED SANDBOX CARGO STATION & PLANTATION GARDEN", width / 2, 91);

  // Layout cards
  const c1X = 40;
  const c2X = 330;
  const cardY = 115;
  const cardW = 270;
  const cardH = 152;

  const isOver1 = (engine.dragJoint.mouseX >= c1X && engine.dragJoint.mouseX <= c1X + cardW && engine.dragJoint.mouseY >= cardY && engine.dragJoint.mouseY <= cardY + cardH);
  const isOver2 = (engine.dragJoint.mouseX >= c2X && engine.dragJoint.mouseX <= c2X + cardW && engine.dragJoint.mouseY >= cardY && engine.dragJoint.mouseY <= cardY + cardH);

  // Card 1: SANDBOX WAREHOUSE
  ctx.fillStyle = isOver1 ? '#181b2b' : '#0a0d16';
  ctx.strokeStyle = isOver1 ? '#73ef7d' : '#223c4a';
  ctx.lineWidth = 2;
  ctx.fillRect(c1X, cardY, cardW, cardH);
  ctx.strokeRect(c1X, cardY, cardW, cardH);

  ctx.fillStyle = isOver1 ? '#73ef7d' : '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText("[1] WAREHOUSE CARGO WORKSPACE", c1X + 16, cardY + 28);

  ctx.fillStyle = '#9fadbc';
  ctx.font = '7px monospace';
  ctx.fillText("• Stack crates, load the transport cargo truck.", c1X + 16, cardY + 54);
  ctx.fillText("• Unlock Portal Gun, Hookshot and magnetic tools.", c1X + 16, cardY + 68);
  ctx.fillText("• Fling crates with satisfying elastic spring physics.", c1X + 16, cardY + 82);
  ctx.fillText("• Earn valuable coins & gemstones interactively.", c1X + 16, cardY + 96);

  ctx.fillStyle = isOver1 ? '#73ef7d' : '#ffcd75';
  ctx.font = 'bold 7.5px monospace';
  ctx.fillText("CLICK OR PRESS [1] TO ENTER SECTOR WORKSPACE", c1X + 16, cardY + 128);

  // Card 2: DEPORCUS FARMING GARDEN
  ctx.fillStyle = isOver2 ? '#131e16' : '#060d09';
  ctx.strokeStyle = isOver2 ? '#ffe385' : '#223c28';
  ctx.fillRect(c2X, cardY, cardW, cardH);
  ctx.strokeRect(c2X, cardY, cardW, cardH);

  ctx.fillStyle = isOver2 ? '#ffe385' : '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.fillText("[2] DEPORCUS'S PLANTATION GARDEN", c2X + 16, cardY + 28);

  ctx.fillStyle = '#9fadbc';
  ctx.font = '7px monospace';
  ctx.fillText("• Trade crop seeds with Deporcus the pig farmer.", c2X + 16, cardY + 54);
  ctx.fillText("• Grow 10 crop tiers (Wheat Stalk -> Golden Ravioli!)", c2X + 16, cardY + 68);
  ctx.fillText("• Plants grow in REAL-TIME (offline while logged out!).", c2X + 16, cardY + 82);
  ctx.fillText("• Harvest rare mutated sizes (Cosmic Radioactive etc).", c2X + 16, cardY + 96);

  ctx.fillStyle = isOver2 ? '#ffe385' : '#73ef7d';
  ctx.font = 'bold 7.5px monospace';
  ctx.fillText("CLICK OR PRESS [2] TO ENTER COZY GARDEN", c2X + 16, cardY + 128);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#223040';
  ctx.font = '6px monospace';
  ctx.fillText("FACILITY CORE SYSTEM ENG v3.60 // STABLE BUILD ONLINE", width / 2, height - 12);
};

// --- MULTI-FLOOR GARDEN GRAPHICS ---
const drawFarmingRoomBackground = (w: number, h: number) => {
  ctx.fillStyle = '#0f1711'; // ambient forest greenhouse dark canvas
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#1d3623';
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 16) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // Render wooden center ladder spanning all 3 layers
  for (let ly = 110; ly < 328; ly += 16) {
    sprites.drawSprite(ctx, 'ladder_tile', 312, ly, 16, 16);
  }

  // Draw 3 Floor Platforms
  const platforms = [110, 220, 328];
  for (const fY of platforms) {
    ctx.fillStyle = '#1e3f22'; // lush grass sod
    ctx.strokeStyle = '#0e2411';
    ctx.lineWidth = 2;

    // Left slab
    ctx.fillRect(0, fY, 304, 10);
    ctx.strokeRect(0, fY, 304, 10);

    // Right slab
    ctx.fillRect(336, fY, w - 336, 10);
    ctx.strokeRect(336, fY, w - 336, 10);

    // Warm soil roots underneath
    ctx.fillStyle = '#1c120c';
    ctx.fillRect(0, fY + 10, 304, 3);
    ctx.fillRect(336, fY + 10, w - 336, 3);
  }

  // Steel beams
  ctx.fillStyle = '#0f1210';
  ctx.fillRect(0, 0, 10, h);
  ctx.fillRect(w - 10, 0, 10, h);
};

// Draw plant beds on layout coordinates
const drawFarmingRoomBeds = (w: number, h: number) => {
  const beds = [
    { id: 0, x: 140, y: 110 }, { id: 1, x: 220, y: 110 }, { id: 2, x: 460, y: 110 },
    { id: 3, x: 140, y: 220 }, { id: 4, x: 460, y: 220 }, { id: 5, x: 540, y: 220 },
    { id: 6, x: 140, y: 328 }, { id: 7, x: 220, y: 328 }, { id: 8, x: 460, y: 328 },
  ];

  for (const b of beds) {
    const bed = engine.farmingState.beds.find(x => x.id === b.id);
    if (!bed) continue;

    const px = b.x;
    const py = b.y;

    if (!bed.unlocked) {
      // Locked Bed visual outline
      sprites.drawSprite(ctx, 'crop_empty_bed', px - 12, py - 20, 24, 24, { tint: 'rgba(0,0,0,0.55)' });
      
      ctx.fillStyle = '#ffcd75';
      ctx.font = 'bold 5px monospace';
      ctx.textAlign = 'center';
      const lockS = bed.gemsCost > 0 ? `🔒 ${bed.cost}C/${bed.gemsCost}G` : `🔒 ${bed.cost}C`;
      ctx.fillText(lockS, px, py - 21);
    } else {
      // Unlocked Bed dirt block
      sprites.drawSprite(ctx, 'crop_empty_bed', px - 12, py - 20, 24, 24);

      if (bed.plantedCropId) {
        const crop = CROP_TYPES.find(c => c.id === bed.plantedCropId);
        if (crop) {
          const cropSz = Math.round(14 * Math.max(0.4, bed.growthProgress));
          let tintOverlay: string | undefined;

          if (bed.mutation && bed.mutation !== 'none') {
            const mConf = CROP_MUTATIONS.find(m => m.id === bed.mutation);
            if (mConf) tintOverlay = mConf.tint;
          }

          sprites.drawSprite(ctx, crop.spriteName, px - cropSz / 2, py - 14 - cropSz / 2, cropSz, cropSz, {
            tint: tintOverlay
          });

          // Draw progress
          if (bed.growthProgress < 1.0) {
            ctx.fillStyle = '#10121c';
            ctx.fillRect(px - 10, py - 4, 20, 2.5);
            ctx.fillStyle = '#73ef7d';
            ctx.fillRect(px - 10, py - 4, 20 * bed.growthProgress, 2.5);
          } else {
            ctx.fillStyle = '#73ef7d';
            ctx.font = 'bold 5.5px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("READY!", px, py - 4);
          }
        }
      }
    }
  }
};

// Render Deporcus Standing
const drawDeporcusStanding = (w: number, h: number) => {
  const deporcusSprite = Math.floor(Date.now() / 460) % 2 === 0 ? 'deporcus_idle_1' : 'deporcus_idle_2';
  
  ctx.save();
  ctx.translate(520 + 16, 328 - 32 + 16);
  ctx.rotate(engine.farmingState.deporcusRotation || 0);
  sprites.drawSprite(ctx, deporcusSprite, -16, -16, 32, 32);
  ctx.restore();

  // Nameboard tag
  ctx.fillStyle = 'rgba(16, 20, 31, 0.7)';
  ctx.fillRect(520 - 4, 328 - 38, 40, 8);
  ctx.strokeStyle = '#df9c5c';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(520 - 4, 328 - 38, 40, 8);

  ctx.fillStyle = '#ffe385';
  ctx.font = 'bold 5.2px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("DEPORCUS 🐷", 520 + 16, 328 - 32);
};

// --- FARMING OVERLAY DIALOGS ---
const drawDeporcusShopWindow = (w: number, h: number) => {
  const panelW = 460;
  const panelH = 240;
  const px = (w - panelW) / 2;
  const py = (h - panelH) / 2;

  // Dark greenhouse screen panels
  ctx.fillStyle = '#111813';
  ctx.fillRect(px, py, panelW, panelH);
  ctx.strokeStyle = '#080d09';
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, panelW, panelH);

  ctx.strokeStyle = '#24452c';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 4, py + 4, panelW - 8, panelH - 8);

  ctx.fillStyle = '#080d09';
  ctx.fillRect(px + 4, py + 4, panelW - 8, 18);

  ctx.fillStyle = '#ffcd75';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText("🐖 DEPORCUS'S BARN SEED STORE & HARVEST SILO", px + 12, py + 15);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ef7d57';
  ctx.fillText("[X] CLOSE", px + panelW - 12, py + 15);

  const colW = 212;
  const leftColX = px + 10;
  const rightColX = px + colW + 28;

  // LEFT COLUMN: BUY SEEDS
  ctx.fillStyle = '#080d09';
  ctx.fillRect(leftColX, py + 26, colW, panelH - 36);
  ctx.strokeStyle = '#24452c';
  ctx.strokeRect(leftColX, py + 26, colW, panelH - 36);

  ctx.fillStyle = '#36e5f0';
  ctx.font = 'bold 7.2px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("⭐ DEPORCUS SEED STAND (CLICK BUY)", leftColX + colW / 2, py + 38);

  ctx.textAlign = 'left';
  CROP_TYPES.forEach((crop, idx) => {
    const rowY = py + 45 + idx * 17;
    const stock = engine.farmingState.shopStock[crop.id] || 0;

    ctx.fillStyle = stock > 0 ? '#101a13' : '#1e1111';
    ctx.fillRect(leftColX + 4, rowY, colW - 8, 15);
    ctx.strokeStyle = stock > 0 ? '#1c4a24' : '#5c1f1f';
    ctx.strokeRect(leftColX + 4, rowY, colW - 8, 15);

    ctx.fillStyle = crop.color;
    ctx.font = 'bold 6.5px monospace';
    ctx.fillText(crop.name, leftColX + 8, rowY + 10);

    ctx.font = '6px monospace';
    if (stock > 0) {
      ctx.fillStyle = '#73ef7d';
      ctx.fillText(`QTY: ${stock}`, leftColX + 115, rowY + 10);
    } else {
      ctx.fillStyle = '#ef7d57';
      ctx.fillText(`OUT OF STOCK`, leftColX + 115, rowY + 10);
    }

    ctx.textAlign = 'right';
    ctx.font = 'bold 6px monospace';
    if (crop.gemsCost > 0) {
      ctx.fillStyle = '#73ef7d';
      ctx.fillText(`${crop.cost}C/${crop.gemsCost}G`, leftColX + colW - 8, rowY + 10);
    } else {
      ctx.fillStyle = '#ffe385';
      ctx.fillText(`${crop.cost}C`, leftColX + colW - 8, rowY + 10);
    }
    ctx.textAlign = 'left';
  });

  // RIGHT COLUMN: STORAGE SILO
  ctx.fillStyle = '#080d09';
  ctx.fillRect(rightColX, py + 26, colW, panelH - 36);
  ctx.strokeStyle = '#24452c';
  ctx.strokeRect(rightColX, py + 26, colW, panelH - 36);

  ctx.fillStyle = '#ffcd75';
  ctx.font = 'bold 7.2px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("🌾 YOUR SILO BARN INVENTORY", rightColX + colW / 2, py + 38);

  ctx.textAlign = 'left';
  if (engine.farmingState.inventory.length === 0) {
    ctx.fillStyle = '#566c86';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("(SILO BARN EMPTY -- PLANT SOIL)", rightColX + colW / 2, py + 100);
  } else {
    const visibleRowS = engine.farmingState.inventory.slice(0, 9);
    visibleRowS.forEach((stack, idx) => {
      const rowY = py + 45 + idx * 17;
      const crop = CROP_TYPES.find(c => c.id === stack.cropId);
      if (!crop) return;

      ctx.fillStyle = '#111512';
      ctx.fillRect(rightColX + 4, rowY, colW - 8, 15);
      ctx.strokeStyle = '#24452c';
      ctx.strokeRect(rightColX + 4, rowY, colW - 8, 15);

      const labelTxt = `${stack.count}x [${stack.size.substring(0,3).toUpperCase()}] ${crop.name}`;
      ctx.fillStyle = crop.color;
      ctx.font = 'bold 5.5px monospace';
      ctx.fillText(labelTxt, rightColX + 8, rowY + 10);

      // Mutation tags
      if (stack.mutation !== 'none') {
        const mConf = CROP_MUTATIONS.find(m => m.id === stack.mutation);
        ctx.fillStyle = mConf?.color || '#cc66ff';
        ctx.font = 'bold 4.5px monospace';
        ctx.fillText(stack.mutation.toUpperCase() + " ✨", rightColX + 115, rowY + 10);
      }

      ctx.fillStyle = '#a24b31';
      ctx.fillRect(rightColX + colW - 40, rowY + 2, 34, 11);
      ctx.strokeStyle = '#10121c';
      ctx.strokeRect(rightColX + colW - 40, rowY + 2, 34, 11);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 5.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText("SELL", rightColX + colW - 23, rowY + 10);
      ctx.textAlign = 'left';
    });
  }

  // Fertilizer Status and Buy Card button
  const fertActive = engine.farmingState.fertilizerTimeRemaining > 0;
  const fertCost = 150;
  const canAffordFert = engine.coins >= fertCost;

  ctx.fillStyle = fertActive ? '#ffb914' : (canAffordFert ? '#73ef7d' : '#a24b31');
  ctx.fillRect(leftColX + 4, py + panelH - 18, colW - 8, 14);
  ctx.strokeStyle = '#10121c';
  ctx.strokeRect(leftColX + 4, py + panelH - 18, colW - 8, 14);

  ctx.fillStyle = fertActive ? '#10121c' : '#10121c';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  if (fertActive) {
    const mins = Math.floor(engine.farmingState.fertilizerTimeRemaining / 60);
    const secs = Math.floor(engine.farmingState.fertilizerTimeRemaining % 60);
    ctx.fillText(`⚡ FERTILIZER 2X ACTIVE! [${mins}m ${secs}s]`, leftColX + colW / 2, py + panelH - 9);
  } else {
    ctx.fillText(`🌱 BUY 2X SPEED FERTILIZER (-150 Coins)`, leftColX + colW / 2, py + panelH - 9);
  }
  ctx.textAlign = 'left';

  ctx.fillStyle = '#9fadbc';
  ctx.font = '5.5px monospace';
  const remSec = Math.ceil(engine.farmingState.shopRestockTimer);
  ctx.fillText(`Restock Tick: ${remSec}s`, leftColX + 8, py + panelH - 22);

  ctx.fillStyle = '#73ef7d';
  ctx.fillRect(rightColX + 4, py + panelH - 26, colW - 8, 14);
  ctx.strokeStyle = '#10121c';
  ctx.strokeRect(rightColX + 4, py + panelH - 26, colW - 8, 14);

  ctx.fillStyle = '#10121c';
  ctx.font = 'bold 6.5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("SELL ALL HARVEST CROPS (KEEPS SEED PACKS)", rightColX + colW / 2, py + panelH - 17);
};

// Draw seed planting choice modal
const drawSeedPlantingWindow = (w: number, h: number) => {
  const panelW = 320;
  const panelH = 180;
  const px = (w - panelW) / 2;
  const py = (h - panelH) / 2;

  ctx.fillStyle = '#1e110b';
  ctx.fillRect(px, py, panelW, panelH);
  ctx.strokeStyle = '#10121c';
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, panelW, panelH);

  ctx.strokeStyle = '#a24b31';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 4, py + 4, panelW - 8, panelH - 8);

  ctx.fillStyle = '#1c110b';
  ctx.fillRect(px + 4, py + 4, panelW - 8, 18);

  ctx.fillStyle = '#ffe385';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText("🌱 SELECT SEED HARVEST FROM SILO", px + 12, py + 15);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ef7d57';
  ctx.fillText("[ESC] CANCEL", px + panelW - 12, py + 15);

  const seeds = engine.farmingState.inventory.filter(i => i.size === 'medium' && i.mutation === 'none' && i.count > 0);

  ctx.textAlign = 'center';
  if (seeds.length === 0) {
    ctx.fillStyle = '#ffe385';
    ctx.font = 'bold 7px monospace';
    ctx.fillText("NO SEED PACKS IN BARN SILO!", px + panelW / 2, py + 70);
    ctx.fillStyle = '#9fadbc';
    ctx.font = '6px monospace';
    ctx.fillText("Approach and buy seed crops from Farmer", px + panelW / 2, py + 95);
    ctx.fillText("Deporcus on the bottom deck!", px + panelW / 2, py + 110);
  } else {
    ctx.textAlign = 'left';
    seeds.slice(0, 7).forEach((seed, idx) => {
      const crop = CROP_TYPES.find(c => c.id === seed.cropId);
      if (!crop) return;

      const rowY = py + 30 + idx * 17;
      ctx.fillStyle = '#10121c';
      ctx.fillRect(px + 10, rowY, panelW - 20, 15);
      ctx.strokeStyle = '#a24b31';
      ctx.strokeRect(px + 10, rowY, panelW - 20, 15);

      ctx.fillStyle = crop.color;
      ctx.font = 'bold 7.2px monospace';
      ctx.fillText(`${crop.name} (${seed.count} pods)`, px + 16, rowY + 11);

      ctx.fillStyle = '#73ef7d';
      ctx.textAlign = 'right';
      ctx.font = 'bold 6px monospace';
      ctx.fillText("PLANT NOW 🌱", px + panelW - 16, rowY + 10);
      ctx.textAlign = 'left';
    });
  }
};

// --- DIALOGS INTERACTIVE CLICKS CHECK ---
const handleDeporcusClicks = (mx: number, my: number) => {
  const panelW = 460;
  const panelH = 240;
  const px = (width - panelW) / 2;
  const py = (height - panelH) / 2;

  // Close X
  if (mx >= px + panelW - 60 && mx <= px + panelW - 4 && my >= py + 4 && my <= py + 22) {
    engine.farmingState.isDeporcusOpen = false;
    sound.playTick();
    return;
  }

  const colW = 212;
  const leftColX = px + 10;
  const rightColX = px + colW + 28;

  // Click on Seed Stand (Left column rows)
  if (mx >= leftColX && mx <= leftColX + colW) {
    // Check if clicked the Speed Fertilizer button at the bottom:
    if (my >= py + panelH - 18 && my <= py + panelH - 4) {
      if (engine.purchaseFertilizerSpeedBoost(150, 480)) { // 150 coins for 480 seconds (8 minutes) of 2x boost!
        engine.spawnFloatingText("2X FERTILIZER ACTIVE! ⏱️", width / 2, height / 2 - 20, "#ffd93d");
      } else {
        sound.playSplat();
        engine.spawnFloatingText("INSUFFICIENT COINS!", width / 2, height / 2 - 20, "#ef7d57");
      }
      return;
    }

    CROP_TYPES.forEach((crop, idx) => {
      const rowY = py + 45 + idx * 17;
      if (my >= rowY && my <= rowY + 15) {
        engine.buyCropSeed(crop.id);
      }
    });
    return;
  }

  // Click Sell individuals (Right column rows)
  if (mx >= rightColX && mx <= rightColX + colW) {
    // If Sell All Crops button clicked
    if (my >= py + panelH - 26 && my <= py + panelH - 12) {
      engine.sellAllCrops();
      return;
    }

    const visibleInventory = engine.farmingState.inventory.slice(0, 9);
    visibleInventory.forEach((stack, idx) => {
      const rowY = py + 45 + idx * 17;
      // Sell button coordinates
      if (mx >= rightColX + colW - 44 && mx <= rightColX + colW - 4 && my >= rowY && my <= rowY + 15) {
        // Find index of stack in actual inventory
        const origIdx = engine.farmingState.inventory.findIndex(x => x.cropId === stack.cropId && x.size === stack.size && x.mutation === stack.mutation);
        if (origIdx !== -1) {
          engine.sellCropStack(origIdx);
        }
      }
    });
  }
};

const handleSeedPlantingClicks = (mx: number, my: number) => {
  const panelW = 320;
  const panelH = 180;
  const px = (width - panelW) / 2;
  const py = (height - panelH) / 2;

  // Close Cancel
  if (mx >= px + panelW - 80 && mx <= px + panelW - 4 && my >= py + 4 && my <= py + 22) {
    engine.farmingState.activePlantingBedId = null;
    sound.playTick();
    return;
  }

  const sId = engine.farmingState.activePlantingBedId;
  if (sId === null) return;

  const seeds = engine.farmingState.inventory.filter(i => i.size === 'medium' && i.mutation === 'none' && i.count > 0);
  seeds.slice(0, 7).forEach((seed, idx) => {
    const rowY = py + 30 + idx * 17;
    if (mx >= px + 10 && mx <= px + panelW - 10 && my >= rowY && my <= rowY + 15) {
      engine.plantSeed(sId, seed.cropId);
      engine.farmingState.activePlantingBedId = null;
    }
  });
};

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
  } else if (engine.currentCosmetic === 'cowboy_hat') {
    ctx.fillStyle = '#a24b31';
    ctx.fillRect(headX - 4 * facingMod - 4, headY + 1, 18, 2);
    ctx.fillRect(headX - 4 * facingMod - 1, headY - 5, 12, 6);
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(headX - 4 * facingMod - 1, headY, 12, 1);
  } else if (engine.currentCosmetic === 'chef_hat') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(headX - 4 * facingMod, headY - 5, 11, 6);
    ctx.beginPath();
    ctx.arc(headX - 4 * facingMod + 2, headY - 5, 3.5, 0, Math.PI * 2);
    ctx.arc(headX - 4 * facingMod + 9, headY - 5, 3.5, 0, Math.PI * 2);
    ctx.arc(headX - 4 * facingMod + 5.5, headY - 8, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (engine.currentCosmetic === 'wizard_hat') {
    ctx.fillStyle = '#4fa9ff';
    ctx.beginPath();
    ctx.moveTo(headX - 4 * facingMod - 3, headY + 2);
    ctx.lineTo(headX - 4 * facingMod + 13, headY + 2);
    ctx.lineTo(headX - 4 * facingMod + 5, headY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(headX - 4 * facingMod, headY + 1, 10, 1);
    ctx.fillStyle = '#ffe385';
    ctx.fillRect(headX - 4 * facingMod + 4, headY - 3, 2, 2);
  } else if (engine.currentCosmetic === 'goggled_helmet') {
    ctx.fillStyle = '#9fadbc';
    ctx.fillRect(headX - 4 * facingMod, headY - 4, 12, 12);
    ctx.fillStyle = '#36e5f0';
    ctx.fillRect(headX - 4 * facingMod + 2.5 + (flipX ? -1 : 1), headY, 7, 6);
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
  else if (engine.currentTool === 'hookshot') toolSprite = 'tool_hookshot';
  else if (engine.currentTool === 'toolgun') toolSprite = 'tool_toolgun';
  else if (engine.currentTool === 'laser_cutter') toolSprite = 'tool_laser_cutter';
  else if (engine.currentTool === 'vacuum_harvester') toolSprite = 'tool_vacuum_harvester';

  sprites.drawSprite(ctx, toolSprite, tx, ty, 12, 12, { flipX: flipX });
};

// Render up to 3 showcase crops orbiting the player center with dynamic scaling, glowing particle effects, and customized sparkle emitters
const drawOrbitingCrops = (px: number, py: number) => {
  if (!engine.equippedCrops || engine.equippedCrops.length === 0) return;

  const count = engine.equippedCrops.length;
  const time = Date.now() / 1200; // Orbit speed
  const radius = 22; // Orbit distance around player

  engine.equippedCrops.forEach((c: any, index: number) => {
    // Distribute angles evenly (e.g. 120 deg for 3 crops)
    const angle = time + (index * (Math.PI * 2) / count);
    
    // Orbit relative to center of player
    const ox = px + 12 + Math.cos(angle) * radius;
    const oy = py + 16 + Math.sin(angle) * radius;

    // Draw crop icon (cropConf)
    const cropConf = CROP_TYPES.find((cr) => cr.id === c.cropId);
    if (!cropConf) return;

    // Scale representation (small: 6px, cosmic: 16px)
    let sizePx = 10;
    if (c.size === 'small') sizePx = 7;
    else if (c.size === 'large') sizePx = 12;
    else if (c.size === 'gigantic') sizePx = 15;
    else if (c.size === 'cosmic') sizePx = 19;

    // Mutation glow tint
    const mConf = CROP_MUTATIONS.find((m) => m.id === c.mutation);
    if (mConf && mConf.id !== 'none') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = mConf.color;
      
      // Draw trailing sparkle particles occasionally!
      if (Math.random() < 0.12) {
        engine.particles.push({
          id: String(Math.random()),
          type: 'star',
          x: ox + Math.random() * 6 - 3,
          y: oy + Math.random() * 6 - 3,
          vx: Math.random() * 0.4 - 0.2,
          vy: Math.random() * 0.4 - 0.2,
          color: mConf.color,
          size: Math.random() * 2 + 1,
          life: 1.0,
          decay: 0.05,
          angle: 0,
          angularVelocity: 0,
          gravityAffect: false
        });
      }
    }

    // Draw a neat glowing/sparkling backdrop circle
    ctx.fillStyle = mConf && mConf.id !== 'none' ? mConf.tint : 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(ox + 4, oy + 4, sizePx / 2 + 2, 0, Math.PI * 2);
    ctx.fill();

    // Render the sprite
    sprites.drawSprite(ctx, cropConf.spriteName, ox, oy, sizePx, sizePx);

    // Reset shadow
    ctx.shadowBlur = 0;

    // Add tiny holographic orbits around giant/cosmic or heavily mutated crops!
    if (c.size === 'cosmic' || c.size === 'gigantic') {
      ctx.strokeStyle = mConf ? mConf.color : '#ffcd75';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(ox - 3, oy - 3, sizePx + 6, sizePx + 6);
    }
  });
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
  
  let prefix = '📂 LOBBY';
  if (engine.gameMode === 'game_run') prefix = '🛠️ CARGO HARVEST';
  else if (engine.gameMode === 'farming') prefix = '🐖 DEPORCUS\'S GARDEN';
  ctx.fillText(`${prefix} | COINS: ${engine.coins} | GEMS: ${engine.gems}`, 22, 18);

  ctx.textAlign = 'right';
  if (engine.gameMode === 'game_run') {
    ctx.fillStyle = '#73ef7d';
    ctx.fillText(`TRUCK CAPACITY: ${engine.truckCargoCount}/${engine.getTruckCapacity()}`, w - 22, 18);
  } else if (engine.gameMode === 'farming') {
    ctx.fillStyle = '#ef7d57';
    ctx.fillText(`[ESC] RETREAT GO MAIN MENU`, w - 22, 18);
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

  // Active floating prompt warnings inside Farming Mode
  if (engine.gameMode === 'farming') {
    const px = engine.player.x + 12;
    const py = engine.player.y + 16;

    // Deporcus talk bubble
    const distDep = Math.abs(px - 520);
    if (distDep < 32 && py > 260) {
      drawKeyInteractiveBubble(520, 260, "[E] OPEN DEPORCUS SHOP STAND");
    }

    // Beds proximity
    const beds = [
      { id: 0, x: 140, y: 110 }, { id: 1, x: 220, y: 110 }, { id: 2, x: 460, y: 110 },
      { id: 3, x: 140, y: 220 }, { id: 4, x: 460, y: 220 }, { id: 5, x: 540, y: 220 },
      { id: 6, x: 140, y: 328 }, { id: 7, x: 220, y: 328 }, { id: 8, x: 460, y: 328 },
    ];
    for (const b of beds) {
      if (Math.abs(py - b.y) < 22 && Math.abs(px - b.x) < 25) {
        const bed = engine.farmingState.beds.find(x => x.id === b.id);
        if (bed) {
          if (!bed.unlocked) {
            const labelStr = bed.gemsCost > 0 ? `[E] TIL SOIL BED (${bed.cost}C/${bed.gemsCost}G)` : `[E] TIL SOIL BED (${bed.cost} Coins)`;
            drawKeyInteractiveBubble(b.x, b.y - 12, labelStr);
          } else if (!bed.plantedCropId) {
            drawKeyInteractiveBubble(b.x, b.y - 12, "[E] PLANT SEED PODS");
          } else if (bed.growthProgress < 1.0) {
            const crop = CROP_TYPES.find(c => c.id === bed.plantedCropId);
            const pct = Math.floor(bed.growthProgress * 100);
            drawKeyInteractiveBubble(b.x, b.y - 12, `${crop?.name.toUpperCase()}: ${pct}%`);
          } else {
            drawKeyInteractiveBubble(b.x, b.y - 12, "[E] REAP MUTANT HARVEST 🌾");
          }
        }
      }
    }
  }

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

    // Run Portal
    if (Math.abs(px - 480) < 26) {
      drawKeyInteractiveBubble(480, groundY - 50, "WALK IN TO START NEW RUN");
    }

    // Farm Portal
    if (Math.abs(px - 580) < 26) {
      drawKeyInteractiveBubble(580, groundY - 50, "WALK IN TO ENTER FARM GARDEN");
    }
  }

  // Draw Lobby instructional bottom tip bar
  ctx.fillStyle = '#10121c';
  ctx.fillRect(10, h - 16, w - 20, 12);
  ctx.font = 'bold 5.5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.textAlign = 'center';
  
  let infoTip = "KEYS: [A/D/Arrows] Run | [W/Space/Up] Jump | [Q] Open unboxed boxes | Shift+Click spawns custom crates!";
  if (engine.gameMode === 'farming') {
    infoTip = "🌾 GO COZY GARDEN: [W/S] Climb ladder traversing layers | [A/D] Walk | Tap [E] or Click beds/Deporcus to trade!";
  } else if (engine.currentTool === 'portal_gun') {
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
  const panelH = 235;
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
  ctx.fillText(`COINS: ${engine.coins} | GEMS: ${engine.gems}`, px + panelW - 12, py + 30);

  // ------------------------------------
  // COLUMN 1 (Left column - Upgrades & Standard Accessories)
  // ------------------------------------
  
  // Row 1: Upgrade Cargo Capacity
  const upLevel = engine.truckCapacityUpgradeLevel;
  const nextCapacity = 3 + upLevel;
  const upCost = engine.getTruckUpgradeCost();
  const canAffordUpg = engine.coins >= upCost;

  ctx.textAlign = 'left';
  ctx.font = 'bold 6.2px monospace';
  ctx.fillStyle = '#ffe385';
  ctx.fillText("🚚 TRUCK UPGRADE", px + 12, py + 48);
  ctx.font = '5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText(`Adds loader slot [Max: ${nextCapacity}]`, px + 12, py + 56);
  ctx.fillText(`Cost: ${upCost} Coins`, px + 12, py + 64);

  ctx.fillStyle = canAffordUpg ? '#73ef7d' : '#a24b31';
  ctx.fillRect(px + 112, py + 42, 38, 24);
  ctx.fillStyle = '#10121c';
  ctx.font = 'bold 5.8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("UPGRADE", px + 131, py + 52);
  ctx.font = '5px monospace';
  ctx.fillText(`-${upCost}C`, px + 131, py + 61);

  // Row 2: Mouse Hand Drag Tool
  const hasCursor = engine.inventory.tools.includes('mouse_cursor');
  const canAffordCursor = engine.coins >= 50;

  ctx.textAlign = 'left';
  ctx.font = 'bold 6.2px monospace';
  ctx.fillStyle = '#f4f4f4';
  ctx.fillText("🖱️ RETRO CURSOR", px + 12, py + 84);
  ctx.font = '5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("Drag-sling physics crates", px + 12, py + 92);
  ctx.fillText("Cost: 50 Coins", px + 12, py + 100);

  ctx.fillStyle = hasCursor ? '#333c57' : (canAffordCursor ? '#73ef7d' : '#a24b31');
  ctx.fillRect(px + 112, py + 78, 38, 24);
  ctx.fillStyle = hasCursor ? '#9fadbc' : '#10121c';
  ctx.font = 'bold 5.8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hasCursor ? "OWNED" : "UNLOCK", px + 131, py + 88);
  ctx.font = '5px monospace';
  ctx.fillText(hasCursor ? "✓" : "-50C", px + 131, py + 97);

  // Row 3: Blue Shamrock Lucky multiplier
  const hasLucky = engine.inventory.tools.includes('shamrock');
  const canAffordLucky = engine.coins >= 350;

  ctx.textAlign = 'left';
  ctx.font = 'bold 6.2px monospace';
  ctx.fillStyle = '#f4f4f4';
  ctx.fillText("🍀 LUCKY CLOVER", px + 12, py + 120);
  ctx.font = '5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("Multiplies rare box drops", px + 12, py + 128);
  ctx.fillText("Cost: 350 Coins", px + 12, py + 136);

  ctx.fillStyle = hasLucky ? '#333c57' : (canAffordLucky ? '#73ef7d' : '#a24b31');
  ctx.fillRect(px + 112, py + 114, 38, 24);
  ctx.fillStyle = hasLucky ? '#9fadbc' : '#10121c';
  ctx.font = 'bold 5.8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hasLucky ? "OWNED" : "UNLOCK", px + 131, py + 124);
  ctx.font = '5px monospace';
  ctx.fillText(hasLucky ? "✓" : "-350C", px + 131, py + 133);

  // Row 4: Laser Cutter Tool option
  const hasLaser = engine.inventory.tools.includes('laser_cutter');
  const canAffordLaser = engine.coins >= 600 && engine.gems >= 4;

  ctx.textAlign = 'left';
  ctx.font = 'bold 6.2px monospace';
  ctx.fillStyle = '#f4f4f4';
  ctx.fillText("⚡ LASER CUTTER", px + 12, py + 156);
  ctx.font = '5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("Destroy & instantly unbox crates", px + 12, py + 164);
  ctx.fillText("Cost: 600 Coins & 4 Gems", px + 12, py + 172);

  ctx.fillStyle = hasLaser ? '#333c57' : (canAffordLaser ? '#73ef7d' : '#a24b31');
  ctx.fillRect(px + 112, py + 150, 38, 24);
  ctx.fillStyle = hasLaser ? '#9fadbc' : '#10121c';
  ctx.font = 'bold 5.8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hasLaser ? "OWNED" : "UNLOCK", px + 131, py + 160);
  ctx.font = '5px monospace';
  ctx.fillText(hasLaser ? "✓" : "-600C/4G", px + 131, py + 169);

  // ------------------------------------
  // COLUMN 2 (Right column - Tech Lab Gear & Weapons)
  // ------------------------------------

  // Row 1: High Tech Portal Gun
  const hasGun = engine.inventory.tools.includes('portal_gun');
  const canAffordGun = engine.coins >= 500 && engine.gems >= 5;

  ctx.textAlign = 'left';
  ctx.font = 'bold 6.2px monospace';
  ctx.fillStyle = '#f4f4f4';
  ctx.fillText("🔮 PORTAL LASER", px + 162, py + 48);
  ctx.font = '5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("Hyper flight spatial wormholes", px + 162, py + 56);
  ctx.fillText("Cost: 500 Coins & 5 Gems", px + 162, py + 64);

  ctx.fillStyle = hasGun ? '#333c57' : (canAffordGun ? '#73ef7d' : '#a24b31');
  ctx.fillRect(px + 268, py + 42, 40, 24);
  ctx.fillStyle = hasGun ? '#9fadbc' : '#10121c';
  ctx.font = 'bold 5.8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hasGun ? "OWNED" : "UNLOCK", px + 288, py + 52);
  ctx.font = '5px monospace';
  ctx.fillText(hasGun ? "✓" : "-500C/5G", px + 288, py + 61);

  // Row 2: Magnetic Hookshot
  const hasHook = engine.inventory.tools.includes('hookshot');
  const canAffordHook = engine.coins >= 200 && engine.gems >= 2;

  ctx.textAlign = 'left';
  ctx.font = 'bold 6.2px monospace';
  ctx.fillStyle = '#f4f4f4';
  ctx.fillText("🪝 MAGNETIC HOOK", px + 162, py + 84);
  ctx.font = '5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("Pull boxes or climb boundaries", px + 162, py + 92);
  ctx.fillText("Cost: 200 Coins & 2 Gems", px + 162, py + 100);

  ctx.fillStyle = hasHook ? '#333c57' : (canAffordHook ? '#73ef7d' : '#a24b31');
  ctx.fillRect(px + 268, py + 78, 40, 24);
  ctx.fillStyle = hasHook ? '#9fadbc' : '#10121c';
  ctx.font = 'bold 5.8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hasHook ? "OWNED" : "UNLOCK", px + 288, py + 88);
  ctx.font = '5px monospace';
  ctx.fillText(hasHook ? "✓" : "-200C/2G", px + 288, py + 97);

  // Row 3: Mechanical Rope Toolgun
  const hasTgun = engine.inventory.tools.includes('toolgun');
  const canAffordTgun = engine.coins >= 400 && engine.gems >= 3;

  ctx.textAlign = 'left';
  ctx.font = 'bold 6.2px monospace';
  ctx.fillStyle = '#f4f4f4';
  ctx.fillText("🔫 INDUSTRIAL ROPE", px + 162, py + 120);
  ctx.font = '5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("Physically link physics elements", px + 162, py + 128);
  ctx.fillText("Cost: 400 Coins & 3 Gems", px + 162, py + 136);

  ctx.fillStyle = hasTgun ? '#333c57' : (canAffordTgun ? '#73ef7d' : '#a24b31');
  ctx.fillRect(px + 268, py + 114, 40, 24);
  ctx.fillStyle = hasTgun ? '#9fadbc' : '#10121c';
  ctx.font = 'bold 5.8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hasTgun ? "OWNED" : "UNLOCK", px + 288, py + 124);
  ctx.font = '5px monospace';
  ctx.fillText(hasTgun ? "✓" : "-400C/3G", px + 288, py + 133);

  // Row 4: Vacuum Harvester option
  const hasVac = engine.inventory.tools.includes('vacuum_harvester');
  const canAffordVac = engine.coins >= 450 && engine.gems >= 1;

  ctx.textAlign = 'left';
  ctx.font = 'bold 6.2px monospace';
  ctx.fillStyle = '#f4f4f4';
  ctx.fillText("🌀 VACUUM DISPENSER", px + 162, py + 156);
  ctx.font = '5px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("Sucks and reels floor loot close", px + 162, py + 164);
  ctx.fillText("Cost: 450 Coins & 1 Gem", px + 162, py + 172);

  ctx.fillStyle = hasVac ? '#333c57' : (canAffordVac ? '#73ef7d' : '#a24b31');
  ctx.fillRect(px + 268, py + 150, 40, 24);
  ctx.fillStyle = hasVac ? '#9fadbc' : '#10121c';
  ctx.font = 'bold 5.8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hasVac ? "OWNED" : "UNLOCK", px + 288, py + 160);
  ctx.font = '5px monospace';
  ctx.fillText(hasVac ? "✓" : "-450C/1G", px + 288, py + 169);

  // Escape notification footer
  ctx.textAlign = 'center';
  ctx.font = '6px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("PRESS ESCAPE KEY OR E KEY TO SHUT COMPUTER SCREEN", px + panelW / 2, py + panelH - 12);
};

// Render Closet profile wardrobe equip menu
const drawClosetWindowModal = (w: number, h: number) => {
  const panelW = 480;
  const panelH = 240;
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
  ctx.fillText("👚 WARDROBE CLOSET: COSMETICS, PETS, & SHOWCASE CROPS", px + 12, py + 14);

  // X Button
  ctx.fillStyle = '#a24b31';
  ctx.fillRect(px + panelW - 18, py + 4, 14, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("X", px + panelW - 11, py + 13);

  // COLUMN 1 - HEAD COSMETICS (Hats)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ff8be6';
  ctx.font = 'bold 7.5px monospace';
  ctx.fillText("👒 UNBOXABLE HEAD WEAR", px + 12, py + 34);

  const cosItems = [
    { id: 'hat', name: "Top Hat 🎩" },
    { id: 'glasses', name: "Cool Shades 😎" },
    { id: 'hair', name: "Pink Punk Hair 🧑‍🎤" },
    { id: 'crown', name: "Crown 👑" },
    { id: 'cowboy_hat', name: "Cowboy Hat 🤠" },
    { id: 'chef_hat', name: "Chef Hat 🧑‍🍳" },
    { id: 'wizard_hat', name: "Wizard Hat 🧙" },
    { id: 'goggled_helmet', name: "Astro Helmet 👨‍🚀" }
  ];

  for (let i = 0; i < cosItems.length; i++) {
    const item = cosItems[i];
    const hasUnlocked = engine.inventory.cosmetics.includes(item.id);
    const isWorn = engine.currentCosmetic === item.id;

    ctx.fillStyle = isWorn ? '#4fa9ff' : (hasUnlocked ? '#333c57' : '#10121c');
    ctx.fillRect(px + 12, py + 44 + i * 22, 138, 18);
    ctx.strokeStyle = '#10121c';
    ctx.strokeRect(px + 12, py + 44 + i * 22, 138, 18);

    ctx.fillStyle = isWorn ? '#ffffff' : (hasUnlocked ? '#f4f4f4' : '#566c86');
    ctx.font = 'bold 6.2px monospace';
    ctx.fillText(`${item.name} ${isWorn ? '(ACTIVE)' : ''}`, px + 16, py + 52 + i * 22);
    ctx.font = '5.2px monospace';
    ctx.fillText(hasUnlocked ? "Equipped: Toggle wear" : "🔒 Collect crates to unbox", px + 16, py + 59 + i * 22);
  }

  // COLUMN 2 - GADGET TIERS & COMPANIONS
  ctx.fillStyle = '#36e5f0';
  ctx.font = 'bold 7.5px monospace';
  ctx.fillText("🛠️ UTILITY TOOLS", px + 162, py + 34);

  const toolsList = [
    { id: 'mouse_cursor', name: "Cursor Pointer Hand 🖱️" },
    { id: 'shamrock', name: "Clover Shamrock 🍀" },
    { id: 'portal_gun', name: "Quantum Portal Gun 🔮" },
    { id: 'hookshot', name: "Magnetic Hookshot 🪝" },
    { id: 'toolgun', name: "Rope Toolgun 🔫" },
    { id: 'laser_cutter', name: "Laser Cutter ⚡" },
    { id: 'vacuum_harvester', name: "Vacuum Harvester 🌀" }
  ];

  const petsList = [
    { id: 'dog', name: "Cute Golden Dog 🐶" },
    { id: 'cat', name: "Black Kitten 🐱" },
    { id: 'fish', name: "Fish Tank Orb 🐠" },
    { id: 'robot', name: "Companion Droid 🤖" },
    { id: 'ufo', name: "Mini UFO 🛸" },
    { id: 'slime', name: "Slime Companion 🦠" },
    { id: 'dragon', name: "Baby Dragon 🐉" },
    { id: 'piglet', name: "Gardener Piglet 🐷" }
  ];

  for (let i = 0; i < toolsList.length; i++) {
    const t = toolsList[i];
    const isEquipped = engine.currentTool === t.id;
    const hasU = engine.inventory.tools.includes(t.id);

    ctx.fillStyle = isEquipped ? '#73ef7d' : (hasU ? '#333c57' : '#10121c');
    ctx.fillRect(px + 162, py + 42 + i * 11, 148, 9);
    ctx.strokeStyle = '#10121c';
    ctx.strokeRect(px + 162, py + 42 + i * 11, 148, 9);

    ctx.fillStyle = isEquipped ? '#10121c' : (hasU ? '#ffffff' : '#566c86');
    ctx.font = '5.4px monospace';
    ctx.fillText(`${t.name} ${isEquipped ? '(HOLD)' : ''}`, px + 166, py + 49 + i * 11);
  }

  // Column 2 - PETS
  ctx.fillStyle = '#ffcd75';
  ctx.font = 'bold 7.5px monospace';
  ctx.fillText("🐾 COMPANION PETS", px + 162, py + 130);

  for (let i = 0; i < petsList.length; i++) {
    const p = petsList[i];
    const isEquipped = engine.currentPet === p.id;
    const hasU = engine.inventory.pets.includes(p.id);

    ctx.fillStyle = isEquipped ? '#73ef7d' : (hasU ? '#333c57' : '#10121c');
    ctx.fillRect(px + 162, py + 138 + i * 11, 148, 9);
    ctx.strokeStyle = '#10121c';
    ctx.strokeRect(px + 162, py + 138 + i * 11, 148, 9);

    ctx.fillStyle = isEquipped ? '#10121c' : (hasU ? '#ffffff' : '#566c86');
    ctx.font = '5.4px monospace';
    ctx.fillText(`${p.name} ${isEquipped ? '(TRAIL)' : ''}`, px + 166, py + 145 + i * 11);
  }

  // COLUMN 3 - SHOWCASE ORBITING CROPS
  ctx.fillStyle = '#73ef7d';
  ctx.font = 'bold 7.5px monospace';
  ctx.fillText("🌾 ORBITING CROPS", px + 324, py + 34);

  ctx.fillStyle = '#9fadbc';
  ctx.font = '5.2px monospace';
  ctx.fillText("Show off cropped sizes/mutations!", px + 324, py + 44);

  const harvestedCrops = engine.farmingState.inventory;
  if (!engine.equippedCrops) engine.equippedCrops = [];

  if (harvestedCrops.length === 0) {
    ctx.fillStyle = '#566c86';
    ctx.font = '6px monospace';
    ctx.fillText("❌ No crops harvested yet!", px + 324, py + 62);
    ctx.fillText("Go to COZY GARDEN via portal,", px + 324, py + 72);
    ctx.fillText("farm seeds, & reap mutated crops", px + 324, py + 82);
    ctx.fillText("to equip them here!", px + 324, py + 92);
  } else {
    harvestedCrops.slice(0, 10).forEach((stack, i) => {
      const isEquipped = engine.equippedCrops.some((c: any) => 
        c.cropId === stack.cropId && c.size === stack.size && c.mutation === stack.mutation
      );

      ctx.fillStyle = isEquipped ? '#ff8be6' : '#10121c';
      ctx.fillRect(px + 324, py + 50 + i * 16, 138, 14);
      ctx.strokeStyle = '#10121c';
      ctx.strokeRect(px + 324, py + 50 + i * 16, 138, 14);

      const mConf = CROP_MUTATIONS.find(m => m.id === stack.mutation);
      const cropConf = CROP_TYPES.find(c => c.id === stack.cropId);
      const cropName = cropConf ? cropConf.name.split(' ').slice(0, -1).join(' ') || cropConf.name : stack.cropId;
      const cropEmoji = cropConf ? cropConf.name.split(' ').pop() || '🌾' : '🌾';
      
      ctx.fillStyle = isEquipped ? '#10121c' : '#ffffff';
      ctx.font = 'bold 5.6px monospace';
      ctx.fillText(`${cropEmoji} ${cropName.slice(0, 12)}`, px + 328, py + 59 + i * 16);

      ctx.font = '5.0px monospace';
      ctx.fillStyle = isEquipped ? '#10121c' : (mConf ? mConf.color : '#9fadbc');
      const labelMut = mConf ? (mConf.id === 'none' ? 'Normal' : mConf.label.slice(0, 8)) : stack.mutation;
      ctx.fillText(`${stack.size.toUpperCase()} • ${labelMut}`, px + 382, py + 59 + i * 16);
    });
  }

  // Exit info
  ctx.textAlign = 'center';
  ctx.font = '6px monospace';
  ctx.fillStyle = '#9fadbc';
  ctx.fillText("TAP [E] OR CLICK [X] TO DISMISS THE WARDROBE WINDOW", px + panelW / 2, py + panelH - 8);
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

    // Track keyboard inputs for physics-bound features (e.g. ladders)
    engine.inputs.up = !!(keys['KeyW'] || keys['ArrowUp'] || keys['Space']);
    engine.inputs.down = !!(keys['KeyS'] || keys['ArrowDown']);
    engine.inputs.left = !!(keys['KeyA'] || keys['ArrowLeft']);
    engine.inputs.right = !!(keys['KeyD'] || keys['ArrowRight']);

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
    if (engine.gameMode === 'main_menu') {
      drawMainMenu();
    } else if (engine.gameMode === 'loading') {
      drawLoadingScreen(width, height);
    } else if (engine.gameMode === 'farming') {
      drawFarmingRoomBackground(width, height);
      drawFarmingRoomBeds(width, height);
      drawDeporcusStanding(width, height);

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

      // Core Player Draw
      sprites.drawSprite(ctx, playerSprite, p.x, p.y, p.width, p.height, {
        flipX: p.facing === 'left'
      });

      // Worn Costume (Hat/Glasses/Hair/Crown) & Carried Tool overlays
      drawWornCosmetics(p.x, p.y, p.facing === 'left');
      drawCarriedTool(p.x, p.y, p.facing === 'left');
      drawOrbitingCrops(p.x, p.y);

      // Trail companion Pet if active
      if (engine.currentPet) {
        sprites.drawSprite(ctx, `pet_${engine.currentPet}`, engine.petX, engine.petY, 16, 16, {
          flipX: p.facing === 'left'
        });
      }

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

      // Floating text popups
      ctx.textAlign = 'center';
      for (const txt of engine.floatingTexts) {
        ctx.fillStyle = 'rgba(16, 20, 31, 0.82)';
        const tW = ctx.measureText(txt.text).width + 6;
        ctx.fillRect(txt.x - tW / 2, txt.y - 10, tW, 12);

        ctx.fillStyle = txt.color;
        ctx.font = 'bold 7.5px monospace';
        ctx.fillText(txt.text, txt.x, txt.y - 1);
      }

      // Render interactive banners
      drawInteractiveBannersAndHUD(width, height);

      // Overlay Shop Popup Menu if open
      if (engine.farmingState.isDeporcusOpen) {
        drawDeporcusShopWindow(width, height);
      }

      // Overlay Seeding Popup if open
      if (engine.farmingState.activePlantingBedId !== null) {
        drawSeedPlantingWindow(width, height);
      }
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
      drawOrbitingCrops(p.x, p.y);

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

      // Draw all active Ropes
      for (const rope of engine.ropes) {
        let p1x = 0, p1y = 0;
        if (rope.obj1.type === 'wall') {
          p1x = rope.obj1.x;
          p1y = rope.obj1.y;
        } else if (rope.obj1.type === 'player') {
          p1x = engine.player.x + engine.player.width / 2;
          p1y = engine.player.y + engine.player.height / 2;
        } else if (rope.obj1.type === 'box') {
          const b = engine.boxes.find(box => box.id === rope.obj1.id);
          if (b) {
            p1x = b.x + rope.obj1.x;
            p1y = b.y + rope.obj1.y;
          }
        }

        let p2x = 0, p2y = 0;
        if (rope.obj2.type === 'wall') {
          p2x = rope.obj2.x;
          p2y = rope.obj2.y;
        } else if (rope.obj2.type === 'player') {
          p2x = engine.player.x + engine.player.width / 2;
          p2y = engine.player.y + engine.player.height / 2;
        } else if (rope.obj2.type === 'box') {
          const b = engine.boxes.find(box => box.id === rope.obj2.id);
          if (b) {
            p2x = b.x + rope.obj2.x;
            p2y = b.y + rope.obj2.y;
          }
        }

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#8b7355'; // Textured Rope Brown color
        ctx.lineWidth = 1.8;
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.stroke();

        ctx.fillStyle = '#ffcd75';
        ctx.beginPath();
        ctx.arc(p1x, p1y, 2, 0, Math.PI * 2);
        ctx.arc(p2x, p2y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw active Hookshot lines or cables
      if (engine.hookshot.state !== 'idle') {
        const px = engine.player.x + engine.player.width / 2;
        const py = engine.player.y + engine.player.height / 2;

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#b0c4de'; // Strong metal cable
        ctx.lineWidth = 1.3;
        ctx.moveTo(px, py);
        ctx.lineTo(engine.hookshot.x, engine.hookshot.y);
        ctx.stroke();

        ctx.fillStyle = '#36e5f0'; // Glowing magnetic energy head
        ctx.beginPath();
        ctx.arc(engine.hookshot.x, engine.hookshot.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Laser Cutter Beam with plasma neon glows
      if (engine.activeLaserBeam && engine.activeLaserBeam.life > 0) {
        const b = engine.activeLaserBeam;
        ctx.save();
        ctx.beginPath();
        // Outer glowing crimson plasma sleeve
        ctx.strokeStyle = 'rgba(255, 30, 80, 0.65)';
        ctx.lineWidth = 4.5 * b.life;
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();

        // Inner glowing white core
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 * b.life;
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();

        // Target hit heat sparks
        const hitScale = 1.0 + Math.sin(Date.now() * 0.05) * 0.3;
        ctx.fillStyle = '#ff1e50';
        ctx.beginPath();
        ctx.arc(b.x2, b.y2, 5 * hitScale * b.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Toolgun Anchor selection preview vectors
      if (engine.currentTool === 'toolgun' && engine.toolgunSelected) {
        let pX = 0, pY = 0;
        const s = engine.toolgunSelected;
        if (s.type === 'wall') {
          pX = s.x;
          pY = s.y;
        } else if (s.type === 'player') {
          pX = engine.player.x + s.x;
          pY = engine.player.y + s.y;
        } else if (s.type === 'box') {
          const b = engine.boxes.find(box => box.id === s.id);
          if (b) {
            pX = b.x + s.x;
            pY = b.y + s.y;
          }
        }

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(115, 239, 125, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.moveTo(pX, pY);
        ctx.lineTo(engine.dragJoint.mouseX, engine.dragJoint.mouseY);
        ctx.stroke();
        ctx.setLineDash([]);

        const scale = 1.0 + Math.sin(Date.now() * 0.015) * 0.25;
        ctx.fillStyle = '#73ef7d';
        ctx.beginPath();
        ctx.arc(pX, pY, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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
