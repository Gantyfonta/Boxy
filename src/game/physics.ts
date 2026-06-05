import { Box, Player, LootItem, Particle, FloatingText, PhysicsWorld, BoxType } from './types';
import { sound } from './sound';

const makeId = () => Math.random().toString(36).substring(2, 11);

export interface Portal {
  x: number;
  y: number;
  type: 'orange' | 'blue';
  angle: number; // facing direction (normal angle)
}

export interface PortalBullet {
  id: string;
  type: 'orange' | 'blue';
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export type GameRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface GameBox extends Box {
  rarity: GameRarity;
  teleportCooldown?: number;
}

export class GameEngine {
  public world: PhysicsWorld = {
    gravity: 0.28,
    friction: 0.85,
    airResistance: 0.99,
    width: 640,
    height: 360,
  };

  public player: Player = {
    x: 120,
    y: 200,
    vx: 0,
    vy: 0,
    width: 24,
    height: 32,
    facing: 'right',
    onGround: false,
    grabbingBox: null,
    state: 'idle',
    animFrame: 0,
    animTimer: 0,
  };

  public boxes: Box[] = []; // Standard Boxes casting
  public lootItems: LootItem[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public currentLevelGoal: string = "Load the cargo truck full with crates!";
  public isGoalCompleted: boolean = false;
  
  // Persistence Stats & Upgrades
  public coins: number = 0;
  public gems: number = 0;
  public truckCapacityUpgradeLevel: number = 0; // Cost increases per level
  public inventory: {
    cosmetics: string[];
    tools: string[];
    pets: string[];
  } = {
    cosmetics: [],
    tools: [],
    pets: [],
  };

  // Profile selections
  public currentCosmetic: string | null = null;
  public currentTool: string | null = null;
  public currentPet: string | null = null;

  // State Management
  public gameMode: 'lobby' | 'game_run' | 'loading' = 'lobby';
  public loadingProgress: number = 0;
  public loadingAction: () => void = () => {};
  public loadingText: string = "LOADING FACILITY SECTOR...";

  // Game Metrics
  public stats = {
    cratesStacked: 0,
    cratesOpened: 0,
    gemsCollected: 0,
    crownsFound: 0,
    explosionsTriggered: 0,
  };

  public selectedCrateType: BoxType = 'wood';
  public cameraShake: number = 0;

  // Spawner and dragging properties
  public dragJoint: {
    box: Box | null;
    offsetX: number;
    offsetY: number;
    mouseX: number;
    mouseY: number;
  } = {
    box: null,
    offsetX: 0,
    offsetY: 0,
    mouseX: 0,
    mouseY: 0,
  };

  // Run Dropper Crane properties
  public craneX: number = 320;
  public craneTargetX: number = 320;
  public craneY: number = 10;
  public nextDropTimer: number = 60;
  public activeDroppedRarity: GameRarity = 'common';

  // Game Run Cargo Truck properties
  public truckCargo: GameRarity[] = []; // Loaded cargo waiting to be unboxed in lobby
  public truckCargoCount: number = 0;

  // Portal Gun states
  public portals: {
    orange: Portal | null;
    blue: Portal | null;
  } = {
    orange: null,
    blue: null,
  };
  public portalBullets: PortalBullet[] = [];
  private playerTeleportCooldown: number = 0;

  // Pet movement coordinates
  public petX: number = 100;
  public petY: number = 200;

  public handleMouseDown(mx: number, my: number) {
    if (this.currentTool === 'mouse_cursor') {
      // Direct box picking detection
      for (const box of this.boxes) {
        if (mx >= box.x && mx <= box.x + box.width && my >= box.y && my <= box.y + box.height) {
          this.dragJoint.box = box;
          this.dragJoint.offsetX = mx - box.x;
          this.dragJoint.offsetY = my - box.y;
          this.dragJoint.mouseX = mx;
          this.dragJoint.mouseY = my;
          sound.playLift();
          break;
        }
      }
    }
  }

  public handleMouseMove(mx: number, my: number) {
    this.dragJoint.mouseX = mx;
    this.dragJoint.mouseY = my;
  }

  public handleMouseUp() {
    if (this.dragJoint.box) {
      sound.playThrow();
    }
    this.dragJoint.box = null;
  }

  constructor() {
    this.loadProfileFromStorage();
    this.setLobbyMode();
  }

  // Save/Load persistence system
  private loadProfileFromStorage() {
    try {
      const savedCoins = localStorage.getItem('sector7_coins');
      if (savedCoins !== null) this.coins = parseInt(savedCoins, 10);

      const savedGems = localStorage.getItem('sector7_gems');
      if (savedGems !== null) this.gems = parseInt(savedGems, 10);

      const savedTruckCapacity = localStorage.getItem('sector7_truck_upg');
      if (savedTruckCapacity !== null) this.truckCapacityUpgradeLevel = parseInt(savedTruckCapacity, 10);

      const savedCosmetics = localStorage.getItem('sector7_inv_cos');
      if (savedCosmetics) this.inventory.cosmetics = JSON.parse(savedCosmetics);

      const savedTools = localStorage.getItem('sector7_inv_tools');
      if (savedTools) this.inventory.tools = JSON.parse(savedTools);

      const savedPets = localStorage.getItem('sector7_inv_pets');
      if (savedPets) this.inventory.pets = JSON.parse(savedPets);

      // Current equips
      this.currentCosmetic = localStorage.getItem('sector7_eq_cos');
      this.currentTool = localStorage.getItem('sector7_eq_tool');
      this.currentPet = localStorage.getItem('sector7_eq_pet');

      // Default Unlocks if empty
      if (this.inventory.cosmetics.length === 0) {
        this.inventory.cosmetics = [];
      }
      if (this.inventory.tools.length === 0) {
        this.inventory.tools = []; // None equipped initially
      }
      if (this.inventory.pets.length === 0) {
        this.inventory.pets = [];
      }
    } catch (e) {
      console.warn("Storage reading bypassed", e);
    }
  }

  public saveProfileToStorage() {
    try {
      localStorage.setItem('sector7_coins', this.coins.toString());
      localStorage.setItem('sector7_gems', this.gems.toString());
      localStorage.setItem('sector7_truck_upg', this.truckCapacityUpgradeLevel.toString());
      localStorage.setItem('sector7_inv_cos', JSON.stringify(this.inventory.cosmetics));
      localStorage.setItem('sector7_inv_tools', JSON.stringify(this.inventory.tools));
      localStorage.setItem('sector7_inv_pets', JSON.stringify(this.inventory.pets));

      if (this.currentCosmetic) localStorage.setItem('sector7_eq_cos', this.currentCosmetic);
      else localStorage.removeItem('sector7_eq_cos');

      if (this.currentTool) localStorage.setItem('sector7_eq_tool', this.currentTool);
      else localStorage.removeItem('sector7_eq_tool');

      if (this.currentPet) localStorage.setItem('sector7_eq_pet', this.currentPet);
      else localStorage.removeItem('sector7_eq_pet');
    } catch (e) {
      console.warn("Saving failure", e);
    }
  }

  // Helpers to fetch current capabilities
  public getTruckCapacity(): number {
    return 3 + this.truckCapacityUpgradeLevel;
  }

  public getTruckUpgradeCost(): number {
    return 100 + this.truckCapacityUpgradeLevel * 150;
  }

  // Stage/Mode switch triggers
  public triggerLoadingScreen(text: string, duration: number, callback: () => void) {
    this.gameMode = 'loading';
    this.loadingProgress = 0;
    this.loadingText = text;
    this.loadingAction = callback;
    sound.playUnlock();
  }

  public setLobbyMode() {
    this.gameMode = 'lobby';
    this.boxes = [];
    this.lootItems = [];
    this.particles = [];
    this.floatingTexts = [];
    this.portals.orange = null;
    this.portals.blue = null;
    this.portalBullets = [];

    this.player.x = 240;
    this.player.y = 200;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.grabbingBox = null;

    // Load any boxes currently parked inside the cargo truck tray
    // Spawn them neatly inside the left truck area relative to cargo list!
    this.unloadLobbyCargo();

    // Initialize pet position to follow behind
    this.petX = this.player.x - 30;
    this.petY = this.player.y + 10;

    this.spawnFloatingText("FACILITY LOBBY ENTERED!", 320, 160, "#ffe385");
    sound.playLand();
  }

  private unloadLobbyCargo() {
    // If cargo is saved, stay on the truck and let player trigger unload manually
    // No action needed initially - the truck draw method will display cargo crates visual!
  }

  public startNewRun() {
    this.triggerLoadingScreen("CONNECTING TO CRANE SECTOR 7-B...", 120, () => {
      this.gameMode = 'game_run';
      this.boxes = [];
      this.lootItems = [];
      this.particles = [];
      this.floatingTexts = [];
      this.portals.orange = null;
      this.portals.blue = null;
      this.portalBullets = [];

      this.craneX = 320;
      this.craneTargetX = 200;
      this.craneY = 24;
      this.nextDropTimer = 45;

      this.truckCargoCount = 0;
      // We empty the lobby truck bed wait boxes but they are now our score targets
      this.truckCargo = [];

      this.player.x = 100;
      this.player.y = 200;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.grabbingBox = null;

      this.spawnFloatingText("RUN INITIATED! LOAD TRUCK!", 320, 150, "#ffe385");
      sound.playUnlock();
    });
  }

  public finishRunAndReturnHome() {
    this.triggerLoadingScreen("SECURED! RETURNING TO LOBBY...", 120, () => {
      this.setLobbyMode();
    });
  }

  // Spawns boxes on command with distinct rarity visual attributes
  public spawnCrateAt(x: number, y: number, type: BoxType, rarity: GameRarity = 'common'): Box | null {
    const boxSize = 24;
    const newBox: GameBox = {
      id: makeId(),
      type: type,
      x: Math.max(10, Math.min(this.world.width - boxSize - 10, x)),
      y: Math.max(10, Math.min(this.world.height - 32 - boxSize, y)),
      vx: 0,
      vy: 0,
      width: boxSize,
      height: boxSize,
      mass: type === 'metal' ? 3.0 : type === 'wood' ? 1.1 : type === 'tnt' ? 0.9 : type === 'present' ? 0.6 : 1.0,
      onGround: false,
      grabbed: false,
      isOpened: false,
      fuseTimer: null,
      health: type === 'wood' ? 2 : 10,
      angle: 0,
      angularVelocity: 0,
      squishX: 1.0,
      squishY: 1.0,
      rarity: rarity,
      teleportCooldown: 0
    };

    // Apply color shading based on distinct rarities
    if (rarity === 'common') {
      newBox.customColor = undefined; // natural
    } else if (rarity === 'rare') {
      newBox.customColor = 'rgba(79, 169, 255, 0.4)'; // electric blue wash
    } else if (rarity === 'epic') {
      newBox.customColor = 'rgba(206, 95, 252, 0.4)'; // deep violet wash
    } else if (rarity === 'legendary') {
      newBox.customColor = 'rgba(255, 205, 117, 0.4)'; // gold yellow wash
    }

    this.boxes.push(newBox);
    this.spawnDust(newBox.x + 12, newBox.y + 12, 4);
    return newBox;
  }

  // Handle Portal Gun shooting triggered by cursor
  public shootPortalGun(bulletType: 'orange' | 'blue', targetX: number, targetY: number) {
    if (this.currentTool !== 'portal_gun') return;

    sound.playTone(380, 520, 0.08, "triangle", 0.4);

    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + 10;
    
    // Vector arithmetic for trajectory
    const dx = targetX - px;
    const dy = targetY - py;
    const dist = Math.hypot(dx, dy);

    if (dist > 2) {
      const speed = 10.0;
      this.portalBullets.push({
        id: makeId(),
        type: bulletType,
        x: px,
        y: py,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
      });

      // Recoil
      this.player.vx -= (dx / dist) * 0.8;
    }
  }

  private updatePortalBullets() {
    this.portalBullets = this.portalBullets.filter(b => {
      // Step position
      b.x += b.vx;
      b.y += b.vy;

      // Sparkles
      if (Math.random() < 0.4) {
        this.particles.push({
          id: makeId(),
          type: 'sparkle',
          x: b.x,
          y: b.y,
          vx: Math.random() * 1 - 0.5,
          vy: Math.random() * 1 - 0.5,
          color: b.type === 'orange' ? '#ef7d57' : '#4fa9ff',
          size: Math.random() * 2 + 1,
          life: 0.8,
          decay: 0.08,
          angle: 0,
          angularVelocity: 0
        });
      }

      // Check collision with outer bounds
      const hitTolerance = 4;
      const groundY = this.world.height - 32;

      let hitSurface = false;
      let angle = 0;

      if (b.x <= 8) {
        b.x = 8; hitSurface = true; angle = 0; // right-facing
      } else if (b.x >= this.world.width - 8) {
        b.x = this.world.width - 8; hitSurface = true; angle = Math.PI; // left-facing
      } else if (b.y <= 4) {
        b.y = 4; hitSurface = true; angle = Math.PI / 2; // downward-facing
      } else if (b.y >= groundY) {
        b.y = groundY; hitSurface = true; angle = -Math.PI / 2; // upward-facing
      }

      // Check hits with boxes in sandbox space
      for (const box of this.boxes) {
        if (b.x >= box.x && b.x <= box.x + box.width && b.y >= box.y && b.y <= box.y + box.height) {
          hitSurface = true;
          angle = Math.atan2(b.y - (box.y + box.height/2), b.x - (box.x + box.width/2));
          break;
        }
      }

      if (hitSurface) {
        // Place portal!
        const p: Portal = {
          x: Math.max(12, Math.min(this.world.width - 12, b.x)),
          y: Math.max(12, Math.min(groundY, b.y)),
          type: b.type,
          angle: angle,
        };
        this.portals[b.type] = p;

        // Play portal spark chime noise
        sound.playUnlock();
        this.spawnDust(p.x, p.y, 8);

        // Splashes
        for (let i = 0; i < 12; i++) {
          const spAngle = Math.random() * Math.PI * 2;
          const spSpeed = Math.random() * 3 + 1;
          this.particles.push({
            id: makeId(),
            type: 'star',
            x: p.x,
            y: p.y,
            vx: Math.cos(spAngle) * spSpeed,
            vy: Math.sin(spAngle) * spSpeed,
            color: b.type === 'orange' ? '#ef7d57' : '#4fa9ff',
            size: Math.random() * 3 + 1,
            life: 1.0,
            decay: 0.05,
            angle: 0,
            angularVelocity: 0
          });
        }
        return false; // delete bullet
      }

      // Delete if out of world
      return (b.x >= 0 && b.x <= this.world.width && b.y >= 0 && b.y <= this.world.height);
    });
  }

  // Teleport warping loops
  private updatePortalTeleportation() {
    const oPort = this.portals.orange;
    const bPort = this.portals.blue;

    if (!oPort || !bPort) return;

    if (this.playerTeleportCooldown > 0) this.playerTeleportCooldown--;

    const warpOffset = 18; // push out offset to prevent feedback loops

    // Player check
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    if (this.playerTeleportCooldown === 0) {
      if (Math.hypot(px - oPort.x, py - oPort.y) < 22) {
        // Teleport to Blue!
        this.player.x = bPort.x - this.player.width / 2 + Math.cos(bPort.angle) * warpOffset;
        this.player.y = bPort.y - this.player.height / 2 + Math.sin(bPort.angle) * warpOffset;
        
        // conserve speed but rotate vector to portal direction
        const speed = Math.hypot(this.player.vx, this.player.vy);
        this.player.vx = Math.cos(bPort.angle) * Math.max(1.8, speed * 1.1);
        this.player.vy = Math.sin(bPort.angle) * Math.max(1.8, speed * 1.1);
        this.playerTeleportCooldown = 30; // buffer frames
        sound.playUnlock();
        this.spawnDust(bPort.x, bPort.y, 8);
      } else if (Math.hypot(px - bPort.x, py - bPort.y) < 22) {
        // Teleport to Orange!
        this.player.x = oPort.x - this.player.width / 2 + Math.cos(oPort.angle) * warpOffset;
        this.player.y = oPort.y - this.player.height / 2 + Math.sin(oPort.angle) * warpOffset;
        
        const speed = Math.hypot(this.player.vx, this.player.vy);
        this.player.vx = Math.cos(oPort.angle) * Math.max(1.8, speed * 1.1);
        this.player.vy = Math.sin(oPort.angle) * Math.max(1.8, speed * 1.1);
        this.playerTeleportCooldown = 30;
        sound.playUnlock();
        this.spawnDust(oPort.x, oPort.y, 8);
      }
    }

    // Boxes check
    for (const box of this.boxes) {
      const gBox = box as GameBox;
      if (gBox.teleportCooldown && gBox.teleportCooldown > 0) {
        gBox.teleportCooldown--;
        continue;
      }

      const bx = box.x + box.width / 2;
      const by = box.y + box.height / 2;

      if (Math.hypot(bx - oPort.x, by - oPort.y) < 18) {
        // Teleport to Blue
        box.x = bPort.x - box.width / 2 + Math.cos(bPort.angle) * warpOffset;
        box.y = bPort.y - box.height / 2 + Math.sin(bPort.angle) * warpOffset;
        
        const speed = Math.hypot(box.vx, box.vy);
        box.vx = Math.cos(bPort.angle) * Math.max(2.0, speed * 1.1);
        box.vy = Math.sin(bPort.angle) * Math.max(2.0, speed * 1.1);
        box.onGround = false;
        gBox.teleportCooldown = 30;
        sound.playUnlock();
        this.spawnDust(bPort.x, bPort.y, 6);
      } else if (Math.hypot(bx - bPort.x, by - bPort.y) < 18) {
        // Teleport to Orange
        box.x = oPort.x - box.width / 2 + Math.cos(oPort.angle) * warpOffset;
        box.y = oPort.y - box.height / 2 + Math.sin(oPort.angle) * warpOffset;
        
        const speed = Math.hypot(box.vx, box.vy);
        box.vx = Math.cos(oPort.angle) * Math.max(2.0, speed * 1.1);
        box.vy = Math.sin(oPort.angle) * Math.max(2.0, speed * 1.1);
        box.onGround = false;
        gBox.teleportCooldown = 30;
        sound.playUnlock();
        this.spawnDust(oPort.x, oPort.y, 6);
      }
    }
  }

  // Manual Trigger Unload from high Lobby truck
  public tryUnloadCargoFromLobbyTruck() {
    if (this.gameMode !== 'lobby') return;
    if (this.truckCargo.length === 0) return;

    sound.playLift();

    // Pop the first cargo box from truckbed
    const rarity = this.truckCargo.pop()!;
    this.saveProfileToStorage();

    // Spawn box sitting right behind the truck on lobby floor
    // Lobby truck visual is parked at left, X: 45
    const typeMap: { [key in GameRarity]: BoxType } = {
      common: 'wood',
      rare: 'metal',
      epic: 'present',
      legendary: 'hover'
    };
    const bType = typeMap[rarity] || 'wood';

    // Slide box down gently from back cargo bed: X:45, Y: Y floor
    this.spawnCrateAt(60, 200, bType, rarity);
    this.spawnFloatingText(`UNLOADED ${rarity.toUpperCase()} BOX!`, 100, 240, "#73ef7d");
  }

  // Update Game Dropping Crane slider & Truck mechanics
  private updateGameRun() {
    this.world.width = 640;

    // 1. Crane Slider
    this.craneX += (this.craneTargetX - this.craneX) * 0.04;

    this.nextDropTimer--;
    if (this.nextDropTimer <= 0) {
      this.nextDropTimer = 160 + Math.random() * 60; // 3-4s random ticks
      
      // Select new target spot, making sure it drops boxes away from immediate truck bed zone
      this.craneTargetX = 50 + Math.random() * (this.world.width - 180);

      // Random selection weights according to clover tool enhancement level!
      const hasShamrock = this.currentTool === 'shamrock';
      let rType: GameRarity = 'common';
      const rng = Math.random();

      if (hasShamrock) {
        // Boosted prestige weights!
        if (rng < 0.15) rType = 'legendary';
        else if (rng < 0.50) rType = 'epic';
        else if (rng < 0.85) rType = 'rare';
        else rType = 'common';
      } else {
        // Vanilla weights
        if (rng < 0.03) rType = 'legendary';
        else if (rng < 0.15) rType = 'epic';
        else if (rng < 0.40) rType = 'rare';
        else rType = 'common';
      }

      this.activeDroppedRarity = rType;

      // Drop crate right from crane vertical nozzle down!
      const mapBoxTypes: { [key in GameRarity]: BoxType } = {
        common: 'wood',
        rare: 'metal',
        epic: 'present',
        legendary: 'hover'
      };
      
      this.spawnCrateAt(this.craneX - 12, this.craneY + 12, mapBoxTypes[rType], rType);
      
      // Chime ticks and sparks
      sound.playTone(320, 240, 0.1, "triangle", 0.4);
      this.spawnFloatingText("BOX RETRIEVED!", this.craneX, 50, "#ffe385");
    }

    // 2. Cargo Bed Collision loading checks
    const targetCapacity = this.getTruckCapacity();
    const truckBedLeft = this.world.width - 105;
    const truckBedRight = this.world.width - 25;
    const truckBedTop = this.world.height - 68;
    const truckBedBottom = this.world.height - 32;

    // Detect if boxes of different types overlap fully inside cargo bed zone
    for (const box of this.boxes) {
      if (box.grabbed) continue;

      const bx = box.x + box.width / 2;
      const by = box.y + box.height / 2;

      if (bx >= truckBedLeft && bx <= truckBedRight && by >= truckBedTop && by <= truckBedBottom) {
        // Box loaded successfully!
        const gBox = box as GameBox;
        this.truckCargo.push(gBox.rarity);
        this.truckCargoCount++;

        this.boxes = this.boxes.filter(b => b.id !== box.id);
        sound.playChime();
        sound.playKeyCollect();
        
        let overlayColor = '#73ef7d';
        if (gBox.rarity === 'rare') overlayColor = '#4fa9ff';
        if (gBox.rarity === 'epic') overlayColor = '#ce5ffc';
        if (gBox.rarity === 'legendary') overlayColor = '#ffcd75';

        this.spawnFloatingText(`+1 ${gBox.rarity.toUpperCase()} CARGO LOADED (${this.truckCargoCount}/${targetCapacity})`, bx, by - 20, overlayColor);

        // Sparks fly
        for (let i = 0; i < 15; i++) {
          const spAngle = Math.random() * Math.PI * 2;
          const spSpeed = Math.random() * 4 + 1;
          this.particles.push({
            id: makeId(),
            type: 'star',
            x: bx,
            y: by,
            vx: Math.cos(spAngle) * spSpeed,
            vy: Math.sin(spAngle) * spSpeed,
            color: overlayColor,
            size: Math.random() * 4 + 2,
            life: 1.0,
            decay: 0.04,
            angle: 0,
            angularVelocity: 0
          });
        }

        // Save profile
        this.saveProfileToStorage();

        // Check completion check
        if (this.truckCargoCount >= targetCapacity) {
          // Finished perfectly!
          this.cameraShake = 10;
          this.isGoalCompleted = true;
          this.spawnFloatingText("TRUCK LOADED! RETURNING TO LOBBY...", 320, 180, "#73ef7d");

          setTimeout(() => {
            this.finishRunAndReturnHome();
          }, 2000);
        }
      }
    }
  }

  // Lobby limits and transitions checks
  private updateLobby() {
    this.world.width = 640;

    // Check Start Portal gate walking interactions
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    const startZoneX = 520;

    if (Math.hypot(px - startZoneX, py - (this.world.height - 48)) < 22) {
      // Trigger game starting run automatically when they step on it!
      this.player.x = 240; // recoil back
      this.startNewRun();
    }
  }

  // Loading Screen Progression Tick
  private updateLoading() {
    this.loadingProgress += 1.35; // speed factors
    if (this.loadingProgress >= 100) {
      this.loadingProgress = 100;
      const cachedAction = this.loadingAction;
      this.loadingAction = () => {};
      cachedAction();
    }
  }

  // Update companion follow patterns
  private updatePets() {
    if (!this.currentPet) return;

    // Interpolate pet placement nicely behind the player
    const walkDirection = this.player.facing === 'left' ? 1 : -1;
    let targetX = this.player.x + walkDirection * 24;

    // Floating offsets for robots or fish, sitting high up
    let targetY = this.player.y + 12;
    if (this.currentPet === 'robot' || this.currentPet === 'fish') {
      targetY = this.player.y - 12 + Math.sin(Date.now() * 0.005) * 4;
    } else {
      // dog / cat sits flat on ground
      targetY = this.world.height - 32 - 16;
    }

    this.petX += (targetX - this.petX) * 0.09;
    this.petY += (targetY - this.petY) * 0.09;

    // Spawn tiny pet specific bubbles/spark particles
    if (Math.random() < 0.12) {
      let petSparkColor = '#73ef7d';
      let petSparkType: 'sparkle' | 'smoke' | 'star' = 'sparkle';
      if (this.currentPet === 'robot') {
        petSparkColor = '#36e5f0'; petSparkType = 'smoke';
      } else if (this.currentPet === 'fish') {
        petSparkColor = '#4fa9ff'; petSparkType = 'sparkle';
      } else if (this.currentPet === 'cat') {
        petSparkColor = '#ff8be6'; petSparkType = 'star';
      } else {
        petSparkColor = '#df9c5c'; petSparkType = 'sparkle';
      }

      this.particles.push({
        id: makeId(),
        type: petSparkType,
        x: this.petX + 6 + Math.random() * 4,
        y: this.petY + 6 + Math.random() * 4,
        vx: 0,
        vy: -0.2,
        color: petSparkColor,
        size: Math.random() * 2 + 1,
        life: 0.8,
        decay: 0.08,
        angle: 0,
        angularVelocity: 0
      });
    }
  }

  // Upgrade Purchase methods
  public purchaseTruckCapacity(): boolean {
    const cost = this.getTruckUpgradeCost();
    if (this.coins >= cost) {
      this.coins -= cost;
      this.truckCapacityUpgradeLevel++;
      this.saveProfileToStorage();
      sound.playKeyCollect();
      return true;
    }
    return false;
  }

  public purchaseToolUnlock(toolName: string, coinCost: number, gemCost: number = 0): boolean {
    if (this.coins >= coinCost && this.gems >= gemCost) {
      this.coins -= coinCost;
      this.gems -= gemCost;
      this.inventory.tools.push(toolName);
      this.currentTool = toolName; // Auto equip
      this.saveProfileToStorage();
      sound.playUnlock();
      return true;
    }
    return false;
  }

  public purchaseCosmeticUnlock(cosName: string, coinCost: number): boolean {
    if (this.coins >= coinCost) {
      this.coins -= coinCost;
      this.inventory.cosmetics.push(cosName);
      this.currentCosmetic = cosName;
      this.saveProfileToStorage();
      sound.playUnlock();
      return true;
    }
    return false;
  }

  public purchasePetUnlock(petName: string, gemCost: number): boolean {
    if (this.gems >= gemCost) {
      this.gems -= gemCost;
      this.inventory.pets.push(petName);
      this.currentPet = petName;
      this.saveProfileToStorage();
      sound.playUnlock();
      return true;
    }
    return false;
  }

  public toggleEquipCosmetic(id: string) {
    if (this.currentCosmetic === id) {
      this.currentCosmetic = null;
    } else {
      this.currentCosmetic = id;
    }
    this.saveProfileToStorage();
    sound.playTick();
  }

  public toggleEquipTool(id: string) {
    if (this.currentTool === id) {
      this.currentTool = null;
    } else {
      this.currentTool = id;
    }
    this.saveProfileToStorage();
    sound.playTick();
  }

  public toggleEquipPet(id: string) {
    if (this.currentPet === id) {
      this.currentPet = null;
    } else {
      this.currentPet = id;
    }
    this.saveProfileToStorage();
    sound.playTick();
  }

  // Overwritten base engine methods
  public resetLevel() {
    this.setLobbyMode();
  }

  public tryGrabBox() {
    if (this.player.grabbingBox) {
      this.dropBox();
      return;
    }

    let closestBox: Box | null = null;
    let minDist = 45;

    for (const b of this.boxes) {
      if (b.isOpened) continue;
      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      const dist = Math.hypot(bx - px, by - py);

      if (dist < minDist) {
        minDist = dist;
        closestBox = b;
      }
    }

    if (closestBox) {
      closestBox.grabbed = true;
      closestBox.onGround = false;
      closestBox.vx = 0;
      closestBox.vy = 0;
      this.player.grabbingBox = closestBox;
      sound.playLift();
      this.spawnFloatingText("LIFT", closestBox.x + 12, closestBox.y - 10, "#4fa9ff");
    }
  }

  public dropBox() {
    const box = this.player.grabbingBox;
    if (!box) return;

    box.grabbed = false;
    const direction = this.player.facing === 'left' ? -1 : 1;
    box.x = this.player.x + (direction * 22);
    box.y = this.player.y;
    box.vx = direction * 1.5;
    box.vy = -1.0;
    
    box.x = Math.max(10, Math.min(this.world.width - box.width - 10, box.x));

    this.player.grabbingBox = null;
    sound.playThrow();
    this.spawnFloatingText("PLACE", box.x + 12, box.y - 10, "#94a3b8");
  }

  public throwBox() {
    const box = this.player.grabbingBox;
    if (!box) return;

    box.grabbed = false;
    const direction = this.player.facing === 'left' ? -1 : 1;
    
    box.x = this.player.x + (direction * 18);
    box.y = this.player.y - 6;
    box.vx = direction * 5.2 + this.player.vx * 0.5;
    box.vy = -4.2;
    box.angularVelocity = direction * (Math.random() * 0.15 + 0.1);
    
    box.squishX = 0.7;
    box.squishY = 1.4;

    this.player.grabbingBox = null;
    sound.playThrow();
    this.spawnFloatingText("THROW!", box.x + 12, box.y - 10, "#ef7d57");
  }

  public tryOpenBox() {
    let target: Box | null = null;
    let minDist = 48;

    for (const b of this.boxes) {
      if (b.grabbed || b.isOpened) continue;

      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      const dist = Math.hypot((b.x + b.width / 2) - px, (b.y + b.height / 2) - py);

      if (dist < minDist) {
        minDist = dist;
        target = b;
      }
    }

    if (target) {
      this.openBox(target);
    }
  }

  public openBox(box: Box) {
    if (box.isOpened) return;

    sound.playBubble();
    sound.playChime();
    this.spawnDust(box.x + 12, box.y + 12, 10);
    this.spawnSplinters(box.x + 12, box.y + 12, '#df9c5c', 8);

    // Give satisfying unboxing loot based on exact rarity!
    const gBox = box as GameBox;
    const isLobbyMode = this.gameMode === 'lobby';

    let lootCoins = 0;
    let lootGems = 0;
    let unlockedRewardName: string | null = null;
    let unlockedType: 'cosmetic' | 'tool' | 'pet' | null = null;

    if (gBox.rarity === 'common') {
      lootCoins = Math.floor(Math.random() * 25) + 20; // 20 - 45
      if (Math.random() < 0.25) {
        unlockedType = 'cosmetic';
        const pools = ['hat', 'glasses'];
        unlockedRewardName = pools[Math.floor(Math.random() * pools.length)];
      }
    } else if (gBox.rarity === 'rare') {
      lootCoins = Math.floor(Math.random() * 45) + 40; // 40 - 85
      lootGems = Math.floor(Math.random() * 3) + 1; // 1 - 3
      if (Math.random() < 0.22) {
        unlockedType = 'pet';
        unlockedRewardName = 'dog';
      } else if (Math.random() < 0.22) {
        unlockedType = 'cosmetic';
        unlockedRewardName = 'hair';
      }
    } else if (gBox.rarity === 'epic') {
      lootCoins = Math.floor(Math.random() * 80) + 70; // 70 - 150
      lootGems = Math.floor(Math.random() * 6) + 3; // 3 - 8
      if (Math.random() < 0.35) {
        unlockedType = 'pet';
        const pools = ['cat', 'fish'];
        unlockedRewardName = pools[Math.floor(Math.random() * pools.length)];
      }
    } else if (gBox.rarity === 'legendary') {
      lootCoins = Math.floor(Math.random() * 200) + 150; // 150 - 350
      lootGems = Math.floor(Math.random() * 15) + 10; // 10 - 25
      if (Math.random() < 0.50) {
        unlockedType = 'pet';
        unlockedRewardName = 'robot';
      } else {
        unlockedType = 'cosmetic';
        unlockedRewardName = 'crown';
      }
    }

    // Apply Loot yields to player profile
    this.coins += lootCoins;
    this.gems += lootGems;

    let lootMessage = `+${lootCoins} COINS`;
    if (lootGems > 0) lootMessage += ` & +${lootGems} GEMS`;
    this.spawnFloatingText(lootMessage, box.x + 12, box.y - 12, "#73ef7d");

    // Spawn flight gems and coin assets as visual cues!
    for (let i = 0; i < Math.min(5, Math.ceil(lootCoins/15)); i++) {
      this.spawnLoot(box.x + 6, box.y - 6, 'coin');
    }
    for (let i = 0; i < Math.min(4, lootGems); i++) {
       this.spawnLoot(box.x + 6, box.y - 6, 'gem_blue');
    }

    if (unlockedRewardName && unlockedType) {
      // Validate duplicates
      let isDuplicate = false;
      if (unlockedType === 'cosmetic') {
        if (this.inventory.cosmetics.includes(unlockedRewardName)) isDuplicate = true;
        else this.inventory.cosmetics.push(unlockedRewardName);
      } else if (unlockedType === 'pet') {
        if (this.inventory.pets.includes(unlockedRewardName)) isDuplicate = true;
        else this.inventory.pets.push(unlockedRewardName);
      }

      if (isDuplicate) {
        // Award duplicate payout
        this.coins += 100;
        this.gems += 2;
        this.spawnFloatingText(`DUPLICATE ${unlockedRewardName.toUpperCase()} (+100 COINS, +2 GEMS)`, box.x + 12, box.y - 24, "#ffcd75");
      } else {
        this.spawnFloatingText(`★ UNLOCKED ${unlockedRewardName.toUpperCase()}! ★`, box.x + 12, box.y - 24, "#ff8be6");
        // Sparks
        for (let i = 0; i < 20; i++) {
          const spAngle = Math.random() * Math.PI * 2;
          const spSpeed = Math.random() * 5 + 1;
          this.particles.push({
            id: makeId(),
            type: 'star',
            x: box.x + 12,
            y: box.y + 12,
            vx: Math.cos(spAngle) * spSpeed,
            vy: Math.sin(spAngle) * spSpeed,
            color: '#ff8be6',
            size: Math.random() * 4 + 2,
            life: 1.0,
            decay: 0.04,
            angle: 0,
            angularVelocity: 0
          });
        }
      }
    }

    // Done opening crate, remove it from rendering vectors list
    this.boxes = this.boxes.filter(b => b.id !== box.id);
    this.stats.cratesOpened++;
    this.saveProfileToStorage();
  }

  private spawnLoot(x: number, y: number, type: 'gem_red' | 'gem_blue' | 'gem_green' | 'coin' | 'key' | 'crown') {
    this.lootItems.push({
      id: makeId(),
      type,
      x,
      y,
      vx: Math.random() * 3 - 1.5,
      vy: -(Math.random() * 4 + 3),
      width: 12,
      height: 12,
      angle: Math.random() * Math.PI,
      angularVelocity: Math.random() * 0.15 - 0.07,
      onGround: false,
      bounceCount: 0,
      shineTimer: 0
    });
  }

  // Physics subroutines
  public update() {
    this.updateCameraShake();
    
    if (this.gameMode === 'loading') {
      this.updateLoading();
      return;
    }

    // Projectile laser shots physics
    this.updatePortalBullets();

    // Standard kinetic steps
    this.updatePlayerMovement();
    
    if (this.gameMode === 'game_run') {
      this.updateGameRun();
    } else if (this.gameMode === 'lobby') {
      this.updateLobby();
    }

    this.updateCratesPhysics();

    // Portal zip warpers checks
    this.updatePortalTeleportation();

    this.updateLootItemsPhysics();
    this.updateParticles();
    this.updateFloatingTexts();
    this.updatePets();
  }

  private updateCameraShake() {
    if (this.cameraShake > 0) {
      this.cameraShake -= 0.65;
      if (this.cameraShake < 0) this.cameraShake = 0;
    }
  }

  private updatePlayerMovement() {
    const p = this.player;
    p.vy += this.world.gravity;
    p.y += p.vy;

    const groundY = this.world.height - 32;
    if (p.y + p.height >= groundY) {
      p.y = groundY - p.height;
      if (p.vy > 1.5) {
        sound.playLand();
        this.spawnDust(p.x + p.width / 2, groundY, 3);
      }
      p.vy = 0;
      p.onGround = true;
    }

    if (p.x < 10) {
      p.x = 10;
      p.vx = 0;
    } else if (p.x + p.width > this.world.width - 10) {
      p.x = this.world.width - p.width - 10;
      p.vx = 0;
    }

    p.vx *= this.world.friction;
    p.x += p.vx;

    if (p.grabbingBox) {
      p.grabbingBox.x = p.x + (p.width - p.grabbingBox.width) / 2;
      p.grabbingBox.y = p.y - p.grabbingBox.height + 4;
      p.grabbingBox.vx = p.vx;
      p.grabbingBox.vy = p.vy;
    }

    p.animTimer++;
    if (Math.abs(p.vx) > 0.5) {
      p.state = p.grabbingBox ? 'grab_walk' : 'walk';
      if (p.animTimer % 6 === 0) {
        p.animFrame = (p.animFrame + 1) % 4;
      }
    } else {
      p.state = p.grabbingBox ? 'grab_idle' : 'idle';
      if (p.animTimer % 35 === 0) {
        p.animFrame = (p.animFrame + 1) % 2;
      }
    }

    if (!p.onGround) p.state = 'jump';
  }

  private updateCratesPhysics() {
    const solverPasses = 5;

    for (const b of this.boxes) {
      if (b.grabbed) continue;

      if (this.currentTool === 'mouse_cursor' && this.dragJoint.box?.id === b.id) {
        const targetX = this.dragJoint.mouseX - this.dragJoint.offsetX;
        const targetY = this.dragJoint.mouseY - this.dragJoint.offsetY;

        b.vx = (targetX - b.x) * 0.35;
        b.vy = (targetY - b.y) * 0.35;
        b.squishX = 1.0 - Math.min(0.2, Math.abs(b.vx) * 0.02);
        b.squishY = 1.0 + Math.min(0.3, Math.abs(b.vy) * 0.02);
      } else {
        if (b.type === 'hover') {
          b.vy *= 0.85;
          b.vx *= this.world.friction;
        } else {
          b.vy += this.world.gravity;
          b.vx *= this.world.friction;
        }
      }

      b.x += b.vx;
      b.y += b.vy;

      if (b.type === 'tnt' && b.fuseTimer !== null) {
        b.fuseTimer--;
        b.squishX = 1.0 + Math.sin(b.fuseTimer * 0.4) * 0.12;
        b.squishY = 1.0 - Math.sin(b.fuseTimer * 0.4) * 0.12;

        if (b.fuseTimer % 12 === 0 && b.fuseTimer > 0) {
          sound.playTick();
        }

        if (Math.random() < 0.4) {
          this.particles.push({
            id: makeId(),
            type: 'sparkle',
            x: b.x + 12 + (Math.random() * 8 - 4),
            y: b.y - 2,
            vx: Math.random() * 1.5 - 0.75,
            vy: -Math.random() * 2,
            color: '#ffe385',
            size: Math.random() * 3 + 1,
            life: 1.0,
            decay: 0.04,
            angle: 0,
            angularVelocity: 0,
            gravityAffect: true
          });
        }

        if (b.fuseTimer <= 0) {
          this.explodeTnt(b);
          continue;
        }
      }

      if (!b.onGround && Math.abs(b.vx) > 0.5) {
        b.angle += b.angularVelocity;
      } else {
        b.angle *= 0.85;
      }

      b.squishX += (1.0 - b.squishX) * 0.14;
      b.squishY += (1.0 - b.squishY) * 0.14;

      if (b.x < 10) {
        b.x = 10;
        b.vx = -b.vx * 0.25;
        b.squishX = 0.75; b.squishY = 1.25;
      } else if (b.x + b.width > this.world.width - 10) {
        b.x = this.world.width - b.width - 10;
        b.vx = -b.vx * 0.25;
        b.squishX = 0.75; b.squishY = 1.25;
      }

      const groundY = this.world.height - 32;
      if (b.y + b.height >= groundY) {
        const fallSpeed = b.vy;
        b.y = groundY - b.height;
        b.vy = 0;
        b.onGround = true;

        if (fallSpeed > 1.2) {
          b.squishX = 1.35; b.squishY = 0.68;
          this.spawnDust(b.x + 12, b.y + b.height, Math.min(6, Math.floor(fallSpeed * 1.5)));
          sound.playLand();
        }
      } else {
        b.onGround = false;
      }
    }

    this.solvePlayerBoxInteraction();

    for (let pass = 0; pass < solverPasses; pass++) {
      for (let i = 0; i < this.boxes.length; i++) {
        const b1 = this.boxes[i];
        if (b1.grabbed) continue;

        for (let j = i + 1; j < this.boxes.length; j++) {
          const b2 = this.boxes[j];
          if (b2.grabbed) continue;

          this.resolveBoxToBoxCollision(b1, b2);
        }
      }
    }
  }

  private resolveBoxToBoxCollision(b1: Box, b2: Box) {
    const oX = (b1.x + b1.width / 2) - (b2.x + b2.width / 2);
    const oY = (b1.y + b1.height / 2) - (b2.y + b2.height / 2);
    const halfW = (b1.width + b2.width) / 2;
    const halfH = (b1.height + b2.height) / 2;

    const absX = Math.abs(oX);
    const absY = Math.abs(oY);

    if (absX < halfW && absY < halfH) {
      const penX = halfW - absX;
      const penY = halfH - absY;
      
      const m1 = b1.type === 'hover' ? 999 : b1.mass;
      const m2 = b2.type === 'hover' ? 999 : b2.mass;
      const tot = m1 + m2;
      const bounceE = b1.type === 'present' || b2.type === 'present' ? 0.48 : 0.08;

      if (penX < penY) {
        const dir = oX > 0 ? 1 : -1;
        b1.x += penX * dir * (m2 / tot);
        b2.x -= penX * dir * (m1 / tot);

        const relVel = (b1.vx - b2.vx) * dir;
        if (relVel < 0) {
          const j = -(1 + bounceE) * relVel;
          b1.vx += j * dir * (m2 / tot);
          b2.vx -= j * dir * (m1 / tot);
        }
      } else {
        const dir = oY > 0 ? 1 : -1;
        b1.y += penY * dir * (m2 / tot);
        b2.y -= penY * dir * (m1 / tot);

        const relVel = (b1.vy - b2.vy) * dir;
        if (relVel < 0) {
          const j = -(1 + bounceE) * relVel;
          b1.vy += j * dir * (m2 / tot);
          b2.vy -= j * dir * (m1 / tot);
        }

        // Apply friction
        const relVelX = b1.vx - b2.vx;
        const friction = 0.15;
        b1.vx -= relVelX * friction * (m2 / tot);
        b2.vx += relVelX * friction * (m1 / tot);

        if (dir === -1) {
          b1.onGround = true;
        } else {
          b2.onGround = true;
        }
      }
    }
  }

  private solvePlayerBoxInteraction() {
    const p = this.player;

    for (const b of this.boxes) {
      if (b.grabbed) continue;

      const px = p.x + p.width / 2;
      const py = p.y + p.height / 2;
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;

      const halfW = (p.width + b.width) / 2;
      const halfH = (p.height + b.height) / 2;

      const dX = px - bx;
      const dY = py - by;

      if (Math.abs(dX) < halfW && Math.abs(dY) < halfH) {
        const penX = halfW - Math.abs(dX);
        const penY = halfH - Math.abs(dY);

        if (penX < penY) {
          const dir = dX > 0 ? 1 : -1;
          if (b.type === 'hover') {
            b.x -= penX * dir;
            b.vx = p.vx * 0.9;
          } else {
            const pushability = 0.75 / b.mass;
            b.x -= penX * dir * 0.8;
            b.vx = p.vx * pushability;
            p.x += penX * dir * 0.2;
          }
        } else {
          const dir = dY > 0 ? 1 : -1;
          if (dir === 1) {
            p.y = b.y - p.height;
            if (p.vy > 1.5) {
              sound.playLand();
              this.spawnDust(p.x + p.width / 2, b.y, 2);
            }
            p.vy = 0;
            p.onGround = true;
          } else {
            p.y = b.y + b.height;
            p.vy = Math.max(0, p.vy);
            b.vy = -1.2;
            b.onGround = false;
            sound.playSplat();
          }
        }
      }
    }
  }

  private updateLootItemsPhysics() {
    const groundY = this.world.height - 32;

    for (const item of this.lootItems) {
      item.vy += this.world.gravity;
      item.vx *= this.world.airResistance;

      item.x += item.vx;
      item.y += item.vy;

      item.angle += item.angularVelocity;
      item.shineTimer++;

      if (item.x < 10) {
        item.x = 10;
        item.vx = -item.vx * 0.6;
      } else if (item.x + item.width > this.world.width - 10) {
        item.x = this.world.width - item.width - 10;
        item.vx = -item.vx * 0.6;
      }

      if (item.y + item.height >= groundY) {
        item.y = groundY - item.height;
        if (item.vy > 1.0 && item.bounceCount < 3) {
          item.vy = -item.vy * 0.52;
          item.vx *= 0.6;
          item.bounceCount++;
        } else {
          item.vy = 0;
          item.vx = 0;
          item.onGround = true;
        }
      }

      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      const dist = Math.hypot((item.x + item.width / 2) - px, (item.y + item.height / 2) - py);

      if (dist < 40) {
        if (dist > 8) {
          const moveAngle = Math.atan2(py - (item.y + item.height / 2), px - (item.x + item.width / 2));
          item.x += Math.cos(moveAngle) * 4.4;
          item.y += Math.sin(moveAngle) * 4.4;
        } else {
          this.collectLoot(item);
        }
      }
    }
  }

  private collectLoot(item: LootItem) {
    sound.playTone(550, 750, 0.08, "sine", 0.5);

    if (item.type === 'coin') {
      this.coins += 25;
      this.spawnFloatingText("+25 COINS", item.x, item.y - 12, "#ffcd75");
    } else {
      this.gems += 1;
      this.spawnFloatingText("+1 GEM", item.x, item.y - 12, "#4fa9ff");
    }

    // Sparkles
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        id: makeId(),
        type: 'star',
        x: item.x + 6,
        y: item.y + 6,
        vx: Math.random() * 2 - 1,
        vy: -Math.random() * 2 - 1,
        color: '#fffd73',
        size: Math.random() * 4 + 2,
        life: 1.0,
        decay: 0.04,
        angle: 0,
        angularVelocity: 0,
        gravityAffect: false
      });
    }

