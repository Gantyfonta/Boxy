import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/physics';
import { sprites } from './game/sprites';
import { sound } from './game/sound';
import { BoxType } from './game/types';

const makeId = () => Math.random().toString(36).substring(2, 11);

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  const [initClick, setInitClick] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize engine once
  if (!engineRef.current) {
    engineRef.current = new GameEngine();
  }

  const engine = engineRef.current;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = 640;
    let height = 360;
    let scale = 2; // integer pixel scaling

    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const displayWidth = Math.max(320, Math.floor(rect.width));
      const displayHeight = Math.max(240, Math.floor(rect.height));

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Decide integer scale factor to maintain sharp pixel art
      // We aim for approx 220-270 virtual vertical pixels
      scale = Math.max(1.5, Math.floor(displayHeight / 190));
      if (scale < 1) scale = 1;

      width = Math.floor(displayWidth / scale);
      height = Math.floor(displayHeight / scale);

      // Tell engine the size of our virtual world
      engine.world.width = width;
      engine.world.height = height;
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      keysRef.current[code] = true;

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
      keysRef.current[e.code] = false;
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
      // Return pixel coordinate regions in virtual space
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

    // Mouse and Touch listeners
    const handleMouseDown = (e: MouseEvent) => {
      // Play dummy sound to resume AudioContext (safari/chrome interactions rule)
      if (!initClick) {
        setInitClick(true);
        sound.playTick();
      }

      const { mx, my } = getVirtualMouseCoords(e.clientX, e.clientY);

      // Check toggler click (Sound button top left)
      if (mx >= 12 && mx <= 70 && my >= 10 && my <= 30) {
        const nextEnabled = !sound.enabled;
        sound.enabled = nextEnabled;
        setSoundEnabled(nextEnabled);
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

      // Spawn crate on free empty space within upper screen if we shift-click or double click,
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

    // Touch Event Proxies
    const handleTouchStart = (e: TouchEvent) => {
      if (!initClick) {
        setInitClick(true);
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

    // Main Game Render & Mechanics Loop
    const loop = () => {
      // 1. Process keys input
      const p = engine.player;
      const k = keysRef.current;

      const walkSpeed = p.grabbingBox ? 1.75 : 2.5;
      const accel = 0.55;

      if (k['KeyA'] || k['ArrowLeft']) {
        p.vx -= accel;
        if (p.vx < -walkSpeed) p.vx = -walkSpeed;
        p.facing = 'left';
      } else if (k['KeyD'] || k['ArrowRight']) {
        p.vx += accel;
        if (p.vx > walkSpeed) p.vx = walkSpeed;
        p.facing = 'right';
      }

      if ((k['KeyW'] || k['Space'] || k['ArrowUp']) && p.onGround) {
        // Jump height slightly damp if carrying heavy blocks!
        const weightMult = p.grabbingBox ? (p.grabbingBox.type === 'metal' ? 0.68 : 0.85) : 1.0;
        p.vy = -5.7 * weightMult;
        p.onGround = false;
        sound.playJump();
        engine.spawnDust(p.x + p.width/2, height - 32, 4);
      }

      // 2. Perform engine physics step
      engine.update();

      // 3. Clear canvas and prepare rendering
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      
      // Dynamic camera shaker
      if (engine.cameraShake > 0) {
        const dx = (Math.random() - 0.5) * engine.cameraShake;
        const dy = (Math.random() - 0.5) * engine.cameraShake;
        ctx.translate(dx, dy);
      }

      ctx.scale(scale, scale);

      // Disable high-res smoothing to keep gorgeous chunky pixels sharp
      ctx.imageSmoothingEnabled = false;

      // Draw background parallax grid / warehouse wall colors
      drawWarehouseBackground(ctx, width, height);

      // Draw active Level Goal outline card (Background overlay)
      drawLevelGoalPoster(ctx, width, height);

      // Draw the static floor plates (y = height - 32)
      drawWarehouseFloor(ctx, width, height);

      // Draw all interactive physical boxes
      for (const b of engine.boxes) {
        if (b.grabbed) continue; // let player drawing handle held crates

        // Draw selection highlight if hovered by drag joint
        if (engine.dragJoint.box?.id === b.id) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
        }

        // Draw dynamic flashing overlay if TNT box is blinking fuse
        let tintColor: string | undefined;
        if (b.type === 'tnt' && b.fuseTimer !== null) {
          const frequency = b.fuseTimer < 25 ? 4 : 10;
          if (Math.floor(b.fuseTimer / frequency) % 2 === 0) {
            tintColor = 'rgba(255, 255, 255, 0.45)'; // Flash bright warning glow
          }
        }

        // Apply bounce stretching state visually
        ctx.save();
        ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
        ctx.scale(b.squishX, b.squishY);
        
        sprites.drawSprite(ctx, `crate_${b.type}`, -b.width / 2, -b.height / 2, b.width, b.height, {
          angle: b.angle,
          tint: tintColor || b.customColor
        });

        // Add cute sparkle sparkles to golden crates
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

      // Draw all flying loot items
      for (const item of engine.lootItems) {
        const spriteName = item.type === 'coin' 
          ? `loot_coin_${Math.floor(item.shineTimer / 6) % 3 + 1}` 
          : `loot_${item.type}`;
        
        sprites.drawSprite(ctx, spriteName, item.x, item.y, item.width, item.height, {
          angle: item.angle
        });
      }

      // Draw player character
      let playerSprite = 'player_idle_1';
      if (p.state === 'walk') {
        const walkFrames = ['player_walk_1', 'player_walk_2', 'player_walk_3', 'player_walk_4'];
        playerSprite = walkFrames[p.animFrame] || 'player_walk_1';
      } else if (p.state === 'grab_idle') {
        playerSprite = 'player_carry_idle';
      } else if (p.state === 'grab_walk') {
        playerSprite = 'player_carry_idle'; // robot arms raised
      } else if (p.state === 'jump') {
        playerSprite = p.grabbingBox ? 'player_carry_idle' : 'player_jump';
      }

      // Draw the held box at exact head level with its squish factoring
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

      // Draw player robot body
      sprites.drawSprite(ctx, playerSprite, p.x, p.y, p.width, p.height, {
        flipX: p.facing === 'left'
      });

      // Draw interactive floating grab prompts bubble when close to a box
      drawInteractBubbles(ctx, width, height);

      // Draw gorgeous visual particles
      for (const part of engine.particles) {
        ctx.save();
        ctx.globalAlpha = part.life;

        if (part.type === 'smoke') {
          // Circular expanding dark puff
          ctx.beginPath();
          ctx.fillStyle = part.color;
          ctx.arc(part.x, part.y, part.size * (1.5 - part.life * 0.5), 0, Math.PI * 2);
          ctx.fill();
        } else if (part.type === 'fire') {
          // Warm burning fire circle
          ctx.beginPath();
          ctx.fillStyle = part.color;
          ctx.arc(part.x, part.y, part.size * part.life, 0, Math.PI * 2);
          ctx.fill();
        } else if (part.type === 'shockwave') {
          // Exploding bright circle outline
          ctx.beginPath();
          ctx.strokeStyle = part.color;
          ctx.lineWidth = 2;
          ctx.arc(part.x, part.y, part.size * (1.0 - part.life) * 4.5, 0, Math.PI * 2);
          ctx.stroke();
        } else if (part.type === 'star' || part.type === 'sparkle') {
          // Four point starry sparkles
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
          // Simple wooden planks/chips debris
          ctx.translate(part.x, part.y);
          ctx.rotate(part.angle);
          ctx.fillStyle = part.color;
          ctx.fillRect(-part.size / 2, -1, part.size, 2);
        }

        ctx.restore();
      }

      // Draw floating score action text bubble overlays
      ctx.textAlign = 'center';
      for (const txt of engine.floatingTexts) {
        ctx.fillStyle = 'rgba(16, 20, 31, 0.75)'; // pixel black plate
        const txtWidth = ctx.measureText(txt.text).width + 6;
        ctx.fillRect(txt.x - txtWidth/2, txt.y - 10, txtWidth, 12);

        ctx.fillStyle = txt.color;
        ctx.font = 'bold 8px monospace';
        ctx.fillText(txt.text, txt.x, txt.y - 1);
      }

      // Draw spring line coordinate while click-dragging crates
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

      // 4. Render Hud Overlay (No standard React HUD buttons, entirely drawn in Canvas!)
      drawGameHud(ctx, width, height, scale, getSpawnButtonRegions());

      ctx.restore();

      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [initClick]);

  // Dynamic Interact indication bubbles
  const drawInteractBubbles = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Look for nearest box to draw a beautiful "E: Lift" or "Q: Open" floating tip
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
      ctx.fillStyle = '#10121c'; // Vibrant theme deep black-blue
      const textWidth = ctx.measureText(target).width + 8;
      ctx.fillRect(targetX - textWidth / 2, targetY - 10, textWidth, 12);
      
      ctx.fillStyle = '#f4f4f4';
      ctx.font = '6px monospace';
      ctx.fillText(target, targetX, targetY - 2);

      // Cute tiny triangle down on tooltip base
      ctx.beginPath();
      ctx.moveTo(targetX - 3, targetY + 2);
      ctx.lineTo(targetX + 3, targetY + 2);
      ctx.lineTo(targetX, targetY + 5);
      ctx.closePath();
      ctx.fillStyle = '#10121c';
      ctx.fill();
    }
  };

  // Pre-configured styled canvas HUD drawings
  const drawWarehouseBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Vibrant Palette warehouse core layout colors
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

    // Left and Right robust warehouse walls (8 virtual pixels each)
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, 0, 8, h);
    ctx.fillRect(w - 8, 0, 8, h);

    // Dark layout border column stripes
    ctx.fillStyle = '#10121c';
    ctx.fillRect(8, 0, 2, h);
    ctx.fillRect(w - 10, 0, 2, h);

    // Industrial hanging yellow pendant lights
    drawHangingLamp(ctx, w / 4, 30);
    drawHangingLamp(ctx, (w * 3) / 4, 30);
  };

  const drawHangingLamp = (ctx: CanvasRenderingContext2D, x: number, len: number) => {
    ctx.strokeStyle = '#566c86';
    ctx.lineWidth = 1;
    // Chain length
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

  const drawWarehouseFloor = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const floorY = h - 32;
    // Heavy support background wall beam
    ctx.fillStyle = '#333c57'; // Vibrant Theme floor plate
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

  const drawLevelGoalPoster = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Center goals board aligned beautifully with Vibrant Palette container aesthetic
    const bw = 240;
    const bh = 54;
    const bx = (w - bw) / 2;
    const by = 42;

    ctx.fillStyle = '#333c57';
    ctx.fillRect(bx, by, bw, bh);

    // Thick border outline
    ctx.strokeStyle = '#10121c';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx, by, bw, bh);

    // Goal Checklist headers with indicators
    ctx.textAlign = 'left';
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#ffcd75'; // Gold Yellow title header
    ctx.fillText("FACILITY OBJECTIVES - SECTOR 7-B", bx + 10, by + 14);

    // Goal 1: Find King's Crown
    const crownCompleted = engine.stats.crownsFound >= 1;
    ctx.fillStyle = crownCompleted ? '#73ef7d' : '#f4f4f4'; // Vibrant green vs soft white
    ctx.fillText(`${crownCompleted ? '[V]' : '[ ]'} Find the King Crown 👑`, bx + 15, by + 28);
    ctx.font = '5.5px monospace';
    ctx.fillStyle = '#9fadbc';
    ctx.fillText("(Smash Present for Key 🔑 -> Unlock Right Crown Crate)", bx + 152, by + 28);

    // Goal 2: Stack Present stack height
    const stackCompleted = engine.stats.cratesStacked >= 3;
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = stackCompleted ? '#73ef7d' : '#f4f4f4';
    ctx.fillText(`${stackCompleted ? '[V]' : '[ ]'} Stack 3 Present Boxes vertically 🎁`, bx + 15, by + 42);
    ctx.font = '5.5px monospace';
    ctx.fillStyle = '#9fadbc';
    ctx.fillText(`(Current Stack: ${engine.stats.cratesStacked}/3)`, bx + 194, by + 42);

    // Success overlay flash
    if (engine.isGoalCompleted) {
      ctx.fillStyle = 'rgba(115, 239, 125, 0.1)';
      ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
    }
  };

  // Main UI Canvas HeadHUD overlays
  const drawGameHud = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scale: number,
    buttons: Array<{ type: BoxType; x: number; y: number; w: number; h: number; icon: string; label: string }>
  ) => {
    // ----------------- TOP LEFT HUD: Sound indicator -----------------
    ctx.fillStyle = soundEnabled ? '#333c57' : '#a24b31';
    ctx.strokeStyle = '#10121c';
    ctx.lineWidth = 1.5;
    ctx.fillRect(12, 10, 58, 16);
    ctx.strokeRect(12, 10, 58, 16);

    ctx.fillStyle = '#f4f4f4';
    ctx.textAlign = 'center';
    ctx.font = '6.5px monospace';
    ctx.fillText(soundEnabled ? '🔊 SOUND' : '🔇 MUTED', 41, 21);

    // ----------------- CHALLENGE COMPLETION CHANNELS -----------------
    if (engine.isGoalCompleted) {
      ctx.fillStyle = 'rgba(26, 28, 44, 0.9)'; // #1a1c2c with transparency
      ctx.fillRect(0, 0, w, h);

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#ffcd75'; // gold-yellow
      ctx.textAlign = 'center';
      ctx.fillText("★ CHALLENGE COMPLETED ★", w / 2, h / 2 - 25);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#f4f4f4';
      ctx.fillText("You successfully extracted the Crown & Stacked Boxes!", w / 2, h / 2 - 5);

      ctx.fillStyle = '#ef7d57'; // vibrant orange Peach
      ctx.strokeStyle = '#10121c';
      ctx.fillRect(w / 2 - 60, h / 2 + 15, 120, 22);
      ctx.strokeRect(w / 2 - 60, h / 2 + 15, 120, 22);

      ctx.fillStyle = '#10121c';
      ctx.font = 'bold 8px monospace';
      ctx.fillText("PRESS R TO RESET SANDBOX", w / 2, h / 2 + 29);
      return;
    }

    // ----------------- TOP RIGHT HUD: Reset & Statistics -----------
    const resetX = w - 65;
    ctx.fillStyle = '#ef7d57'; // vibrant peach reset
    ctx.strokeStyle = '#10121c';
    ctx.fillRect(resetX, 10, 55, 16);
    ctx.strokeRect(resetX, 10, 55, 16);
    ctx.fillStyle = '#10121c';
    ctx.font = 'bold 6.5px monospace';
    ctx.fillText("🔄 RESET (R)", resetX + 27, 21);

    // Loot indicators & count displays
    const statsX = w - 74;
    ctx.fillStyle = '#333c57';
    ctx.strokeStyle = '#10121c';
    ctx.lineWidth = 1.5;
    ctx.fillRect(statsX - 60, 32, 130, 11);
    ctx.strokeRect(statsX - 60, 32, 130, 11);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f4f4f4';
    ctx.font = '6px monospace';
    ctx.fillText(`💎 GEMS: ${engine.stats.gemsCollected}`, statsX - 54, 40);
    ctx.fillText(`🎁 OPENED: ${engine.stats.cratesOpened}`, statsX - 4, 40);
    ctx.fillText(`💥 BOOMS: ${engine.stats.explosionsTriggered}`, statsX + 46, 40);

    // ----------------- BOTTOM BAR HUD: Spawner panel -----------------
    // Panel base
    const spawnHUDw = 175;
    const spawnHUDh = 32;
    const spawnHUDx = 8;
    const spawnHUDy = h - 35;

    ctx.fillStyle = '#333c57';
    ctx.strokeStyle = '#10121c';
    ctx.fillRect(spawnHUDx, spawnHUDy, spawnHUDw, spawnHUDh);
    ctx.strokeRect(spawnHUDx, spawnHUDy, spawnHUDw, spawnHUDh);

    // Bottom spawner title
    ctx.textAlign = 'left';
    ctx.font = 'bold 6px monospace';
    ctx.fillStyle = '#ffcd75'; // Soft warm orange highlight
    ctx.fillText("SPAWNER (SELECT KEY 1-5 OR CLICK / SHIFT+CLICK CANVAS TO SPAWN):", spawnHUDx + 6, spawnHUDy + 8);

    // Spawner Buttons drawing
    for (const btn of buttons) {
      const isSelected = engine.selectedCrateType === btn.type;
      
      // Selected highlight plate behind
      ctx.fillStyle = isSelected ? '#ffcd75' : '#1a1c2c'; // gold yellow indicator vs slate navy base
      ctx.strokeStyle = '#10121c';
      ctx.lineWidth = isSelected ? 1.8 : 1;
      
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

      // Icon preview scaled down within button
      sprites.drawSprite(ctx, btn.icon, btn.x + 6, btn.y + 2, 13, 13);

      // Mini hotkey label
      ctx.fillStyle = isSelected ? '#10121c' : '#f4f4f4';
      ctx.font = 'bold 5.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(btn.type.substring(0, 3).toUpperCase(), btn.x + btn.w / 2, btn.y + 18);
    }

    // Spawner click placing indicator
    const spawnerPlaceHUDX = spawnHUDx + spawnHUDw + 4;
    ctx.fillStyle = '#333c57';
    ctx.strokeStyle = '#10121c';
    ctx.fillRect(spawnerPlaceHUDX, spawnHUDy, w - spawnerPlaceHUDX - 8, spawnHUDh);
    ctx.strokeRect(spawnerPlaceHUDX, spawnHUDy, w - spawnerPlaceHUDX - 8, spawnHUDh);

    ctx.textAlign = 'left';
    ctx.font = '5px monospace';
    ctx.fillStyle = '#ffcd75';
    ctx.fillText(`SELECTED CRATE: ${engine.selectedCrateType.toUpperCase()}`, spawnerPlaceHUDX + 6, spawnHUDy + 9);
    
    // Quick features details depending on type
    let featureDesc = "";
    if (engine.selectedCrateType === 'wood') featureDesc = "Medium weight. Breaks if hit hard or opened.";
    if (engine.selectedCrateType === 'metal') featureDesc = "Indestructible. Perfect heavy stacking foundation.";
    if (engine.selectedCrateType === 'present') featureDesc = "Light bouncy & elastic. Collectibles inside! 🎁";
    if (engine.selectedCrateType === 'tnt') featureDesc = "Highly dangerous! Ignites if shaken or dropped.";
    if (engine.selectedCrateType === 'hover') featureDesc = "Defies gravity! Stays locked, floats in place.";

    ctx.fillStyle = '#f4f4f4';
    ctx.fillText(featureDesc, spawnerPlaceHUDX + 6, spawnHUDy + 17);
    ctx.fillStyle = '#ef7d57'; // peach accent help prompt
    ctx.fillText("TIP: Drag boxes with MOUSE cursor to throw them!", spawnerPlaceHUDX + 6, spawnHUDy + 25);
  };

  return (
    <div id="game-container" className="relative w-full h-screen bg-[#1a1c2c] overflow-hidden flex flex-col items-center justify-center">
      {/* Visual background instructions card */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none hidden md:block">
        <div className="p-3 bg-[#333c57]/95 border-2 border-[#10121c] rounded shadow-2xl text-[#f4f4f4] font-mono text-[10px] leading-relaxed max-w-sm">
          <div className="text-[#ffcd75] font-extrabold mb-1 border-b-2 border-[#10121c] pb-1">🔧 MECHANICAL INSTRUCTIONS</div>
          <div><span className="text-[#ef7d57] font-bold">A / D / Arrow Keys</span> : Move left & right</div>
          <div><span className="text-[#ef7d57] font-bold">W / Space</span> : Jump over crates</div>
          <div><span className="text-[#73ef7d] font-bold">E / Tap</span> : Lift box / Drop box</div>
          <div><span className="text-[#ffcd75] font-bold">F</span> : Throw carry box with speed</div>
          <div><span className="text-[#ef7d57] font-bold">Q / Click</span> : Smash / Open near boxes</div>
          <div className="mt-1 text-[#9fadbc] text-[9.5px]">
            <span className="font-semibold text-[#f4f4f4]">Mouse Drag</span> : Throw, fling, and stack boxes with satisfying spring elasticity!
          </div>
        </div>
      </div>

      {/* Main active gaming canvas container */}
      <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          id="retroGameCanvas"
          className="w-full h-full cursor-pointer touch-none block"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  );
}
