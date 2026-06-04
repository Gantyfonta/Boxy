import { Box, Player, LootItem, Particle, FloatingText, PhysicsWorld, BoxType } from './types';
import { sound } from './sound';

// Create helper to generate unique IDs
const makeId = () => Math.random().toString(36).substr(2, 9);

export class GameEngine {
  public world: PhysicsWorld = {
    gravity: 0.28,
    friction: 0.85,
    airResistance: 0.99,
    width: 800,
    height: 450,
  };

  public player: Player = {
    x: 100,
    y: 300,
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

  public boxes: Box[] = [];
  public lootItems: LootItem[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public currentLevelGoal: string = "Stack 3 Golden Gift boxes!";
  public isGoalCompleted: boolean = false;
  
  // Game metrics
  public stats = {
    cratesStacked: 0,
    cratesOpened: 0,
    gemsCollected: 0,
    crownsFound: 0,
    explosionsTriggered: 0,
  };

  public selectedCrateType: BoxType = 'wood';
  public cameraShake: number = 0;
  
  // Mouse Spring Joint for Click & Drag
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

  constructor() {
    this.resetLevel();
  }

  public resetLevel() {
    this.boxes = [];
    this.lootItems = [];
    this.particles = [];
    this.floatingTexts = [];
    this.player.x = 80;
    this.player.y = 200;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.grabbingBox = null;
    this.isGoalCompleted = false;
    this.cameraShake = 0;

    // Spawn some initial juicy crates
    this.spawnCrateAt(180, 200, 'wood');
    this.spawnCrateAt(240, 200, 'wood');
    this.spawnCrateAt(300, 200, 'metal');
    this.spawnCrateAt(360, 200, 'present');
    this.spawnCrateAt(420, 200, 'tnt');
    this.spawnCrateAt(480, 200, 'hover');
    this.spawnCrateAt(540, 200, 'present');

    // Create a special Locked Box containing the Crown at the right wall
    const lockedBox = this.spawnCrateAt(700, 300, 'metal');
    if (lockedBox) {
      lockedBox.customColor = '#eab308'; // Golden metal
      lockedBox.health = 999; // Locked
      lockedBox.id = 'locked_crown_box';
    }

    // Spawn a locked gift present box too
    const lockedGift = this.spawnCrateAt(620, 200, 'present');
    if (lockedGift) {
      lockedGift.id = 'key_box'; // will drop a key
    }

    this.spawnFloatingText("SANDBOX READY!", 400, 150, "#ffe385");
  }

  public spawnCrateAt(x: number, y: number, type: BoxType): Box | null {
    // Avoid double spawning/overlapping inside boundaries
    const boxSize = 28;
    const newBox: Box = {
      id: makeId(),
      type,
      x: Math.max(10, Math.min(this.world.width - boxSize - 10, x)),
      y: Math.max(10, Math.min(this.world.height - 32 - boxSize, y)),
      vx: 0,
      vy: 0,
      width: boxSize,
      height: boxSize,
      mass: type === 'metal' ? 3.5 : type === 'wood' ? 1.2 : type === 'tnt' ? 0.9 : type === 'present' ? 0.6 : 1.0,
      onGround: false,
      grabbed: false,
      isOpened: false,
      fuseTimer: null,
      health: type === 'wood' ? 2 : 10,
      angle: 0,
      angularVelocity: 0,
      squishX: 1.0,
      squishY: 1.0
    };

    this.boxes.push(newBox);
    this.spawnDust(newBox.x + 14, newBox.y + 14, 4);
    return newBox;
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
        color: '#94a3b8',
        size: Math.random() * 4 + 2,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.02,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: Math.random() * 0.1 - 0.05
      });
    }
  }

  public spawnExplosionParticles(x: number, y: number) {
    sound.playExplosion();
    this.cameraShake = 22;
    this.stats.explosionsTriggered++;

    // Large ring shockwave
    this.particles.push({
      id: makeId(),
      type: 'shockwave',
      x,
      y,
      vx: 0,
      vy: 0,
      color: '#ffffff',
      size: 10,
      life: 1.0,
      decay: 0.05,
      angle: 0,
      angularVelocity: 0,
    });

    // Fire & embers
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        id: makeId(),
        type: 'fire',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // tend to float up
        color: i % 2 === 0 ? '#ff4b4b' : '#ff942b',
        size: Math.random() * 8 + 4,
        life: 1.0,
        decay: Math.random() * 0.04 + 0.02,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: Math.random() * 0.2 - 0.1,
        gravityAffect: false
      });
    }

    // Sparkles
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      this.particles.push({
        id: makeId(),
        type: 'sparkle',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#ffcd2b',
        size: Math.random() * 3 + 1,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.03,
        angle: 0,
        angularVelocity: 0,
        gravityAffect: true
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

  // Pick up a box in range
  public tryGrabBox() {
    if (this.player.grabbingBox) {
      this.dropBox();
      return;
    }

    // Grab box closest to feet or hands
    let closestBox: Box | null = null;
    let minDist = 45;

    for (const b of this.boxes) {
      if (b.isOpened) continue;
      // Calculate center to center distance
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
      if (closestBox.id === 'locked_crown_box') {
        // Locked! Need key.
        const carryKey = this.checkPlayerCarriesKey();
        if (carryKey) {
          this.unlockCrownBox(closestBox);
        } else {
          sound.playSplat();
          this.spawnFloatingText("LOCKED! Need Key 🔑", closestBox.x + 14, closestBox.y - 12, "#ff4b4b");
        }
        return;
      }

      closestBox.grabbed = true;
      closestBox.onGround = false;
      closestBox.vx = 0;
      closestBox.vy = 0;
      this.player.grabbingBox = closestBox;
      sound.playLift();
      this.spawnFloatingText("LIFT", closestBox.x + 14, closestBox.y - 10, "#4fa9ff");
    }
  }

  private checkPlayerCarriesKey(): boolean {
    // Check if player stands near key, or let's say they touch the key to use it.
    // Let's see if there are any key loot items collected or near.
    // If there is a key near the player, we automatic consume it!
    const keyItem = this.lootItems.find(item => item.type === 'key');
    if (keyItem) {
      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      const dist = Math.hypot(keyItem.x - px, keyItem.y - py);
      if (dist < 80) {
        // Remove key item
        this.lootItems = this.lootItems.filter(i => i.id !== keyItem.id);
        return true;
      }
    }
    return false;
  }

  private unlockCrownBox(box: Box) {
    sound.playUnlock();
    this.spawnDust(box.x + 14, box.y + 14, 15);
    this.spawnSplinters(box.x + 14, box.y + 14, '#eab308', 12);
    
    // Spawn Crown
    this.lootItems.push({
      id: makeId(),
      type: 'crown',
      x: box.x + 6,
      y: box.y - 10,
      vx: 0,
      vy: -5,
      width: 16,
      height: 16,
      angle: 0,
      angularVelocity: 0.05,
      onGround: false,
      bounceCount: 0,
      shineTimer: 0
    });

    // Remove the locked crate
    this.boxes = this.boxes.filter(b => b.id !== box.id);
    this.spawnFloatingText("UNLOCKED! 👑", box.x + 14, box.y - 15, "#ffcd2b");
  }

  public dropBox() {
    const box = this.player.grabbingBox;
    if (!box) return;

    box.grabbed = false;
    // Place in front of player
    const direction = this.player.facing === 'left' ? -1 : 1;
    box.x = this.player.x + (direction * 22);
    box.y = this.player.y;
    box.vx = direction * 1.5;
    box.vy = -1.0;
    
    // Safety check bounds
    box.x = Math.max(10, Math.min(this.world.width - box.width - 10, box.x));

    this.player.grabbingBox = null;
    sound.playThrow();
    this.spawnFloatingText("PLACE", box.x + 14, box.y - 10, "#94a3b8");
  }

  public throwBox() {
    const box = this.player.grabbingBox;
    if (!box) return;

    box.grabbed = false;
    const direction = this.player.facing === 'left' ? -1 : 1;
    
    // Throw trajectory velocity!
    box.x = this.player.x + (direction * 18);
    box.y = this.player.y - 6;
    box.vx = direction * 5.5 + this.player.vx * 0.5;
    box.vy = -4.5;
    box.angularVelocity = direction * (Math.random() * 0.15 + 0.1);
    
    // Set squish for elastic thrust visual!
    box.squishX = 0.7;
    box.squishY = 1.4;

    this.player.grabbingBox = null;
    sound.playThrow();
    this.spawnFloatingText("THROW!", box.x + 14, box.y - 10, "#e64530");
  }

  // Trigger crate action or open it by pressing E/Q or clicking
  public tryOpenBox() {
    // Look for a breakable/openable crate within range
    let target: Box | null = null;
    let minDist = 48;

    for (const b of this.boxes) {
      if (b.grabbed || b.isOpened) continue;
      if (b.type !== 'present' && b.type !== 'wood' && b.type !== 'tnt') continue;

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

    if (box.type === 'wood') {
      sound.playShatter();
      this.spawnSplinters(box.x + 14, box.y + 14, '#c08044', 12);
      this.boxes = this.boxes.filter(b => b.id !== box.id);
      this.stats.cratesOpened++;
      this.spawnFloatingText("SMASHED", box.x + 14, box.y - 10, "#c08044");

      // Small chance to pop a coin out
      if (Math.random() < 0.4) {
        this.spawnLoot(box.x + 6, box.y - 4, 'coin');
      }
    } else if (box.type === 'present') {
      sound.playBubble();
      sound.playChime();
      this.spawnDust(box.x + 14, box.y + 14, 10);
      this.spawnSplinters(box.x + 14, box.y + 14, '#ff4b4b', 8);
      
      // Spawn flying collectibles!
      const gems: ('gem_red' | 'gem_blue' | 'gem_green' | 'coin')[] = ['gem_red', 'gem_blue', 'gem_green', 'coin'];
      const lootType = box.id === 'key_box' ? 'key' : gems[Math.floor(Math.random() * gems.length)];

      this.spawnLoot(box.x + 6, box.y - 6, lootType);

      // Remove crate
      this.boxes = this.boxes.filter(b => b.id !== box.id);
      this.stats.cratesOpened++;
      this.spawnFloatingText("OPENED!", box.x + 14, box.y - 12, "#ffcd2b");
    } else if (box.type === 'tnt') {
      // Light the fuse!
      if (box.fuseTimer === null) {
        box.fuseTimer = 75; // frames (1.25s)
        this.spawnFloatingText("RUN!!!", box.x + 14, box.y - 12, "#ff4b4b");
        sound.playTick();
      }
    }
  }

  private spawnLoot(x: number, y: number, type: 'gem_red' | 'gem_blue' | 'gem_green' | 'coin' | 'key' | 'crown') {
    this.lootItems.push({
      id: makeId(),
      type,
      x,
      y,
      vx: Math.random() * 3 - 1.5,
      vy: -(Math.random() * 4 + 3),
      width: 14,
      height: 14,
      angle: Math.random() * Math.PI,
      angularVelocity: Math.random() * 0.15 - 0.07,
      onGround: false,
      bounceCount: 0,
      shineTimer: 0
    });
  }

  // Manual detonate TNT box
  private explodeTnt(box: Box) {
    this.spawnExplosionParticles(box.x + 14, box.y + 14);
    
    // Remove the TNT box before damage recursion to avoid infinite loops
    this.boxes = this.boxes.filter(b => b.id !== box.id);

    // Apply radial explosion force to player and crates
    const blastRadius = 140;
    const blastForce = 9.5;

    // Player blast push
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    const tx = box.x + 14;
    const ty = box.y + 14;
    const distToPlayer = Math.hypot(px - tx, py - ty);

    if (distToPlayer < blastRadius) {
      const angle = Math.atan2(py - ty, px - tx);
      const intensity = (blastRadius - distToPlayer) / blastRadius;
      this.player.vx += Math.cos(angle) * blastForce * intensity * 1.3;
      this.player.vy += Math.sin(angle) * blastForce * intensity * 1.0 - 1.8; // launch upward
      this.player.onGround = false;
      this.spawnFloatingText("BLAST!", px, py - 20, "#ff4b4b");
      
      // Drop carried crate
      if (this.player.grabbingBox) {
        this.player.grabbingBox.grabbed = false;
        this.player.grabbingBox.vx = this.player.vx * 1.2;
        this.player.grabbingBox.vy = this.player.vy * 1.2;
        this.player.grabbingBox = null;
      }
    }

    // Boxes blast damage & push
    const affectedBoxes = [...this.boxes];
    for (const b of affectedBoxes) {
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      const dist = Math.hypot(bx - tx, by - ty);

      if (dist < blastRadius) {
        const intensity = (blastRadius - dist) / blastRadius;
        const angle = Math.atan2(by - ty, bx - tx);

        if (b.type === 'wood') {
          // Break immediately
          setTimeout(() => {
            this.spawnSplinters(b.x + 14, b.y + 14, '#c08044', 10);
            this.boxes = this.boxes.filter(bItem => bItem.id !== b.id);
          }, Math.random() * 150); // slight cascade delay
        } else if (b.type === 'present') {
          // Shatter and pop loot
          setTimeout(() => {
            sound.playChime();
            this.spawnSplinters(b.x + 14, b.y + 14, '#ff4b4b', 8);
            this.spawnLoot(b.x + 6, b.y + 6, 'coin');
            this.boxes = this.boxes.filter(bItem => bItem.id !== b.id);
          }, Math.random() * 120);
        } else if (b.type === 'tnt') {
          // Chain reaction ignite!
          if (b.fuseTimer === null) {
            b.fuseTimer = Math.floor(Math.random() * 18) + 6; // quick fuse ignite!
          }
        } else {
          // Metal & Hover are pushed with massive force
          b.vx += Math.cos(angle) * blastForce * intensity * (1.0 / b.mass);
          b.vy += Math.sin(angle) * blastForce * intensity * (1.0 / b.mass) - 2;
          b.onGround = false;
          b.angularVelocity = (Math.random() * 0.4 - 0.2) * intensity;
        }
      }
    }

    // Push flying loot
    for (const item of this.lootItems) {
      const dist = Math.hypot(item.x - tx, item.y - ty);
      if (dist < blastRadius) {
        const intensity = (blastRadius - dist) / blastRadius;
        const angle = Math.atan2(item.y - ty, item.x - tx);
        item.vx += Math.cos(angle) * blastForce * intensity * 1.5;
        item.vy += Math.sin(angle) * blastForce * intensity * 1.5 - 2;
        item.onGround = false;
      }
    }
  }

  // Mouse Drag Physics
  public handleMouseDown(mx: number, my: number) {
    this.dragJoint.mouseX = mx;
    this.dragJoint.mouseY = my;

    // Search from front to back (top of stacks first)
    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const b = this.boxes[i];
      if (b.grabbed) continue;

      if (mx >= b.x && mx <= b.x + b.width && my >= b.y && my <= b.y + b.height) {
        this.dragJoint.box = b;
        this.dragJoint.offsetX = mx - b.x;
        this.dragJoint.offsetY = my - b.y;
        b.vx = 0;
        b.vy = 0;
        b.onGround = false;
        
        // If player was carrying it, let go
        if (this.player.grabbingBox?.id === b.id) {
          this.player.grabbingBox = null;
        }

        this.spawnFloatingText("DRAG", mx, my - 10, "#36e5f0");
        sound.playTone(400, 500, 0.05, "sine", 0.3);
        break;
      }
    }
  }

  public handleMouseMove(mx: number, my: number) {
    this.dragJoint.mouseX = mx;
    this.dragJoint.mouseY = my;
  }

  public handleMouseUp() {
    if (this.dragJoint.box) {
      this.dragJoint.box = null;
      sound.playTone(300, 200, 0.05, "sine", 0.3);
    }
  }

  // Primary Update Engine Loop
  public update() {
    this.updateCameraShake();
    this.updatePlayerMovement();
    this.updateCratesPhysics();
    this.updateLootItemsPhysics();
    this.updateParticles();
    this.updateFloatingTexts();
    this.evaluateLevelGoal();
  }

  private updateCameraShake() {
    if (this.cameraShake > 0) {
      this.cameraShake -= 0.75;
      if (this.cameraShake < 0) this.cameraShake = 0;
    }
  }

  private updatePlayerMovement() {
    const p = this.player;

    // Apply gravity
    p.vy += this.world.gravity;
    p.y += p.vy;

    // Ground block y height is world.height - 32
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

    // Map boundary walls X limit
    if (p.x < 10) {
      p.x = 10;
      p.vx = 0;
    } else if (p.x + p.width > this.world.width - 10) {
      p.x = this.world.width - p.width - 10;
      p.vx = 0;
    }

    // Apply inertia resistance
    p.vx *= this.world.friction;
    p.x += p.vx;

    // Lifted carrying box lock overlay coords
    if (p.grabbingBox) {
      p.grabbingBox.x = p.x + (p.width - p.grabbingBox.width) / 2;
      p.grabbingBox.y = p.y - p.grabbingBox.height + 4;
      p.grabbingBox.vx = p.vx;
      p.grabbingBox.vy = p.vy;
    }

    // Handle animations state machine
    p.animTimer++;
    if (Math.abs(p.vx) > 0.5) {
      if (p.grabbingBox) {
        p.state = 'grab_walk';
      } else {
        p.state = 'walk';
      }
      if (p.animTimer % 6 === 0) {
        p.animFrame = (p.animFrame + 1) % 4;
      }
    } else {
      if (p.grabbingBox) {
        p.state = 'grab_idle';
      } else {
        p.state = 'idle';
      }
      if (p.animTimer % 35 === 0) {
        p.animFrame = (p.animFrame + 1) % 2;
      }
    }

    if (!p.onGround) p.state = 'jump';
  }

  private updateCratesPhysics() {
    const solverPasses = 5; // Multi-pass resolving produces perfectly stiff stack columns!

    // Apply forces (Gravity + Drag + Wind)
    for (const b of this.boxes) {
      if (b.grabbed) continue;

      if (this.dragJoint.box?.id === b.id) {
        // Drag physics: pull crate towards cursor using strong rubber spring joint!
        const targetX = this.dragJoint.mouseX - this.dragJoint.offsetX;
        const targetY = this.dragJoint.mouseY - this.dragJoint.offsetY;

        // Apply visual stretching during drag!
        b.vx = (targetX - b.x) * 0.35;
        b.vy = (targetY - b.y) * 0.35;
        b.squishX = 1.0 - Math.min(0.2, Math.abs(b.vx) * 0.02);
        b.squishY = 1.0 + Math.min(0.3, Math.abs(b.vy) * 0.02);
      } else {
        // Normal state physics: apply Gravity if not Hover crate type
        if (b.type === 'hover') {
          // Hover anti-grav locks Y speed down with soft neon glow oscillation
          b.vy *= 0.85;
          b.vx *= this.world.friction;
        } else {
          b.vy += this.world.gravity;
          b.vx *= this.world.friction;
        }
      }

      b.x += b.vx;
      b.y += b.vy;

      // Handle TNT spark sparkle emissions during ticking!
      if (b.type === 'tnt' && b.fuseTimer !== null) {
        b.fuseTimer--;

        // Blink scaling glow: make it shake
        b.squishX = 1.0 + Math.sin(b.fuseTimer * 0.4) * 0.12;
        b.squishY = 1.0 - Math.sin(b.fuseTimer * 0.4) * 0.12;

        if (b.fuseTimer % 12 === 0 && b.fuseTimer > 0) {
          sound.playTick();
        }

        // Spawn warning sparks
        if (Math.random() < 0.4) {
          this.particles.push({
            id: makeId(),
            type: 'sparkle',
            x: b.x + 14 + (Math.random() * 8 - 4),
            y: b.y - 2,
            vx: Math.random() * 1.5 - 0.75,
            vy: -Math.random() * 2,
            color: '#ffdd33',
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

      // Rotate graphics during active flights
      if (!b.onGround && Math.abs(b.vx) > 0.5) {
        b.angle += b.angularVelocity;
      } else {
        b.angle *= 0.85; // quickly lock angle straight upon settling flat
      }

      // Regulate elastic squish spring-back mechanics towards normal 1.0
      b.squishX += (1.0 - b.squishX) * 0.14;
      b.squishY += (1.0 - b.squishY) * 0.14;

      // Collide screen walls bounds
      if (b.x < 10) {
        b.x = 10;
        b.vx = -b.vx * 0.25;
        this.applyCrateSquish(b, 0.72, 1.25);
      } else if (b.x + b.width > this.world.width - 10) {
        b.x = this.world.width - b.width - 10;
        b.vx = -b.vx * 0.25;
        this.applyCrateSquish(b, 0.72, 1.25);
      }

      // Collide solid ground level (y height world.height - 32)
      const groundY = this.world.height - 32;
      if (b.y + b.height >= groundY) {
        const fallSpeed = b.vy;
        b.y = groundY - b.height;
        b.vy = 0;
        b.onGround = true;

        if (fallSpeed > 1.2) {
          this.handleCrateImpact(b, fallSpeed);
        }
      } else {
        b.onGround = false;
      }
    }

    // Solve player standing on and pushing boxes
    this.solvePlayerBoxInteraction();

    // Stacking Overlap Resolution Passes
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

  private applyCrateSquish(b: Box, sx: number, sy: number) {
    b.squishX = sx;
    b.squishY = sy;
  }

  private handleCrateImpact(b: Box, impactSpeed: number) {
    // Satisfying squish impact compression!
    this.applyCrateSquish(b, 1.35, 0.68);
    this.spawnDust(b.x + 14, b.y + b.height, Math.min(6, Math.floor(impactSpeed * 1.5)));

    if (b.type === 'wood') {
      sound.playSplat();
      // If wood crate gets smashed extremely hard, open/shatter it!
      if (impactSpeed > 5.5) {
        this.openBox(b);
      } else if (impactSpeed > 2.5) {
        b.health--;
        this.spawnSplinters(b.x + 14, b.y + 14, '#c08044', 4);
        this.spawnFloatingText("DAMAGED", b.x + 14, b.y - 10, "#c08044");
      }
    } else if (b.type === 'present') {
      // Presents are bouncy! High rebound!
      b.vy = -impactSpeed * 0.52;
      b.vx += (Math.random() * 2 - 1);
      b.onGround = false;
      sound.playBubble();
    } else if (b.type === 'metal') {
      sound.playLand();
      if (impactSpeed > 4.5 && this.cameraShake < 6) {
        this.cameraShake = 7;
        // Check if hitting wood crate directly underneath, crush it!
        this.checkMetalCrushWood(b);
      }
    } else if (b.type === 'tnt') {
      sound.playSplat();
      // TNT triggers instantly if dropped from height!
      if (impactSpeed > 3.8) {
        this.openBox(b);
      }
    }
  }

  private checkMetalCrushWood(metalBox: Box) {
    // Metal craters crush wooden crates directly below!
    for (const b of this.boxes) {
      if (b.id === metalBox.id || b.type !== 'wood') continue;
      
      // If directly beneath metal within tight overlap range
      const horizontalOverlap = (metalBox.x < b.x + b.width) && (metalBox.x + metalBox.width > b.x);
      const verticalTouch = Math.abs(metalBox.y + metalBox.height - b.y) < 6;

      if (horizontalOverlap && verticalTouch) {
        this.openBox(b);
        this.spawnFloatingText("CRUSHED!", b.x + 14, b.y - 12, "#ff4b4b");
      }
    }
  }

  private resolveBoxToBoxCollision(b1: Box, b2: Box) {
    // Bounding Box overlap solver
    const oX = (b1.x + b1.width / 2) - (b2.x + b2.width / 2);
    const oY = (b1.y + b1.height / 2) - (b2.y + b2.height / 2);
    const halfW = (b1.width + b2.width) / 2;
    const halfH = (b1.height + b2.height) / 2;

    const absX = Math.abs(oX);
    const absY = Math.abs(oY);

    if (absX < halfW && absY < halfH) {
      const penX = halfW - absX;
      const penY = halfH - absY;

      // Resolve along the shallowest intersection axis (minimal penetration)
      if (penX < penY) {
        // Horizontal separation
        const dir = oX > 0 ? 1 : -1;
        
        // Static hover handling: they act as infinitely heavy anchor walls
        const m1 = b1.type === 'hover' ? 999 : b1.mass;
        const m2 = b2.type === 'hover' ? 999 : b2.mass;
        const tot = m1 + m2;

        b1.x += penX * dir * (m2 / tot);
        b2.x -= penX * dir * (m1 / tot);

        // Simple kinetic bounce response
        const relativeVel = b1.vx - b2.vx;
        b1.vx = -relativeVel * 0.15 * (m2 / tot) + b1.vx * 0.1;
        b2.vx = relativeVel * 0.15 * (m1 / tot) + b2.vx * 0.1;
      } else {
        // Vertical separation
        const dir = oY > 0 ? 1 : -1;
        
        const m1 = b1.type === 'hover' ? 999 : b1.mass;
        const m2 = b2.type === 'hover' ? 999 : b2.mass;
        const tot = m1 + m2;

        b1.y += penY * dir * (m2 / tot);
        b2.y -= penY * dir * (m1 / tot);

        const relativeVelY = b1.vy - b2.vy;
        
        // Elastic bounces
        const bounceE = (b1.type === 'present' || b2.type === 'present') ? 0.48 : 0.08;
        
        b1.vy = -relativeVelY * bounceE * (m2 / tot);
        b2.vy = relativeVelY * bounceE * (m1 / tot);

        // Ground-support locking flags
        if (dir === -1) {
          b1.onGround = true; // b2 acts as support for b1
        } else {
          b2.onGround = true; // b1 acts as support for b2
        }

        // Apply visual squish
        if (Math.abs(relativeVelY) > 1.8) {
          b1.squishX = 1.25; b1.squishY = 0.75;
          b2.squishX = 1.25; b2.squishY = 0.75;
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
        // Resolve overlap
        const penX = halfW - Math.abs(dX);
        const penY = halfH - Math.abs(dY);

        if (penX < penY) {
          // Horizontal contact: Push the crate left or right relative to walk direction!
          const dir = dX > 0 ? 1 : -1;
          
          if (b.type === 'hover') {
            // Hover platforms easily slide horizontally!
            b.x -= penX * dir;
            b.vx = p.vx * 0.9;
          } else {
            // Pushing resistance load factors
            const pushability = 0.75 / b.mass;
            b.x -= penX * dir * 0.8;
            b.vx = p.vx * pushability;
            p.x += penX * dir * 0.2; // slight feedback resistance
          }
        } else {
          // Vertical contact: Stand on high plates
          const dir = dY > 0 ? 1 : -1;
          if (dir === 1) {
            // Player standing on TOP of the crate
            p.y = b.y - p.height;
            if (p.vy > 1.5) {
              sound.playLand();
              this.spawnDust(p.x + p.width / 2, b.y, 2);
            }
            p.vy = 0;
            p.onGround = true;
          } else {
            // Player head hits bottom of crate
            p.y = b.y + b.height;
            p.vy = Math.max(0, p.vy);
            
            // Impact slightly forces crate upwards!
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

      // Key, gem spinning
      item.angle += item.angularVelocity;
      item.shineTimer++;

      // Wall bounds elastic rich bounce
      if (item.x < 10) {
        item.x = 10;
        item.vx = -item.vx * 0.6;
      } else if (item.x + item.width > this.world.width - 10) {
        item.x = this.world.width - item.width - 10;
        item.vx = -item.vx * 0.6;
      }

      // Ground bounding item bounce response
      if (item.y + item.height >= groundY) {
        item.y = groundY - item.height;
        if (item.vy > 1.0 && item.bounceCount < 3) {
          item.vy = -item.vy * 0.52; // bounce!
          item.vx *= 0.6;
          item.bounceCount++;
        } else {
          item.vy = 0;
          item.vx = 0;
          item.onGround = true;
        }
      }

      // Collect item logic
      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      const dist = Math.hypot((item.x + item.width / 2) - px, (item.y + item.height / 2) - py);

      if (dist < 40) {
        // Collect! Magnetise pull
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
    if (item.type === 'key') {
      sound.playKeyCollect();
      this.spawnFloatingText("+KEY 🔑", item.x, item.y - 12, "#3daee4");
    } else if (item.type === 'crown') {
      sound.playKeyCollect();
      this.stats.crownsFound++;
      this.spawnFloatingText("KING CROWN FOUND 👑", item.x, item.y - 15, "#ffcd2b");
    } else {
      sound.playTone(550, 750, 0.08, "sine", 0.5);
      this.stats.gemsCollected++;
      const text = item.type === 'coin' ? "+COIN" : "+GEM";
      const color = item.type === 'gem_red' ? '#ff4b4b' : item.type === 'gem_blue' ? '#4fa9ff' : item.type === 'gem_green' ? '#29cc53' : '#ffcd2b';
      this.spawnFloatingText(text, item.x, item.y - 12, color);
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

    // Clear item from active lists
    this.lootItems = this.lootItems.filter(i => i.id !== item.id);
  }

  private updateParticles() {
    for (const p of this.particles) {
      if (p.gravityAffect !== false) {
        p.vy += this.world.gravity * 0.45;
      }
      p.x += p.vx;
      p.y += p.vy;

      p.angle += p.angularVelocity;
      p.life -= p.decay;
    }

    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateFloatingTexts() {
    for (const t of this.floatingTexts) {
      t.y -= 0.65; // float gently skyward
      t.life--;
    }
    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
  }

  private evaluateLevelGoal() {
    // Audit current sandbox status to check goals
    // Goal: Stacking 3 Gift Crates, or finding the Crown, or collecting all Gems
    
    // Find highest vertical coordinate stack pile of Present packages
    let presentCrates = this.boxes.filter(b => b.type === 'present');
    let stackSizeMax = 0;

    for (const b of presentCrates) {
      // Find how many crates exist directly beneath it
      let sizeCurrent = 1;
      let under = b;
      let searching = true;

      while (searching) {
        const foundNext = this.boxes.find(other => {
          if (other.id === under.id) return false;
          // overlaps horizontally and sits directly under
          const hOver = Math.abs((under.x + 14) - (other.x + 14)) < 12;
          const vTouch = Math.abs((under.y + 28) - other.y) < 6;
          return hOver && vTouch;
        });

        if (foundNext) {
          sizeCurrent++;
          under = foundNext;
        } else {
          searching = false;
        }
      }

      if (sizeCurrent > stackSizeMax) {
        stackSizeMax = sizeCurrent;
      }
    }

    this.stats.cratesStacked = stackSizeMax;

    if (this.stats.crownsFound >= 1 || stackSizeMax >= 3) {
      if (!this.isGoalCompleted) {
        sound.playChime();
        sound.playUnlock();
        this.isGoalCompleted = true;
        this.spawnFloatingText("SANDBOX GOAL SECURED! 🎉", 400, 180, "#36e5f0");
      }
    }
  }
}