    this.lootItems = this.lootItems.filter(i => i.id !== item.id);
    this.saveProfileToStorage();
  }

  private updateParticles() {
    for (const p of this.particles) {
      if (p.gravityAffect !== false) p.vy += this.world.gravity * 0.45;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.angularVelocity;
      p.life -= p.decay;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateFloatingTexts() {
    for (const t of this.floatingTexts) {
      t.y -= 0.65;
      t.life--;
    }
    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
  }

  public spawnFloatingText(text: string, x: number, y: number, color: string = '#ffffff') {
    this.floatingTexts.push({
      id: makeId(),
      text,
      x,
      y,
      color,
      life: 60,
      maxLife: 60,
    });
  }

  public spawnDust(x: number, y: number, count: number = 5) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        id: makeId(),
        type: 'smoke',
        x: x + (Math.random() * 12 - 6),
        y: y + (Math.random() * 12 - 6),
        vx: Math.random() * 1.5 - 0.75,
        vy: -Math.random() * 1.0,
        color: '#9badbc',
        size: Math.random() * 4 + 2,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.02,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: Math.random() * 0.1 - 0.05
      });
    }
  }

  public spawnSplinters(x: number, y: number, color: string, count: number = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        id: makeId(),
        type: 'wood_splinter',
        x,
        y,
        vx: (Math.random() * 4 - 2),
        vy: -(Math.random() * 4 + 1),
        color,
        size: Math.random() * 4 + 2,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.015,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: Math.random() * 0.4 - 0.2,
        gravityAffect: true
      });
    }
  }

  private explodeTnt(box: Box) {
    sound.playExplosion();
    this.cameraShake = 22;
    this.stats.explosionsTriggered++;

    // Large ring shockwave
    this.particles.push({
      id: makeId(),
      type: 'shockwave',
      x: box.x + 12,
      y: box.y + 12,
      vx: 0,
      vy: 0,
      color: '#ffffff',
      size: 10,
      life: 1.0,
      decay: 0.05,
      angle: 0,
      angularVelocity: 0,
    });

    const blowX = box.x + 12;
    const blowY = box.y + 12;

    this.boxes = this.boxes.filter(b => b.id !== box.id);

    // Apply explosion radius force push
    const blastRadius = 140;
    const blastForce = 9.5;

    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    const distToPlayer = Math.hypot(px - blowX, py - blowY);

    if (distToPlayer < blastRadius) {
      const angle = Math.atan2(py - blowY, px - blowX);
      const intensity = (blastRadius - distToPlayer) / blastRadius;
      this.player.vx += Math.cos(angle) * blastForce * intensity * 1.3;
      this.player.vy += Math.sin(angle) * blastForce * intensity * 1.0 - 1.8;
      this.player.onGround = false;
      this.spawnFloatingText("BLAST!", px, py - 20, "#ef7d57");

      if (this.player.grabbingBox) {
        this.player.grabbingBox.grabbed = false;
        this.player.grabbingBox.vx = this.player.vx * 1.2;
        this.player.grabbingBox.vy = this.player.vy * 1.2;
        this.player.grabbingBox = null;
      }
    }

    const affectedBoxes = [...this.boxes];
    for (const b of affectedBoxes) {
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      const dist = Math.hypot(bx - blowX, by - blowY);

      if (dist < blastRadius) {
        const intensity = (blastRadius - dist) / blastRadius;
        const angle = Math.atan2(by - blowY, bx - blowX);

        if (b.type === 'wood') {
          setTimeout(() => {
            this.spawnSplinters(b.x + 12, b.y + 12, '#df9c5c', 10);
            this.boxes = this.boxes.filter(bItem => bItem.id !== b.id);
          }, Math.random() * 150);
        } else if (b.type === 'present') {
          setTimeout(() => {
            sound.playChime();
            this.spawnSplinters(b.x + 12, b.y + 12, '#ff8be6', 8);
            this.spawnLoot(b.x + 6, b.y + 6, 'coin');
            this.boxes = this.boxes.filter(bItem => bItem.id !== b.id);
          }, Math.random() * 120);
        } else if (b.type === 'tnt') {
          if (b.fuseTimer === null) {
            b.fuseTimer = Math.floor(Math.random() * 18) + 6;
          }
        } else {
          b.vx += Math.cos(angle) * blastForce * intensity * (1.0 / b.mass);
          b.vy += Math.sin(angle) * blastForce * intensity * (1.0 / b.mass) - 2;
          b.onGround = false;
          b.angularVelocity = (Math.random() * 0.4 - 0.2) * intensity;
        }
      }
    }

    // Loot push
    for (const item of this.lootItems) {
      const dist = Math.hypot(item.x - blowX, item.y - blowY);
      if (dist < blastRadius) {
        const intensity = (blastRadius - dist) / blastRadius;
        const angle = Math.atan2(item.y - blowY, item.x - blowX);
        item.vx += Math.cos(angle) * blastForce * intensity * 1.5;
        item.vy += Math.sin(angle) * blastForce * intensity * 1.5 - 2;
        item.onGround = false;
      }
    }
  }
}
